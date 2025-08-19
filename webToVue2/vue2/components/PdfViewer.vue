<template>
  <div 
    class="vue-pdf-viewer" 
    :class="viewerClasses"
  >
    <!-- 顶部工具栏 -->
    <pdf-top-toolbar 
      v-if="showToolbar && toolbarVisible" 
      @search="handleSearch"
    />
    
    <!-- PDF 视图容器 -->
    <div 
      class="viewer-container" 
      ref="viewerContainer"
      @scroll="handleScroll"
    >
      <div 
        class="pdf-viewer" 
        ref="pdfViewer"
      ></div>
    </div>
    
    <!-- 侧边栏容器 -->
    <div 
      v-show="isSidebarVisible"
      class="sidebar-container"
      :class="{ show: isSidebarVisible }"
    >
      <!-- 缩略图查看器 -->
      <pdf-thumbnail 
        v-show="isThumbsVisible" 
        ref="thumbnailViewer"
        @page-click="handleThumbnailClick"
      />
      
      <!-- 目录查看器 -->
      <pdf-outline 
        v-show="isOutlineVisible" 
        ref="outlineViewer"
        @item-click="handleOutlineClick"
      />
    </div>
    
    <!-- 底部工具栏 -->
    <pdf-bottom-toolbar 
      v-if="showToolbar && toolbarVisible"
      @prev-page="handlePrevPage"
      @next-page="handleNextPage"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @show-thumbnails="handleShowThumbnails"
      @show-outline="handleShowOutline"
    />
    
    <!-- 加载状态 -->
    <van-loading 
      v-if="isLoading" 
      class="loading-overlay"
      type="spinner"
      color="#1989fa"
    >
      <div class="loading-content">
        <div class="loading-text">正在加载PDF...</div>
        <div v-if="loadProgressPercent > 0" class="loading-progress">
          {{ loadProgressPercent }}%
        </div>
      </div>
    </van-loading>
    
    <!-- 错误提示 -->
    <van-overlay 
      v-if="error && !isLoading"
      :show="!!error"
      @click="clearError"
    >
      <div class="error-container">
        <van-icon name="warning-o" size="48" color="#ee0a24" />
        <div class="error-message">{{ errorMessage }}</div>
        <van-button 
          type="primary" 
          size="small"
          @click="handleErrorAction"
        >
          {{ errorActionText }}
        </van-button>
      </div>
    </van-overlay>
    
    <!-- 密码输入弹窗 -->
    <van-dialog
      v-model="passwordDialogVisible"
      title="请输入PDF密码"
      show-cancel-button
      @confirm="handlePasswordConfirm"
      @cancel="handlePasswordCancel"
    >
      <van-field
        v-model="password"
        type="password"
        placeholder="请输入密码"
        border
        @keyup.enter="handlePasswordConfirm"
      />
    </van-dialog>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import PdfViewerCore, { ErrorHandler } from '../utils/pdf-viewer-core.js';
import PdfTopToolbar from './PdfTopToolbar.vue';
import PdfBottomToolbar from './PdfBottomToolbar.vue';
import PdfThumbnail from './PdfThumbnail.vue';
import PdfOutline from './PdfOutline.vue';

