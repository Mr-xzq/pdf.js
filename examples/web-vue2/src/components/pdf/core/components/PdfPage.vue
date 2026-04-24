<template>
  <div class="pdf-page-container" ref="container">
    <!-- 页面画布 -->
    <canvas ref="pageCanvas" class="pdf-page-container__canvas" :style="canvasStyle" @click="onCanvasClick"></canvas>

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
import { cancelAllRenderTasks, renderPageToCanvas } from "@/components/pdf/core/pdf-utils.js";
import { ERROR_TYPES } from "@/components/pdf/core/pdf-config.js";
import { AnnotationLayerBuilder } from "@/components/pdf/core/utils/layers/AnnotationLayerBuilder.js";

// 引入第三方库
import { mapState, mapActions, mapMutations } from "vuex";

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

    annotationsEnabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      // 渲染任务表
      renderTasks: {},

      // 渲染状态
      rendering: false,
      rendered: false,

      // 页面信息
      viewport: null,

      // 样式
      canvasStyle: {},
      annotationLayerStyle: {},
      // 不同的 layer
      layers: {
        annotation: null,
      },
    };
  },
  computed: {
    ...mapState("pdfReaderCore", ["pdfDocument"]),
  },
  mounted() {
    this.renderPage();
  },
  beforeDestroy() {
    cancelAllRenderTasks({ tasks: this.renderTasks });
    this.destroyLayers();
    this.cleanup();
  },
  watch: {
    pageNumber: "onPageNumberChange",
    scale: "onScaleChange",
  },
  methods: {
    ...mapMutations("pdfReaderCore", ["SET_ERROR"]),
    ...mapActions("pdfReaderCore", ["getPage", "goToDestination"]),
    // 渲染页面
    async renderPage() {
      const doc = this.pdfDocument;
      if (!doc) return;

      // 在单 canvas 架构下，必须先取消所有正在进行的渲染任务，目前的 renderPageToCanvas 只会取消当前页码的渲染任务
      // 避免快速翻页时多个 page.render() 同时竞争同一个 canvas

      // 你遇到的问题本质上是：单 canvas + 快速翻页 → 旧 renderTask 没有被 cancel → 同一画布并发渲染 → 随机残影 / 倒转 / 背景丢失 --> 渲染异常。
      // 现有的 renderPageToCanvas 设计是“按页码取消”，更适合“多页多 canvas”的场景（比如 mobile simple），但在桌面“单页复用 canvas”模式下需要在组件层统一取消所有旧任务。
      cancelAllRenderTasks({ tasks: this.renderTasks });

      // 同步取消 Layer 渲染，防止重叠
      this.cancelLayers?.();

      try {
        this.rendering = true;
        this.rendered = false;
        // 渲染开始前隐藏画布，避免看到空白底色
        this.canvasStyle = { display: "block", opacity: 0 };

        const canvas = this.$refs.pageCanvas;
        if (!canvas) {
          throw new Error("Canvas 元素未找到");
        }

        // 渲染页面到 Canvas
        const result = await renderPageToCanvas({
          getPage: this.getPage,
          tasks: this.renderTasks,
          pageNumber: this.pageNumber,
          canvas,
          scale: this.scale,
        });

        // pdf 渲染视口，尺寸信息
        this.viewport = result.viewport;

        // 更新样式
        this.updateStyles();

        // 初始化并渲染不同的 Layer
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

        console.log(`页面 ${this.pageNumber} 渲染完成`);
      } catch (error) {
        // 忽略因取消导致的异常
        if (error?.code === "RENDER_CANCELLED") {
          return;
        }

        this.rendering = false;
        // 渲染完成与异常都同步容器尺寸，避免缩小时容器高于画布
        this.$nextTick(() => this.syncContainerSize());

        this.SET_ERROR({
          type: ERROR_TYPES.RENDER_ERROR,
          message: error?.message || String(error),
        });
      }
    },

    // 取消进行中的 Layer 任务
    cancelLayers() {
      this.layers?.annotation?.cancel?.();
    },

    // 初始化 Layer builders
    initializeLayers() {
      // Annotation Layer
      if (this.annotationsEnabled && !this.layers.annotation) {
        this.layers.annotation = new AnnotationLayerBuilder({
          container: this.$refs.annotationLayer,
          getPage: this.getPage,
          goToDestination: this.goToDestination,
        });
        this.layers.annotation.setup({
          pageNumber: this.pageNumber,
          viewport: this.viewport,
        });
      }
    },

    // 渲染所有启用的 Layer
    async renderLayers() {
      if (this.layers.annotation) {
        this.layers.annotation.setup({
          pageNumber: this.pageNumber,
          viewport: this.viewport,
        });
        await this.layers.annotation.render();
      }
    },

    // 销毁所有 Layer
    destroyLayers() {
      if (this.layers.annotation) {
        this.layers.annotation.destroy?.();
        this.layers.annotation = null;
      }
    },

    // 在渲染完成后，根据 viewport 尺寸设置容器高度，防止缩小时容器比 canvas 高
    syncContainerSize() {
      const container = this.$refs.container;
      const canvas = this.$refs.pageCanvas;
      if (!container || !canvas || !this.viewport) return;
      const { width, height } = this.viewport;
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
    },

    updateStyles() {
      if (!this.viewport) return;
      const { width, height } = this.viewport;
      this.canvasStyle = { display: "block" };
      this.annotationLayerStyle = {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: "100%",
        maxHeight: "100%",
      };
    },

    // 清理资源
    cleanup() {
      // 清理 Canvas
      const canvas = this.$refs.pageCanvas;
      if (canvas) {
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    },

    // 处理页码变化
    async onPageNumberChange() {
      await this.renderPage();
    },

    // 处理缩放变化
    async onScaleChange() {
      await this.renderPage();
    },

    // 处理 Canvas 点击
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
  position: relative;
  display: inline-block;
  background: transparent;
  box-shadow: none;
  margin: 0;

  &__canvas {
    display: block;
    border: none;

    // 避免默认白底
    background-color: transparent !important;

    // 确保 canvas 不会被意外缩放
    max-width: none;
    max-height: none;
  }

  &__annotation-layer {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    pointer-events: auto;
    // 明确置于文本层之上，确保能点击
    z-index: var(--z-annot);
  }
}
</style>
