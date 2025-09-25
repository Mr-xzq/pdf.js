<template>
  <div
    class="pdf-page-container"
    :class="{ 'pdf-page-container--loading': rendering }"
    ref="container"
  >
    <!-- 页面画布 -->
    <canvas
      ref="pageCanvas"
      class="pdf-page-container__canvas"
      :style="canvasStyle"
      @click="onCanvasClick"
    ></canvas>

    <!-- 文本层（用于文本选择和搜索） -->
    <div
      v-if="textLayerEnabled"
      ref="textLayer"
      class="pdf-page-container__text-layer"
      :style="textLayerStyle"
    ></div>

    <!-- 注释层 -->
    <div
      v-if="annotationsEnabled"
      ref="annotationLayer"
      class="pdf-page-container__annotation-layer"
      :style="annotationLayerStyle"
    ></div>
  </div>
</template>

<script>
import {
  cancelRenderTask,
  cancelAllRenderTasks,
  renderPageToCanvasCore,
} from "../utils/pdf-utils.js";
import { TextLayerBuilder } from "../utils/layers/TextLayerBuilder.js";
import { AnnotationLayerBuilder } from "../utils/layers/AnnotationLayerBuilder.js";
import {
  createLayer,
  updateAndRenderLayer,
  cancelLayer,
  destroyLayer,
} from "../utils/layers/lifecycle.js";

