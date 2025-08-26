<template>
  <div class="pdf-viewer">
    <div class="pdf-viewer__container">
      <!-- 阶段2：集成核心查看器 -->
      <pdf-viewer-core
        :src="src"
        :initial-page="initialPage"
        :initial-scale="initialScale"
        :max-canvas-pixels="maxCanvasPixels"
        :text-layer-mode="textLayerMode"
        @document-loaded="onDocumentLoaded"
        @document-error="onDocumentError"
        @load-progress="onLoadProgress"
        @page-changed="onPageChanged"
        @scale-changed="onScaleChanged"
        @page-rendered="onPageRendered"
        @password-required="onPasswordRequired"
        ref="viewerCore"
      />

      <!-- 简单的导航控制（阶段2基础功能） -->
      <div v-if="showControls && isDocumentLoaded" class="pdf-viewer__controls">
        <button
          @click="prevPage"
          :disabled="!canGoPrev"
          class="control-button"
        >
          上一页
        </button>

        <span class="page-info">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          @click="nextPage"
          :disabled="!canGoNext"
          class="control-button"
        >
          下一页
        </button>

        <div class="zoom-controls">
          <button @click="zoomOut" :disabled="!canZoomOut" class="control-button">-</button>
          <span class="zoom-info">{{ scalePercent }}%</span>
          <button @click="zoomIn" :disabled="!canZoomIn" class="control-button">+</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PdfViewerCore from './viewer/PdfViewerCore.vue';
import { installPdfReaderModule } from '../store/index.js';

export default {
  name: 'PdfViewer',

  components: {
    PdfViewerCore
  },

  props: {
    src: {
      type: String,
      required: true
    },
    initialPage: {
      type: Number,
      default: 1
    },
    initialScale: {
      type: Number,
      default: 1.0
    },
    maxCanvasPixels: {
      type: Number,
      default: 0
    },
    textLayerMode: {
      type: Number,
      default: 1
    },
    showControls: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      // 本地状态
      currentPage: this.initialPage,
      totalPages: 0,
      currentScale: this.initialScale,
      isDocumentLoaded: false
    };
  },

  computed: {
    // 导航状态
    canGoPrev() {
      return this.currentPage > 1;
    },

    canGoNext() {
      return this.currentPage < this.totalPages;
    },

    // 缩放状态
    scalePercent() {
      return Math.round(this.currentScale * 100);
    },

    canZoomIn() {
      return this.currentScale < 10;
    },

    canZoomOut() {
      return this.currentScale > 0.1;
    }
  },

  mounted() {
    // 确保 Vuex store 中有 PDF 阅读器模块
    if (this.$store) {
      installPdfReaderModule(this.$store);
    }
  },

  methods: {
    // 事件处理
    onDocumentLoaded(event) {
      this.isDocumentLoaded = true;
      this.totalPages = event.numPages;
      this.currentPage = this.initialPage;
      this.currentScale = this.initialScale;

      console.log('PDF 文档加载完成:', event);
      this.$emit('document-loaded', event);
    },

    onDocumentError(event) {
      this.isDocumentLoaded = false;
      console.error('PDF 文档加载错误:', event);
      this.$emit('document-error', event);
    },

    onLoadProgress(event) {
      this.$emit('load-progress', event);
    },

    onPageChanged(event) {
      this.currentPage = event.pageNumber;
      this.$emit('page-changed', event);
    },

    onScaleChanged(event) {
      this.currentScale = event.scale;
      this.$emit('scale-changed', event);
    },

    onPageRendered(event) {
      this.$emit('page-rendered', event);
    },

    onPasswordRequired(event) {
      this.$emit('password-required', event);
    },

    // 导航方法
    prevPage() {
      if (this.$refs.viewerCore) {
        this.$refs.viewerCore.prevPage();
      }
    },

    nextPage() {
      if (this.$refs.viewerCore) {
        this.$refs.viewerCore.nextPage();
      }
    },

    goToPage(pageNumber) {
      if (this.$refs.viewerCore) {
        this.$refs.viewerCore.goToPage(pageNumber);
      }
    },

    // 缩放方法
    zoomIn() {
      if (this.$refs.viewerCore) {
        this.$refs.viewerCore.zoomIn();
      }
    },

    zoomOut() {
      if (this.$refs.viewerCore) {
        this.$refs.viewerCore.zoomOut();
      }
    },

    setScale(scale) {
      if (this.$refs.viewerCore) {
        this.$refs.viewerCore.setScale(scale);
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &__container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  &__controls {
    position: absolute;
    bottom: 20px; // 稍微增加距离底部的间距
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.95);
    padding: 8px 16px;
    border-radius: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(4px);
    z-index: 1000; // 增加z-index确保控制条在最上层

    .control-button {
      padding: 6px 12px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
      min-width: 60px;

      &:hover:not(:disabled) {
        background: #40a9ff;
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        background: #096dd9;
        transform: translateY(0);
      }

      &:disabled {
        background: #d9d9d9;
        color: #999;
        cursor: not-allowed;
      }
    }

    .page-info {
      font-size: 14px;
      color: #333;
      font-weight: 500;
      min-width: 60px;
      text-align: center;
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
      padding-left: 8px;
      border-left: 1px solid #e8e8e8;

      .control-button {
        width: 32px;
        height: 32px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 16px;
        font-weight: bold;
        min-width: auto;
      }

      .zoom-info {
        font-size: 12px;
        color: #666;
        min-width: 40px;
        text-align: center;
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-viewer {
    &__controls {
      bottom: 16px; // 稍微增加距离底部的间距
      left: 12px;
      right: 12px;
      transform: none;
      justify-content: space-between;
      padding: 12px 16px;

      .control-button {
        min-height: 44px;
        min-width: 44px;
        font-size: 12px;
      }

      .page-info {
        font-size: 16px;
        font-weight: 600;
      }

      .zoom-controls {
        .control-button {
          width: 40px;
          height: 40px;
          font-size: 18px;
        }

        .zoom-info {
          font-size: 14px;
          min-width: 50px;
        }
      }
    }
  }
}
</style>
