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

    <!-- 页面加载状态 -->
    <div v-if="rendering" class="pdf-page-container__loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在渲染页面...</div>
    </div>
  </div>
</template>

<script>
import { PageRenderService } from "../core/pdf-services.js";
import { TextLayerBuilder } from "../core/layers/TextLayerBuilder";
import { AnnotationLayerBuilder } from "../core/layers/AnnotationLayerBuilder";

export default {
  name: "PdfPageContainer",

  props: {
    pageNumber: {
      type: Number,
      required: true,
    },
    scale: {
      type: Number,
      default: 1.0,
    },
    pdfServices: {
      type: Object,
      required: true,
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
      // 渲染服务
      renderService: null,

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
    };
  },

  mounted() {
    this.initializeRenderService();
    this.renderPage();
  },

  beforeDestroy() {
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
    /**
     * 初始化渲染服务
     */
    initializeRenderService() {
      this.renderService = new PageRenderService(this.pdfServices);
    },

    /**
     * 渲染页面
     */
    async renderPage() {
      if (!this.pdfServices || !this.renderService || this.rendering) {
        return;
      }

      try {
        // 取消上一次渲染中的 Layer 任务，防止快速切换时重叠
        this.cancelLayers?.();
        this.rendering = true;
        this.rendered = false;

        const canvas = this.$refs.pageCanvas;
        if (!canvas) {
          throw new Error("Canvas 元素未找到");
        }

        // 渲染页面到 Canvas
        const result = await this.renderService.renderPageToCanvas(
          this.pageNumber,
          canvas,
          {
            scale: this.scale,
          }
        );

        this.pageInfo = result;
        this.viewport = result.viewport;

        // 更新样式
        this.updateStyles();

        // 初始化并渲染各 Layer（Builder 模式）
        this.initializeLayers();
        await this.renderLayers();

        this.rendering = false;
        this.rendered = true;

        this.$emit("page-rendered", {
          pageNumber: this.pageNumber,
          scale: this.scale,
          viewport: this.viewport,
        });

        console.log(`页面 ${this.pageNumber} 渲染完成`);
      } catch (error) {
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
      if (this.layers?.text) this.layers.text.cancel();
      if (this.layers?.annotation) this.layers.annotation.cancel();
    },

    /**
     * 初始化 Layer builders
     */
    initializeLayers() {
      const servicesGetter = () => this.pdfServices.getApplicationServices?.();

      // Text Layer
      if (this.textLayerEnabled && !this.layers.text && this.$refs.textLayer) {
        this.layers.text = new TextLayerBuilder({
          container: this.$refs.textLayer,
          pdfServices: this.pdfServices,
          getServices: servicesGetter,
        });
        this.layers.text.setup({
          pageNumber: this.pageNumber,
          viewport: this.viewport,
        });
      }

      // Annotation Layer
      if (
        this.annotationsEnabled &&
        !this.layers.annotation &&
        this.$refs.annotationLayer
      ) {
        this.layers.annotation = new AnnotationLayerBuilder({
          container: this.$refs.annotationLayer,
          pdfServices: this.pdfServices,
          getServices: servicesGetter,
        });
        this.layers.annotation.setup({
          pageNumber: this.pageNumber,
          viewport: this.viewport,
        });
      }
    },

    /**
     * 渲染所有启用的 Layer
     */
    async renderLayers() {
      const tasks = [];
      if (this.layers.text) {
        this.layers.text.cancelled = false;
        this.layers.text.pageNumber = this.pageNumber;
        this.layers.text.update({ viewport: this.viewport });
        tasks.push(this.layers.text.render());
      }
      if (this.layers.annotation) {
        this.layers.annotation.cancelled = false;
        this.layers.annotation.pageNumber = this.pageNumber;
        this.layers.annotation.update({ viewport: this.viewport });
        tasks.push(this.layers.annotation.render());
      }
      await Promise.all(tasks);
    },

    /**
     * 销毁所有 Layer
     */
    destroyLayers() {
      if (this.layers.text) {
        this.layers.text.destroy();
        this.layers.text = null;
      }
      if (this.layers.annotation) {
        this.layers.annotation.destroy();
        this.layers.annotation = null;
      }
    },

    /**
     * 在渲染完成后，根据 viewport 尺寸设置容器高度，防止缩小时容器比 canvas 高
     */
    syncContainerSize() {
      const container = this.$refs.container;
      const canvas = this.$refs.pageCanvas;
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
      if (this.renderService) {
        this.renderService.clearCache();
      }

      // 清理 Canvas
      const canvas = this.$refs.pageCanvas;
      if (canvas) {
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    },

    /**
     * 处理页码变化
     */
    async onPageNumberChange() {
      await this.renderPage();
    },

    /**
     * 处理缩放变化
     */
    async onScaleChange() {
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
  position: relative;
  display: inline-block;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 8px;

  &__canvas {
    display: block;
    border: 1px solid #e8e8e8;

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
  }

  &__loading {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #1890ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }

    .loading-text {
      font-size: 14px;
      color: #666;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
