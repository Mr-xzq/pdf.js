<template>
  <div class="pdf-viewer-core" ref="viewerContainer">
    <!-- 加载进度 -->
    <pdf-loading-progress 
      v-if="loading" 
      :progress="loadProgress"
      :message="loadMessage"
    />
    
    <!-- 错误显示 -->
    <div v-else-if="error" class="pdf-viewer-core__error">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ error }}</div>
      <button @click="retry" class="error-retry">重试</button>
    </div>
    
    <!-- PDF 内容区域 -->
    <div v-else-if="documentLoaded" class="pdf-viewer-core__content">
      <pdf-page-container
        :page-number="currentPage"
        :scale="currentScale"
        :pdf-services="pdfServices"
        @page-rendered="onPageRendered"
        @render-error="onRenderError"
      />
    </div>
    
    <!-- 空状态 -->
    <div v-else class="pdf-viewer-core__empty">
      <div class="empty-icon">📄</div>
      <div class="empty-message">请选择 PDF 文件</div>
    </div>
  </div>
</template>

<script>
import { PdfServices, NavigationService } from '../../core/pdf-services.js';
import PdfPageContainer from './PdfPageContainer.vue';
import PdfLoadingProgress from './PdfLoadingProgress.vue';

export default {
  name: 'PdfViewerCore',
  
  components: {
    PdfPageContainer,
    PdfLoadingProgress
  },
  
  props: {
    src: {
      type: String,
      default: ''
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
    }
  },
  
  data() {
    return {
      // 服务实例
      pdfServices: null,
      navigationService: null,
      
      // 状态
      loading: false,
      error: null,
      documentLoaded: false,
      
      // 加载进度
      loadProgress: 0,
      loadMessage: '正在加载...',
      
      // 当前状态
      currentPage: this.initialPage,
      currentScale: this.initialScale,
      totalPages: 0,
      
      // 文档信息
      documentInfo: null
    };
  },
  
  async mounted() {
    await this.initializeServices();

    // 设置全局PDF查看器实例，供Vuex actions调用
    window.pdfViewerInstance = this;

    // 注册事件监听器
    // 移除对 pdf-services 直接调用的事件的自监听，避免无限递归
    // 这些事件现在通过 pdf-services 直接调用组件方法：
    // - document-loaded -> onDocumentLoaded
    // - document-error -> onDocumentError
    // - load-progress -> onLoadProgress
    // - password-required -> onPasswordRequired
    // - page-changed -> onPageChanged
    // - scale-changed -> onScaleChanged

    // 如果有其他子组件的事件需要监听，可以在这里添加

    if (this.src) {
      await this.loadDocument();
    }
  },
  
  beforeDestroy() {
    // 清理全局实例
    if (window.pdfViewerInstance === this) {
      window.pdfViewerInstance = null;
    }
    this.destroyServices();
  },
  
  watch: {
    src: {
      handler: 'onSrcChange',
      immediate: false
    },

    // 监听Vuex状态变化
    '$store.state.pdfReader.viewer.currentPage': {
      handler(newPage, oldPage) {
        if (newPage !== oldPage && newPage !== this.currentPage) {
          // 避免循环调用，只有当Vuex状态与组件状态不同步时才更新
          this.syncPageFromStore(newPage);
        }
      },
      immediate: false
    }
  },
  
  methods: {
    /**
     * 初始化服务
     */
    async initializeServices() {
      try {
        // 创建 PDF 服务
        this.pdfServices = new PdfServices(this, {
          isMobile: true,
          maxCanvasPixels: this.maxCanvasPixels,
          textLayerMode: this.textLayerMode
        });
        
        // 创建导航服务
        this.navigationService = new NavigationService(this.pdfServices);
        
        console.log('PDF 查看器核心服务初始化完成');
      } catch (error) {
        console.error('PDF 查看器核心服务初始化失败:', error);
        this.error = '初始化失败: ' + error.message;
      }
    },
    
    /**
     * 加载文档
     */
    async loadDocument() {
      if (!this.src || !this.pdfServices) {
        return;
      }
      
      try {
        this.loading = true;
        this.error = null;
        this.documentLoaded = false;
        this.loadProgress = 0;
        this.loadMessage = '正在加载 PDF...';
        
        await this.pdfServices.loadDocument(this.src);
        
      } catch (error) {
        console.error('PDF 文档加载失败:', error);
        this.error = error.message;
        this.loading = false;
      }
    },
    
    /**
     * 重试加载
     */
    async retry() {
      await this.loadDocument();
    },
    
    /**
     * 销毁服务
     */
    destroyServices() {
      if (this.pdfServices) {
        this.pdfServices.destroy();
        this.pdfServices = null;
      }
      
      this.navigationService = null;
    },
    
    /**
     * 处理 src 变化
     */
    async onSrcChange(newSrc, oldSrc) {
      if (newSrc !== oldSrc) {
        await this.loadDocument();
      }
    },
    
    /**
     * 处理文档加载完成
     */
    onDocumentLoaded(event) {
      this.loading = false;
      this.documentLoaded = true;
      this.totalPages = event.numPages;
      this.documentInfo = event;

      // 延迟计算最佳缩放比例，确保DOM已完全渲染
      this.$nextTick(() => {
        setTimeout(async () => {
          const optimalScale = await this.calculateOptimalScale(event);

          // 设置初始页面和缩放
          this.navigationService.currentPage = this.initialPage;
          this.navigationService.currentScale = optimalScale;
          this.currentPage = this.initialPage;
          this.currentScale = optimalScale;

          // 同步到 Vuex 状态（如果存在）
          if (this.$store && this.$store.hasModule && this.$store.hasModule(['pdfReader', 'viewer'])) {
            this.$store.dispatch('pdfReader/viewer/setScale', optimalScale);
            this.$store.dispatch('pdfReader/viewer/goToPage', this.initialPage);
          }

          console.log(`PDF 文档加载完成，共 ${event.numPages} 页，初始缩放: ${optimalScale}`);
        }, 100); // 100ms延迟确保布局稳定
      });

      this.$emit('document-loaded', event);
    },
    
    /**
     * 处理文档加载错误
     */
    onDocumentError(event) {
      this.loading = false;
      this.error = event.error;
      this.$emit('document-error', event);
    },
    
    /**
     * 处理加载进度
     * 注意：这个方法现在通过 pdf-services 直接调用，不再作为事件监听器
     */
    onLoadProgress(event) {
      this.loadProgress = event.percentage;
      this.loadMessage = `正在加载... ${event.percentage}%`;
      // 只向父组件传递事件，不要再次发出给自己
      this.$emit('load-progress', event);
    },
    
    /**
     * 处理页面变化
     */
    onPageChanged(event) {
      this.currentPage = event.pageNumber;
      this.$emit('page-changed', event);
    },
    
    /**
     * 处理缩放变化
     */
    onScaleChanged(event) {
      this.currentScale = event.scale;
      this.$emit('scale-changed', event);
    },
    
    /**
     * 处理页面渲染完成
     */
    onPageRendered(event) {
      this.$emit('page-rendered', event);
    },
    
    /**
     * 处理页面渲染错误
     */
    onRenderError(event) {
      console.error('页面渲染错误:', event);
      this.$emit('render-error', event);
    },
    
    /**
     * 处理密码请求
     * MVP阶段：基础事件传递
     * 后期扩展：密码对话框、密码验证、记住密码等功能
     */
    onPasswordRequired(event) {
      this.$emit('password-required', event);
    },
    
    // 公共方法
    
    /**
     * 跳转到指定页面
     */
    goToPage(pageNumber) {
      if (this.navigationService) {
        return this.navigationService.goToPage(pageNumber);
      }
    },

    /**
     * 从Vuex store同步页面状态
     */
    syncPageFromStore(pageNumber) {
      if (pageNumber !== this.currentPage) {
        const previousPage = this.currentPage;

        // 直接更新组件状态，不触发Vuex更新，避免循环
        this.currentPage = pageNumber;
        if (this.navigationService) {
          this.navigationService.currentPage = pageNumber;
        }

        // 触发页面变化事件，但不更新Vuex状态
        const pageChangedEvent = {
          pageNumber,
          previous: previousPage
        };
        this.$emit('page-changed', pageChangedEvent);

        console.log(`页面跳转: ${previousPage} -> ${pageNumber}`);
      }
    },
    
    /**
     * 下一页
     */
    nextPage() {
      if (this.navigationService) {
        return this.navigationService.nextPage();
      }
    },
    
    /**
     * 上一页
     */
    prevPage() {
      if (this.navigationService) {
        return this.navigationService.prevPage();
      }
    },
    
    /**
     * 设置缩放
     */
    setScale(scale) {
      if (this.navigationService) {
        return this.navigationService.setScale(scale);
      }
    },
    
    /**
     * 放大
     */
    zoomIn() {
      if (this.navigationService) {
        return this.navigationService.zoomIn();
      }
    },
    
    /**
     * 缩小
     */
    zoomOut() {
      if (this.navigationService) {
        return this.navigationService.zoomOut();
      }
    },

    /**
     * 计算最佳缩放比例
     * 根据容器尺寸和实际PDF页面尺寸自动计算合适的缩放比例
     */
    async calculateOptimalScale(documentEvent = null) {
      try {
        const container = this.$refs.viewerContainer;
        if (!container) {
          return this.initialScale;
        }

        // 获取容器的可用高度和宽度
        const containerRect = container.getBoundingClientRect();
        const availableHeight = containerRect.height - 64; // 减去padding和其他元素的空间
        const availableWidth = containerRect.width - 64;

        let pageWidth = 595; // 默认A4宽度
        let pageHeight = 842; // 默认A4高度

        // 尝试获取实际的PDF页面尺寸
        try {
          if (this.pdfServices && this.pdfServices.pdfDocument) {
            const page = await this.pdfServices.pdfDocument.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            pageWidth = viewport.width;
            pageHeight = viewport.height;
            console.log(`获取到实际页面尺寸: ${pageWidth}x${pageHeight}px`);
          } else if (documentEvent && documentEvent.getPage) {
            // 如果从事件中可以获取页面信息
            const page = await documentEvent.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            pageWidth = viewport.width;
            pageHeight = viewport.height;
            console.log(`从事件获取页面尺寸: ${pageWidth}x${pageHeight}px`);
          }
        } catch (error) {
          console.warn('无法获取实际页面尺寸，使用默认值:', error);
        }

        // 计算适合容器的缩放比例
        const scaleToFitHeight = availableHeight / pageHeight;
        const scaleToFitWidth = availableWidth / pageWidth;

        // 选择较小的缩放比例以确保页面完全适合容器
        const autoScale = Math.min(scaleToFitHeight, scaleToFitWidth);

        // 限制缩放范围：最小0.3，最大3.0，优先保证页面适合容器
        let optimalScale;
        if (autoScale < 0.3) {
          optimalScale = 0.3;
        } else if (autoScale > 3.0) {
          optimalScale = 3.0;
        } else {
          // 确保缩放比例合理，至少0.5
          optimalScale = Math.max(0.5, autoScale);
        }

        console.log(`容器尺寸: ${availableWidth}x${availableHeight}px, 页面尺寸: ${pageWidth}x${pageHeight}px, 计算缩放比例: ${optimalScale}`);

        return optimalScale;
      } catch (error) {
        console.warn('计算最佳缩放比例失败:', error);
        return this.initialScale;
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-viewer-core {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  
  &__content {
    flex: 1;
    overflow: auto; // 允许滚动
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 16px 16px 80px 16px; // 增加底部padding为控制条留出空间
    min-height: 0; // 确保flex子元素能够正确缩放
  }
  
  &__error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
    
    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .error-message {
      font-size: 16px;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    
    .error-retry {
      padding: 8px 16px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      
      &:hover {
        background: #40a9ff;
      }
      
      &:active {
        background: #096dd9;
      }
    }
  }
  
  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
    
    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .empty-message {
      font-size: 16px;
      color: #999;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-viewer-core {
    &__content {
      padding: 12px 12px 100px 12px; // 移动端控制条更高，需要更多底部空间
    }
  }
}
</style>
