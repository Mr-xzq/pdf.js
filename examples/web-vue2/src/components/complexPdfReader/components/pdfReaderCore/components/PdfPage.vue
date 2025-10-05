<template>
  <div class="pdf-page-container" ref="container">
    <!-- 页面画布 -->
    <canvas
      ref="pageCanvas"
      class="pdf-page-container__canvas"
      :style="canvasStyle"
      @click="onCanvasClick"
    ></canvas>

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
  cancelAllRenderTasks,
  renderPageToCanvasCore,
} from "../utils/pdf-utils.js";

import { AnnotationLayerBuilder } from "../utils/layers/AnnotationLayerBuilder.js";

// 引入第三方库
import { mapState, mapActions } from "vuex";

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
      pageInfo: null,
      viewport: null,

      // 样式
      canvasStyle: {},
      annotationLayerStyle: {},
      // 不同的 layer
      layers: {
        annotation: null,
      },
      // 渲染请求并发保护：仅接受最后一次请求的结果
      renderRequestId: 0,
    };
  },
  computed: {
    ...mapState("pdfReader/document", ["pdfDocument"]),
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
    ...mapActions("pdfReader/document", ["getPage"]),
    ...mapActions("pdfReader/viewer", ["goToDestination"]),
    // 渲染页面
    async renderPage() {
      const doc = this.pdfDocument;
      if (!doc) return;

      // 同步取消 Layer 渲染，防止重叠
      this.cancelLayers?.();

      // 并发保护：为本次渲染生成 token，仅接受最后一次结果
      const token = ++this.renderRequestId;

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
        const result = await renderPageToCanvasCore({
          getPage: this.getPage,
          tasks: this.renderTasks,
          pageNumber: this.pageNumber,
          canvas,
          scale: this.scale,
        });

        // 若在等待期间发起了更新的渲染请求，则丢弃本次结果
        if (token !== this.renderRequestId) {
          return;
        }

        this.pageInfo = result;
        this.viewport = result.viewport;

        // 更新样式
        this.updateStyles();

        // 初始化并渲染各 Layer
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

    // 取消进行中的 Layer 任务
    cancelLayers() {
      this.layers?.annotation?.cancel?.();
    },

    // 初始化 Layer builders
    initializeLayers() {
      // Annotation Layer
      if (
        this.annotationsEnabled &&
        !this.layers.annotation &&
        this.$refs.annotationLayer
      ) {
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
      if (!this.viewport) {
        return;
      }

      const { width, height } = this.viewport;

      // Canvas 样式 - 现在由渲染服务直接设置尺寸，这里不再干预
      this.canvasStyle = {
        display: "block",
      };

      // 注释层样式
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
    // 明确置于文本层之上，保证点击
    z-index: var(--z-annot);
  }
}
</style>