export default {
  name: "PdfPage",

  props: {
    pageNumber: {
      type: Number,
      required: true,
    },
    scale: {
      type: Number,
      default: 1.0,
    },

    textLayerEnabled: {
      type: Boolean,
      default: true,
    },
    annotationsEnabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      // 渲染任务表（函数式）
      renderTasks: {},

      // 渲染状态
      rendering: false,
      rendered: false,

      // 页面信息
      pageInfo: null,
      viewport: null,

      // 样式
      canvasStyle: {},
      textLayerStyle: {},
      annotationLayerStyle: {},

      // Layer builders 注册表
      layers: {
        text: null,
        annotation: null,
      },
      // 渲染请求并发保护：仅接受最后一次请求的结果
      renderRequestId: 0,
    };
  },

  mounted() {
    this.renderPage();
  },

  beforeDestroy() {
    try {
      cancelAllRenderTasks(this.renderTasks);
    } catch (_) {}
    this.destroyLayers();
    this.cleanup();
  },

  watch: {
    pageNumber: {
      handler: "onPageNumberChange",
      immediate: false,
    },
    scale: {
      handler: "onScaleChange",
      immediate: false,
    },
  },

  methods: {
    // 统一封装常用 refs（用方法，避免 computed 缓存 $refs 带来的不可预期）
    container() {
      return this.$refs.container || null;
    },
    pageCanvas() {
      return this.$refs.pageCanvas || null;
    },
    // 本地服务：通过 Vuex 获取页与导航
    getPdfServices() {
      return {
        getPage: n => this.$store.dispatch("pdfReader/document/getPage", n),
        goToDestination: dest =>
          this.$store.dispatch("pdfReader/viewer/goToDestination", dest),
      };
    },
    textLayer() {
      return this.$refs.textLayer || null;
    },
    annotationLayer() {
      return this.$refs.annotationLayer || null;
    },

    /**
     * 渲染页面
     */
    async renderPage() {
      const doc = this.$store?.state?.pdfReader?.document?.pdfDocument;
      if (!doc) return;
      // 若存在在途渲染，先取消之，避免重叠
      try {
        cancelRenderTask(this.renderTasks, this.pageNumber);
      } catch (_) {}
      // 同步取消 Layer 渲染，防止重叠
      this.cancelLayers?.();

      // 并发保护：为本次渲染生成 token，仅接受最后一次结果
      const token = ++this.renderRequestId;

      try {
        this.rendering = true;
        this.rendered = false;
        // 渲染开始前隐藏画布，避免看到空白底色
        this.canvasStyle = { display: "block", opacity: 0 };

        const canvas = this.pageCanvas();
        if (!canvas) {
          throw new Error("Canvas 元素未找到");
        }

        // 渲染页面到 Canvas
        const result = await renderPageToCanvasCore(
          this.getPdfServices(),
          this.renderTasks,
          this.pageNumber,
          canvas,
          { scale: this.scale }
        );
        // 若在等待期间发起了更新的渲染请求，则丢弃本次结果
        if (token !== this.renderRequestId) {
          return;
        }

        this.pageInfo = result;
        this.viewport = result.viewport;

        // 更新样式
        this.updateStyles();

        // 初始化并渲染各 Layer（Builder 模式）
        this.initializeLayers();
        await this.renderLayers();

        this.rendering = false;
        this.rendered = true;
        // 首帧渲染完成后淡入画布
        this.canvasStyle = {
          display: "block",
          opacity: 1,
          transition: "opacity .15s ease",
        };

        this.$emit("page-rendered", {
          pageNumber: this.pageNumber,
          scale: this.scale,
          viewport: this.viewport,
        });

        console.log(`页面 ${this.pageNumber} 渲染完成`);
      } catch (error) {
        // 忽略因取消导致的异常
        if (error && error.code === "RENDER_CANCELLED") {
          return;
        }
        // 若已有更新的渲染请求，不处理旧结果
        if (token !== this.renderRequestId) {
          return;
        }
        this.rendering = false;
        // 渲染完成与异常都同步容器尺寸，避免缩小时容器高于画布
        this.$nextTick(() => this.syncContainerSize());

        console.error(`页面 ${this.pageNumber} 渲染失败:`, error);
        this.$emit("render-error", {
          pageNumber: this.pageNumber,
          error: error.message,
        });
      }
    },

    /**
     * 取消进行中的 Layer 任务
     */
    cancelLayers() {
      cancelLayer(this.layers?.text);
      cancelLayer(this.layers?.annotation);
    },

    /**
     * 初始化 Layer builders
     */
    initializeLayers() {
      const servicesGetter = () => {
        return (
          this.$store?.getters?.["pdfReader/document/services"] || {
            eventBus: null,
            linkService: null,
          }
        );
      };

      // Text Layer
      if (this.textLayerEnabled && !this.layers.text && this.textLayer()) {
        this.layers.text = createLayer(TextLayerBuilder, {
          container: this.textLayer(),
          pdfServices: this.getPdfServices(),
          getServices: servicesGetter,
          setup: { pageNumber: this.pageNumber, viewport: this.viewport },
        });
      }

      // Annotation Layer
      if (
        this.annotationsEnabled &&
        !this.layers.annotation &&
        this.annotationLayer()
      ) {
        this.layers.annotation = createLayer(AnnotationLayerBuilder, {
          container: this.annotationLayer(),
          pdfServices: this.getPdfServices(),
          getServices: servicesGetter,
          setup: { pageNumber: this.pageNumber, viewport: this.viewport },
        });
      }
    },

    /**
     * 渲染所有启用的 Layer
     */
    async renderLayers() {
      const tasks = [];
      if (this.layers.text) {
        tasks.push(
          updateAndRenderLayer(this.layers.text, {
            pageNumber: this.pageNumber,
            viewport: this.viewport,
          })
        );
      }
      if (this.layers.annotation) {
        tasks.push(
          updateAndRenderLayer(this.layers.annotation, {
            pageNumber: this.pageNumber,
            viewport: this.viewport,
          })
        );
      }
      await Promise.all(tasks);
    },

    /**
     * 销毁所有 Layer
     */
    destroyLayers() {
      if (this.layers.text) {
        destroyLayer(this.layers.text);
        this.layers.text = null;
      }
      if (this.layers.annotation) {
        destroyLayer(this.layers.annotation);
        this.layers.annotation = null;
      }
    },

    /**
     * 在渲染完成后，根据 viewport 尺寸设置容器高度，防止缩小时容器比 canvas 高
     */
    syncContainerSize() {
      const container = this.container();
      const canvas = this.pageCanvas();
      if (!container || !canvas || !this.viewport) return;
      const { width, height } = this.viewport;
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
    },

    /**
     * 更新样式
     */
    updateStyles() {
      if (!this.viewport) {
        return;
      }

      const { width, height } = this.viewport;

      // Canvas 样式 - 现在由渲染服务直接设置尺寸，这里不再干预
      this.canvasStyle = {
        display: "block",
      };

      // 文本层样式
      this.textLayerStyle = {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: "100%",
        maxHeight: "100%",
      };

      // 注释层样式
      this.annotationLayerStyle = {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: "100%",
        maxHeight: "100%",
      };
    },

    /**
     * 清理资源
     */
    cleanup() {
      // 清理 Canvas
      const canvas = this.pageCanvas();
      if (canvas) {
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    },

    /**
     * 处理页码变化
     */
    async onPageNumberChange() {
      try {
        cancelRenderTask(this.renderTasks, this.pageNumber);
      } catch (_) {}
      this.cancelLayers?.();
      await this.renderPage();
    },

    /**
     * 处理缩放变化
     */
    async onScaleChange() {
      try {
        cancelRenderTask(this.renderTasks, this.pageNumber);
      } catch (_) {}
      this.cancelLayers?.();
      await this.renderPage();
    },

    /**
     * 处理 Canvas 点击
     */
    onCanvasClick(event) {
      this.$emit("canvas-click", {
        pageNumber: this.pageNumber,
        x: event.offsetX,
        y: event.offsetY,
        event,
      });
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-page-container {
  /* 清理默认视觉风格，交给外部控制 */
  position: relative;
  display: inline-block;
  background: transparent;
  box-shadow: none;
  margin: 0;

  &__canvas {
    display: block;
    border: none;
    background-color: transparent !important; // 避免默认白底

    // 移除 object-fit，让Canvas保持原始尺寸
    // object-fit: contain; // 这可能导致意外的缩放

    // 优化Canvas渲染质量
    image-rendering: auto; // 对于PDF文本内容，auto通常是最佳选择

    // 确保Canvas不会被意外缩放
    max-width: none;
    max-height: none;
  }

  &__text-layer {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    opacity: 0.2;
    line-height: 1;
    z-index: var(--z-text);

    // 优化文本渲染
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: "liga" 1, "kern" 1;
  }

  &__annotation-layer {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    pointer-events: auto;
    z-index: var(--z-annot); // 明确置于文本层之上，保证点击
  }
}
</style>
