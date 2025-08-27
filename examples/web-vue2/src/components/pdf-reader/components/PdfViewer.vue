<template>
  <div class="pdf-viewer">
    <div class="pdf-viewer__container">
      <!-- 阶段3：顶部工具栏 -->
      <pdf-top-toolbar
        v-if="showControls"
        :document-loaded="isDocumentLoaded"
        :current-page="currentPage"
        :total-pages="totalPages"
        :search-active="searchActive"
        @search-toggle="onSearchToggle"
        class="pdf-viewer__top-toolbar"
      />

      <!-- 阶段2：核心查看器 -->
      <div class="pdf-viewer__content">
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
      </div>

      <!-- 阶段3：底部工具栏 -->
      <pdf-bottom-toolbar
        v-if="showControls && isDocumentLoaded"
        :current-page="currentPage"
        :total-pages="totalPages"
        :scale="currentScale"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        :can-zoom-in="canZoomIn"
        :can-zoom-out="canZoomOut"
        @prev-page="onPrevPage"
        @next-page="onNextPage"
        @go-to-page="onGoToPage"
        @zoom-in="onZoomIn"
        @zoom-out="onZoomOut"
        @set-scale="onSetScale"
        @set-scale-mode="onSetScaleMode"
        class="pdf-viewer__bottom-toolbar"
      />
    </div>
  </div>
</template>

<script>
import PdfViewerCore from './PdfViewerCore.vue';
import PdfTopToolbar from './ui/PdfTopToolbar.vue';
import PdfBottomToolbar from './ui/PdfBottomToolbar.vue';
import {
  installPdfReaderModule,
  mapDocumentState,
  mapViewerState,
  mapDocumentGetters,
  mapViewerGetters,
  mapDocumentActions,
  mapViewerActions
} from '../store/index.js';

export default {
  name: 'PdfViewer',

  components: {
    PdfViewerCore,
    PdfTopToolbar,
    PdfBottomToolbar
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
      // UI状态下沉到组件本地
      searchActive: false
    };
  },

  computed: {
    // 映射Vuex状态 - 只保留真正需要全局共享的状态
    ...mapDocumentState(['pdfDocument', 'loading', 'error']),
    ...mapViewerState(['currentPage', 'scale']),

    // 映射Vuex getters
    ...mapDocumentGetters(['isDocumentLoaded', 'totalPages']),
    ...mapViewerGetters(['navigationState', 'zoomState']),

    // 为了兼容现有代码，提供别名
    currentScale() {
      return this.scale;
    },

    // 导航状态 - 从Vuex getters获取
    canGoPrev() {
      return this.navigationState.canGoPrev;
    },

    canGoNext() {
      return this.navigationState.canGoNext;
    },

    // 缩放状态 - 从Vuex getters获取
    scalePercent() {
      return this.zoomState.scalePercent;
    },

    canZoomIn() {
      return this.zoomState.canZoomIn;
    },

    canZoomOut() {
      return this.zoomState.canZoomOut;
    }
  },

  mounted() {
    // 确保 Vuex store 中有 PDF 阅读器模块
    if (this.$store) {
      installPdfReaderModule(this.$store);
    }
  },

  methods: {
    // 映射Vuex actions - 只保留核心状态管理
    ...mapDocumentActions(['loadDocument', 'setDocumentLoaded', 'setDocumentError']),
    ...mapViewerActions(['goToPage', 'nextPage', 'prevPage', 'setScale', 'zoomIn', 'zoomOut', 'setScaleMode']),

    // 事件处理 - 更新为使用Vuex actions
    onDocumentLoaded(event) {
      // 通过Vuex action更新状态
      this.setDocumentLoaded(event);

      console.log('PDF 文档加载完成:', event);
      this.$emit('document-loaded', event);
    },

    onDocumentError(event) {
      // 通过Vuex action更新错误状态
      this.setDocumentError(event);

      console.error('PDF 文档加载错误:', event);
      this.$emit('document-error', event);
    },

    onLoadProgress(event) {
      this.$emit('load-progress', event);
    },

    onPageChanged(event) {
      // 只更新Vuex状态，不要再次调用goToPage避免循环
      this.$store.commit('pdfReader/viewer/SET_CURRENT_PAGE', event.pageNumber);
      this.$emit('page-changed', event);
    },

    onScaleChanged(event) {
      // 通过Vuex action更新缩放
      this.setScale(event.scale);
      this.$emit('scale-changed', event);
    },

    onPageRendered(event) {
      this.$emit('page-rendered', event);
    },

    onPasswordRequired(event) {
      // MVP阶段：简单事件传递，由使用方处理密码输入
      // 后期扩展：可在此处显示密码对话框组件
      // TODO: 集成 PdfPasswordDialog 组件（阶段6扩展功能）
      this.$emit('password-required', event);
    },

    // 搜索相关方法 - UI状态本地管理
    onSearchToggle() {
      this.searchActive = !this.searchActive;
      this.$emit('search-toggle', this.searchActive);
    },

    // 工具栏事件处理 - 直接使用映射的Vuex actions
    onPrevPage() {
      this.prevPage();
    },

    onNextPage() {
      this.nextPage();
    },

    onGoToPage(pageNumber) {
      this.goToPage(pageNumber);
    },

    onZoomIn() {
      this.zoomIn();
    },

    onZoomOut() {
      this.zoomOut();
    },

    onSetScale(scale) {
      this.setScale(scale);
    },

    onSetScaleMode(mode) {
      this.setScaleMode(mode);
    }

    // 注意：不再定义重复的方法，直接使用映射的Vuex actions
    // prevPage, nextPage, goToPage, zoomIn, zoomOut, setScale, setScaleMode
    // 这些方法已经通过 mapViewerActions 映射，避免无限递归
  }
};
</script>

<style lang="less" scoped>
// 引入样式变量
@import '../styles/variables.less';

.pdf-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: @pdf-viewer-background;

  &__container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  &__top-toolbar {
    flex: 0 0 auto;
    z-index: @pdf-z-index-toolbar;
  }

  &__content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  &__bottom-toolbar {
    flex: 0 0 auto;
    z-index: @pdf-z-index-toolbar;
  }
}

// 移动端适配
@media (max-width: @pdf-breakpoint-md) {
  .pdf-viewer {
    &__container {
      // 为移动端底部工具栏预留空间
      padding-bottom: @pdf-safe-area-bottom;
    }

    &__bottom-toolbar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      // 考虑安全区域
      padding-bottom: @pdf-safe-area-bottom;
    }

    &__content {
      // 为固定的底部工具栏预留空间
      margin-bottom: @pdf-bottom-toolbar-height-mobile;
    }
  }
}
</style>