export default {
  name: 'PdfViewer',
  
  components: {
    PdfTopToolbar,
    PdfBottomToolbar,
    PdfThumbnail,
    PdfOutline
  },
  
  props: {
    // PDF 文件路径
    src: {
      type: String,
      required: true
    },
    
    // 是否显示工具栏
    showToolbar: {
      type: Boolean,
      default: true
    },
    
    // 最大 Canvas 像素（0 表示使用 CSS 缩放）
    maxCanvasPixels: {
      type: Number,
      default: 0
    },
    
    // 文本层模式（0: 禁用, 1: 启用, 2: 增强）
    textLayerMode: {
      type: Number,
      default: 1
    },
    
    // 初始页码
    initialPage: {
      type: Number,
      default: 1
    },
    
    // 是否启用手势
    enableGestures: {
      type: Boolean,
      default: true
    },
    
    // 主题
    theme: {
      type: String,
      default: 'light',
      validator: value => ['light', 'dark'].includes(value)
    }
  },
  
  data() {
    return {
      // PDF 查看器核心实例
      pdfViewerCore: null,
      
      // 密码相关
      passwordDialogVisible: false,
      password: '',
      
      // 手势相关
      touchState: {
        initialDistance: 0,
        initialScale: 1.0,
        isGesturing: false
      }
    };
  },
  
  computed: {
    ...mapState('pdfViewer', [
      'loading', 
      'error', 
      'passwordRequired',
      'toolbarVisible'
    ]),
    
    ...mapGetters('pdfViewer', [
      'isLoading',
      'isDocumentLoaded',
      'isSidebarVisible',
      'isThumbsVisible', 
      'isOutlineVisible',
      'loadProgressPercent'
    ]),
    
    // 容器样式类
    viewerClasses() {
      return {
        'vue-pdf-viewer': true,
        'mobile-mode': this.$vant?.isMobile,
        'loading': this.isLoading,
        'has-toolbar': this.showToolbar && this.toolbarVisible,
        'has-sidebar': this.isSidebarVisible,
        [`theme-${this.theme}`]: true
      };
    },
    
    // 工具栏是否可见
    toolbarVisible() {
      return this.$store.state.pdfViewer.showToolbar;
    },
    
    // 错误消息
    errorMessage() {
      if (!this.error) return '';
      const errorInfo = ErrorHandler.handlePdfError(this.error);
      return errorInfo.userMessage;
    },
    
    // 错误操作文本
    errorActionText() {
      if (!this.error) return '确定';
      const errorInfo = ErrorHandler.handlePdfError(this.error);
      switch (errorInfo.action) {
        case 'retry': return '重试';
        case 'check_url': return '检查路径';
        case 'request_password': return '输入密码';
        default: return '确定';
      }
    }
  },
  
  watch: {
    // 监听 src 变化
    src: {
      handler(newSrc, oldSrc) {
        if (newSrc && newSrc !== oldSrc) {
          this.loadDocument();
        }
      },
      immediate: false
    },
    
    // 监听密码需求状态
    passwordRequired(required) {
      this.passwordDialogVisible = required;
    }
  },
  
  async mounted() {
    // 注册 Vuex 模块
    if (!this.$store.hasModule('pdfViewer')) {
      const pdfViewerStore = await import('../store/pdf-viewer.js');
      this.$store.registerModule('pdfViewer', pdfViewerStore.default);
    }
    
    // 初始化 PDF 查看器
    await this.initializePdfViewer();
    
    // 加载初始文档
    if (this.src) {
      await this.loadDocument();
    }
    
    // 设置初始页码
    if (this.initialPage > 1) {
      this.$store.dispatch('pdfViewer/goToPage', this.initialPage);
    }
    
    // 初始化手势
    if (this.enableGestures) {
      this.initializeGestures();
    }
  },
  
  async beforeDestroy() {
    // 清理资源
    await this.cleanup();
  },
  
  methods: {
    ...mapActions('pdfViewer', [
      'loadDocument as loadDocumentAction',
      'goToPage',
      'nextPage',
      'prevPage', 
      'zoomIn',
      'zoomOut',
      'showThumbnails',
      'showOutline',
      'clearError',
      'cleanup'
    ]),
    
    /**
     * 初始化 PDF 查看器
     */
    async initializePdfViewer() {
      try {
        this.pdfViewerCore = new PdfViewerCore({
          container: this.$refs.viewerContainer,
          maxCanvasPixels: this.maxCanvasPixels,
          textLayerMode: this.textLayerMode
        });
        
        // 监听事件
        this.setupEventListeners();
        
      } catch (error) {
        console.error('Failed to initialize PDF viewer:', error);
        this.$toast.fail('PDF 查看器初始化失败');
      }
    },
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
      if (!this.pdfViewerCore) return;
      
      const eventBus = this.pdfViewerCore.eventBus;
      
      // 页面变化事件
      eventBus.on('pagechanging', (evt) => {
        this.$store.commit('pdfViewer/SET_CURRENT_PAGE', evt.pageNumber);
        this.$emit('page-changed', {
          pageNumber: evt.pageNumber,
          previous: evt.previous
        });
      });
      
      // 缩放变化事件
      eventBus.on('scalechanging', (evt) => {
        this.$store.commit('pdfViewer/SET_SCALE', evt.scale);
        this.$emit('scale-changed', {
          scale: evt.scale,
          presetValue: evt.presetValue
        });
      });
      
      // 页面渲染完成事件
      eventBus.on('pagerendered', (evt) => {
        this.$emit('page-rendered', {
          pageNumber: evt.pageNumber,
          source: evt.source
        });
      });
    },
    
    /**
     * 加载文档
     */
    async loadDocument() {
      if (!this.src || !this.pdfViewerCore) return;
      
      try {
        await this.loadDocumentAction({
          src: this.src,
          options: {
            pdfViewerCore: this.pdfViewerCore,
            maxCanvasPixels: this.maxCanvasPixels,
            textLayerMode: this.textLayerMode
          }
        });
        
        // 初始化侧边栏组件
        this.$nextTick(() => {
          this.initializeSidebarComponents();
        });
        
        this.$emit('document-loaded', {
          numPages: this.pdfViewerCore.pagesCount,
          info: this.$store.state.pdfViewer.documentInfo
        });
        
      } catch (error) {
        console.error('Failed to load document:', error);
        this.$emit('load-error', error);
      }
    },
    
    /**
     * 初始化侧边栏组件
     */
    initializeSidebarComponents() {
      if (!this.pdfViewerCore) return;
      
      // 初始化缩略图查看器
      if (this.$refs.thumbnailViewer) {
        this.$refs.thumbnailViewer.initialize(this.pdfViewerCore);
      }
      
      // 初始化目录查看器
      if (this.$refs.outlineViewer) {
        this.$refs.outlineViewer.initialize(this.pdfViewerCore);
      }
    },
    
    /**
     * 初始化手势
     */
    initializeGestures() {
      const container = this.$refs.viewerContainer;
      if (!container) return;
      
      container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      container.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    },
    
    /**
     * 处理触摸开始
     */
    handleTouchStart(evt) {
      if (evt.touches.length === 2) {
        evt.preventDefault();
        this.touchState.initialDistance = this.getTouchDistance(evt.touches);
        this.touchState.initialScale = this.pdfViewerCore.currentScale;
        this.touchState.isGesturing = true;
      }
    },
    
    /**
     * 处理触摸移动
     */
    handleTouchMove(evt) {
      if (evt.touches.length === 2 && this.touchState.isGesturing) {
        evt.preventDefault();
        const distance = this.getTouchDistance(evt.touches);
        const scaleChange = distance / this.touchState.initialDistance;
        const newScale = this.touchState.initialScale * scaleChange;
        
        this.pdfViewerCore.currentScale = newScale;
      }
    },
    
    /**
     * 处理触摸结束
     */
    handleTouchEnd(evt) {
      if (evt.touches.length < 2) {
        this.touchState.isGesturing = false;
      }
    },
    
    /**
     * 获取两指距离
     */
    getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    },
    
    /**
     * 处理滚动事件
     */
    handleScroll(evt) {
      this.$emit('scroll', evt);
    },
    
    /**
     * 处理搜索
     */
    handleSearch(query) {
      // 搜索功能暂未实现
      this.$toast('搜索功能正在开发中...');
      this.$emit('search', query);
    },
    
    /**
     * 处理上一页
     */
    handlePrevPage() {
      this.prevPage();
    },
    
    /**
     * 处理下一页
     */
    handleNextPage() {
      this.nextPage();
    },
    
    /**
     * 处理放大
     */
    handleZoomIn() {
      this.zoomIn();
    },
    
    /**
     * 处理缩小
     */
    handleZoomOut() {
      this.zoomOut();
    },
    
    /**
     * 处理显示缩略图
     */
    handleShowThumbnails() {
      this.showThumbnails();
    },
    
    /**
     * 处理显示目录
     */
    handleShowOutline() {
      this.showOutline();
    },
    
    /**
     * 处理缩略图点击
     */
    handleThumbnailClick(pageNumber) {
      this.goToPage(pageNumber);
    },
    
    /**
     * 处理目录点击
     */
    handleOutlineClick(dest) {
      // 目录导航逻辑
      if (dest && dest.page) {
        this.goToPage(dest.page);
      }
    },
    
    /**
     * 处理错误操作
     */
    handleErrorAction() {
      if (!this.error) return;
      
      const errorInfo = ErrorHandler.handlePdfError(this.error);
      switch (errorInfo.action) {
        case 'retry':
          this.clearError();
          this.loadDocument();
          break;
        case 'request_password':
          this.passwordDialogVisible = true;
          break;
        default:
          this.clearError();
          break;
      }
    },
    
    /**
     * 处理密码确认
     */
    async handlePasswordConfirm() {
      if (!this.password.trim()) {
        this.$toast.fail('请输入密码');
        return;
      }
      
      try {
        this.passwordDialogVisible = false;
        await this.loadDocumentAction({
          src: this.src,
          options: {
            pdfViewerCore: this.pdfViewerCore,
            password: this.password
          }
        });
        this.password = '';
      } catch (error) {
        this.$toast.fail('密码错误，请重试');
        this.passwordDialogVisible = true;
      }
    },
    
    /**
     * 处理密码取消
     */
    handlePasswordCancel() {
      this.passwordDialogVisible = false;
      this.password = '';
      this.clearError();
    }
  }
};
</script>

<style lang="less">
@import '../styles/pdf-viewer.less';
</style>
