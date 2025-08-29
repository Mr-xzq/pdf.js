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

      <!-- 阶段2：主内容区（侧边栏 + 核心查看器） -->
      <div class="pdf-viewer__content">
        <!-- 侧边栏 -->
        <pdf-sidebar
          v-if="showControls"
          ref="sidebar"
          :visible="sidebarVisible"
          :default-tab="sidebarActiveTab"
          @close="onSidebarClose"
          @navigate-to-page="onNavigateToPage"
          @tab-change="onSidebarTabChange"
          class="pdf-viewer__sidebar"
        />

        <!-- 核心查看器 -->
        <div class="pdf-viewer__main">
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
            ref="viewerCore"
          />
        </div>
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
import PdfSidebar from './ui/PdfSidebar.vue';
import {
  installPdfReaderModule,
  mapDocumentState,
  mapViewerState,
  mapSidebarState,
  mapDocumentGetters,
  mapViewerGetters,
  mapSidebarGetters,
  mapDocumentActions,
  mapViewerActions,
  mapSidebarActions
} from '../store/index.js';

export default {
  name: 'PdfViewer',

  components: {
    PdfViewerCore,
    PdfTopToolbar,
    PdfBottomToolbar,
    PdfSidebar
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
    // 映射Vuex状态 - 包含侧边栏状态
    ...mapDocumentState(['pdfDocument', 'loading', 'error']),
    ...mapViewerState(['currentPage', 'scale']),
    ...mapSidebarState(['visible', 'activeTab']),

    // 映射Vuex getters
    ...mapDocumentGetters(['isDocumentLoaded', 'totalPages']),
    ...mapViewerGetters(['navigationState', 'zoomState']),
    ...mapSidebarGetters(['enabledTabs', 'currentTab']),

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
    },

    // 侧边栏相关计算属性
    sidebarVisible() {
      return this.visible;
    },

    sidebarActiveTab() {
      return this.activeTab;
    }
  },

  mounted() {
    // 确保 Vuex store 中有 PDF 阅读器模块
    if (this.$store) {
      installPdfReaderModule(this.$store);

      // 初始化侧边栏移动端状态
      this.$store.dispatch('pdfReader/sidebar/updateMobileState');
    }

    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize);
  },

  beforeDestroy() {
    // 清理事件监听器
    window.removeEventListener('resize', this.handleResize);
  },

  methods: {
    // 映射Vuex actions - 包含侧边栏控制
    ...mapDocumentActions(['loadDocument', 'setDocumentLoaded', 'setDocumentError']),
    ...mapViewerActions(['goToPage', 'nextPage', 'prevPage', 'setScale', 'zoomIn', 'zoomOut', 'setScaleMode']),
    ...mapSidebarActions(['toggle', 'show', 'hide', 'switchToTab']),

    // 事件处理 - 更新为使用Vuex actions
    onDocumentLoaded(event) {
      // 通过Vuex action更新状态
      this.setDocumentLoaded(event);

      console.log('PDF 文档加载完成:', event);
      console.log('文档总页数:', event.document?.numPages || event.info?.numPages);
      console.log('当前导航状态:', this.navigationState);

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
    },

    // 侧边栏控制方法 - 提供给外部调用
    /**
     * 切换侧边栏显示状态
     * @param {string} tabKey - 可选，指定要切换到的标签页
     */
    toggleSidebar(tabKey = null) {
      console.log('PdfViewer.toggleSidebar 被调用');

      // 直接使用 store dispatch，避免映射问题
      if (this.$store) {
        return this.$store.dispatch('pdfReader/sidebar/toggle', tabKey);
      } else {
        console.error('Vuex store 未找到');
      }
    },

    /**
     * 显示侧边栏
     * @param {string} tabKey - 可选，指定要显示的标签页
     */
    showSidebar(tabKey = null) {
      if (this.$store) {
        return this.$store.dispatch('pdfReader/sidebar/show', tabKey);
      }
    },

    /**
     * 隐藏侧边栏
     */
    hideSidebar() {
      if (this.$store) {
        return this.$store.dispatch('pdfReader/sidebar/hide');
      }
    },

    /**
     * 切换到指定标签页
     * @param {string} tabKey - 标签页键名
     */
    switchSidebarTab(tabKey) {
      if (this.$store) {
        return this.$store.dispatch('pdfReader/sidebar/switchToTab', tabKey);
      }
    },

    // 侧边栏事件处理方法
    /**
     * 处理侧边栏关闭事件
     */
    onSidebarClose() {
      if (this.$store) {
        this.$store.dispatch('pdfReader/sidebar/hide');
      }
    },

    /**
     * 处理侧边栏标签页变化事件
     */
    onSidebarTabChange(tabKey) {
      if (this.$store) {
        this.$store.dispatch('pdfReader/sidebar/switchToTab', tabKey);
      }
    },

    /**
     * 处理页面导航事件（从侧边栏触发）
     */
    onNavigateToPage(pageNumber) {
      this.goToPage(pageNumber);
    },

    /**
     * 处理窗口大小变化
     */
    handleResize() {
      if (this.$store) {
        this.$store.dispatch('pdfReader/sidebar/updateMobileState');
      }
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
    display: flex;
    flex-direction: row;
  }

  &__sidebar {
    flex: 0 0 auto;
    z-index: @pdf-z-index-sidebar;
  }

  &__main {
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
