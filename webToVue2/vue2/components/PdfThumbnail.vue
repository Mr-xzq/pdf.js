<template>
  <div class="pdf-thumbnail-viewer">
    <!-- 头部 -->
    <div class="thumbnail-header">
      <div class="header-title">
        <van-icon name="photo-o" />
        <span>缩略图</span>
      </div>
      <van-button 
        icon="cross" 
        type="default" 
        size="small"
        plain
        @click="handleClose"
        class="close-btn"
      />
    </div>
    
    <!-- 缩略图列表 -->
    <div 
      class="thumbnail-container" 
      ref="thumbnailContainer"
    >
      <van-loading v-if="loading" class="loading-center">
        加载中...
      </van-loading>
      
      <div 
        v-else
        class="thumbnail-list"
      >
        <div
          v-for="page in pages"
          :key="page.pageNumber"
          class="thumbnail-item"
          :class="{ active: page.pageNumber === currentPage }"
          @click="handlePageClick(page.pageNumber)"
        >
          <!-- 缩略图画布 -->
          <div class="thumbnail-canvas-container">
            <canvas 
              :ref="`thumbnail-${page.pageNumber}`"
              class="thumbnail-canvas"
            ></canvas>
            
            <!-- 加载状态 -->
            <div 
              v-if="page.loading" 
              class="thumbnail-loading"
            >
              <van-loading size="16" />
            </div>
          </div>
          
          <!-- 页码 -->
          <div class="thumbnail-page-number">
            {{ page.pageNumber }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'PdfThumbnail',
  
  data() {
    return {
      // PDF 查看器核心实例
      pdfViewerCore: null,
      thumbnailViewer: null,
      
      // 页面数据
      pages: [],
      loading: false,
      
      // 缩略图配置
      thumbnailConfig: {
        width: 120,
        height: 160,
        scale: 0.3
      }
    };
  },
  
  computed: {
    ...mapState('pdfViewer', ['currentPage', 'totalPages']),
    ...mapGetters('pdfViewer', ['isDocumentLoaded'])
  },
  
  watch: {
    currentPage(newPage) {
      this.scrollToCurrentPage(newPage);
    }
  },
  
  mounted() {
    // 初始化页面数据
    this.initializePages();
  },
  
  methods: {
    /**
     * 初始化组件
     */
    async initialize(pdfViewerCore) {
      this.pdfViewerCore = pdfViewerCore;
      
      if (!pdfViewerCore || !pdfViewerCore.pdfDocument) {
        return;
      }
      
      this.loading = true;
      
      try {
        // 初始化缩略图查看器
        this.thumbnailViewer = pdfViewerCore.initThumbnailViewer(
          this.$refs.thumbnailContainer
        );
        
        // 初始化页面数据
        this.initializePages();
        
        // 渲染缩略图
        await this.renderThumbnails();
        
      } catch (error) {
        console.error('Failed to initialize thumbnail viewer:', error);
        this.$toast.fail('缩略图初始化失败');
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 初始化页面数据
     */
    initializePages() {
      this.pages = Array.from({ length: this.totalPages }, (_, index) => ({
        pageNumber: index + 1,
        rendered: false,
        loading: false
      }));
    },
    
    /**
     * 渲染缩略图
     */
    async renderThumbnails() {
      if (!this.pdfViewerCore || !this.pdfViewerCore.pdfDocument) {
        return;
      }
      
      // 使用批量渲染，避免同时渲染太多缩略图导致性能问题
      const batchSize = 5;
      const totalPages = this.totalPages;
      
      for (let i = 0; i < totalPages; i += batchSize) {
        const endIndex = Math.min(i + batchSize, totalPages);
        const promises = [];
        
        for (let pageIndex = i; pageIndex < endIndex; pageIndex++) {
          promises.push(this.renderThumbnail(pageIndex + 1));
        }
        
        await Promise.all(promises);
        
        // 给浏览器一些时间处理其他任务
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    },
    
    /**
     * 渲染单个缩略图
     */
    async renderThumbnail(pageNumber) {
      if (!this.pdfViewerCore || !this.pdfViewerCore.pdfDocument) {
        return;
      }
      
      const pageIndex = pageNumber - 1;
      const page = this.pages[pageIndex];
      
      if (page.rendered || page.loading) {
        return;
      }
      
      page.loading = true;
      
      try {
        // 获取PDF页面
        const pdfPage = await this.pdfViewerCore.pdfDocument.getPage(pageNumber);
        
        // 计算视口
        const viewport = pdfPage.getViewport({ scale: this.thumbnailConfig.scale });
        
        // 获取canvas元素
        const canvas = this.$refs[`thumbnail-${pageNumber}`]?.[0];
        if (!canvas) {
          console.warn(`Canvas not found for page ${pageNumber}`);
          return;
        }
        
        const context = canvas.getContext('2d');
        
        // 设置canvas尺寸
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = this.thumbnailConfig.width + 'px';
        canvas.style.height = this.thumbnailConfig.height + 'px';
        
        // 渲染PDF内容到canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await pdfPage.render(renderContext).promise;
        
        page.rendered = true;
        
      } catch (error) {
        console.error(`Failed to render thumbnail for page ${pageNumber}:`, error);
      } finally {
        page.loading = false;
      }
    },
    
    /**
     * 处理页面点击
     */
    handlePageClick(pageNumber) {
      this.$emit('page-click', pageNumber);
    },
    
    /**
     * 处理关闭
     */
    handleClose() {
      this.$store.dispatch('pdfViewer/hideSidebar');
    },
    
    /**
     * 滚动到当前页面
     */
    scrollToCurrentPage(pageNumber) {
      this.$nextTick(() => {
        const thumbnailItem = this.$el.querySelector(
          `.thumbnail-item:nth-child(${pageNumber})`
        );
        
        if (thumbnailItem && this.$refs.thumbnailContainer) {
          const container = this.$refs.thumbnailContainer;
          const containerRect = container.getBoundingClientRect();
          const itemRect = thumbnailItem.getBoundingClientRect();
          
          // 计算滚动位置
          const scrollTop = thumbnailItem.offsetTop - 
            (containerRect.height / 2) + 
            (itemRect.height / 2);
          
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      });
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-thumbnail-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  
  .thumbnail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 16px;
    border-bottom: 1px solid #eee;
    
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #333;
      
      .van-icon {
        font-size: 18px;
        color: #1989fa;
      }
    }
    
    .close-btn {
      width: 24px;
      height: 24px;
      min-width: 24px;
      padding: 0;
      
      /deep/ .van-icon {
        font-size: 14px;
      }
    }
  }
  
  .thumbnail-container {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    position: relative;
    
    .loading-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
  
  .thumbnail-list {
    padding: 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .thumbnail-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: #f5f5f5;
    }
    
    &.active {
      background: #e6f3ff;
      border: 2px solid #1989fa;
      
      .thumbnail-page-number {
        color: #1989fa;
        font-weight: 600;
      }
    }
    
    .thumbnail-canvas-container {
      position: relative;
      width: 120px;
      height: 160px;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .thumbnail-canvas {
        max-width: 100%;
        max-height: 100%;
        display: block;
      }
      
      .thumbnail-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        padding: 8px;
      }
    }
    
    .thumbnail-page-number {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      text-align: center;
    }
  }
}

// 暗色主题
.theme-dark .pdf-thumbnail-viewer {
  background: #2c2c2c;
  color: #fff;
  
  .thumbnail-header {
    border-bottom-color: #404040;
    
    .header-title {
      color: #fff;
    }
  }
  
  .thumbnail-item {
    &:hover {
      background: #404040;
    }
    
    &.active {
      background: #1e3a8a;
      border-color: #409eff;
    }
    
    .thumbnail-canvas-container {
      border-color: #555;
    }
    
    .thumbnail-page-number {
      color: #bbb;
    }
  }
}

// 滚动条样式
.thumbnail-container {
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
}

.theme-dark .thumbnail-container {
  &::-webkit-scrollbar-track {
    background: #404040;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #666;
    
    &:hover {
      background: #888;
    }
  }
}
</style>
