<template>
  <div class="pdf-viewer-example">
    <!-- 顶部操作栏 -->
    <div class="example-header">
      <h2>PDF 查看器示例</h2>
      <div class="header-actions">
        <!-- 文件选择 -->
        <van-button 
          icon="folder-o" 
          type="primary" 
          size="small"
          @click="showFileSelector"
        >
          选择文件
        </van-button>
        
        <!-- 主题切换 -->
        <van-button 
          :icon="isDarkTheme ? 'sun-o' : 'moon-o'"
          type="default" 
          size="small"
          @click="toggleTheme"
        >
          {{ isDarkTheme ? '浅色' : '深色' }}
        </van-button>
      </div>
    </div>
    
    <!-- PDF 查看器 -->
    <div class="viewer-wrapper">
      <pdf-viewer
        v-if="currentPdfUrl"
        :src="currentPdfUrl"
        :show-toolbar="showToolbar"
        :theme="currentTheme"
        :initial-page="initialPage"
        @document-loaded="onDocumentLoaded"
        @load-error="onLoadError"
        @page-changed="onPageChanged"
        @scale-changed="onScaleChanged"
      />
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <van-icon name="description" size="64" color="#ddd" />
        <p>请选择要查看的 PDF 文件</p>
        <van-button 
          type="primary" 
          @click="showFileSelector"
          class="select-file-btn"
        >
          选择文件
        </van-button>
      </div>
    </div>
    
    <!-- 文件选择弹窗 -->
    <van-action-sheet
      v-model="showFilePicker"
      title="选择 PDF 文件"
      :actions="pdfFiles"
      @select="onFileSelect"
      cancel-text="取消"
    />
    
    <!-- 文档信息弹窗 -->
    <van-dialog
      v-model="showDocInfo"
      title="文档信息"
      :show-cancel-button="false"
      confirm-button-text="确定"
    >
      <div class="doc-info-content">
        <div v-if="documentInfo.title" class="info-item">
          <label>标题：</label>
          <span>{{ documentInfo.title }}</span>
        </div>
        <div v-if="documentInfo.author" class="info-item">
          <label>作者：</label>
          <span>{{ documentInfo.author }}</span>
        </div>
        <div v-if="documentInfo.subject" class="info-item">
          <label>主题：</label>
          <span>{{ documentInfo.subject }}</span>
        </div>
        <div class="info-item">
          <label>页数：</label>
          <span>{{ totalPages }}</span>
        </div>
        <div v-if="documentInfo.creationDate" class="info-item">
          <label>创建时间：</label>
          <span>{{ formatDate(documentInfo.creationDate) }}</span>
        </div>
      </div>
    </van-dialog>
    
    <!-- 状态栏 -->
    <div v-if="currentPdfUrl" class="status-bar">
      <div class="status-left">
        <span class="status-item">
          第 {{ currentPage }}/{{ totalPages }} 页
        </span>
        <span class="status-item">
          缩放 {{ currentScale }}%
        </span>
      </div>
      <div class="status-right">
        <van-button 
          icon="info-o" 
          type="default" 
          size="mini"
          @click="showDocInfo = true"
        >
          信息
        </van-button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import PdfViewer from './components/PdfViewer.vue';

export default {
  name: 'PdfViewerExample',
  
  components: {
    PdfViewer
  },
  
  data() {
    return {
      // 当前PDF URL
      currentPdfUrl: '',
      
      // UI 状态
      showFilePicker: false,
      showDocInfo: false,
      showToolbar: true,
      
      // 主题
      currentTheme: 'light',
      
      // 初始页码
      initialPage: 1,
      
      // 示例PDF文件列表
      pdfFiles: [
        {
          name: '示例文档 1 - 技术手册',
          url: '/assets/pdf/sample1.pdf',
          description: 'PDF.js 技术文档示例'
        },
        {
          name: '示例文档 2 - 用户指南', 
          url: '/assets/pdf/sample2.pdf',
          description: '用户操作指南示例'
        },
        {
          name: '示例文档 3 - API 文档',
          url: '/assets/pdf/sample3.pdf', 
          description: 'API 接口文档示例'
        },
        {
          name: '在线文档示例',
          url: 'https://mozilla.github.io/pdf.js/helloworld/helloworld.pdf',
          description: '来自 PDF.js 官方的示例文档'
        }
      ],
      
      // 文档状态
      documentInfo: {},
      currentPage: 1,
      totalPages: 0,
      currentScale: 100
    };
  },
  
  computed: {
    ...mapState('pdfViewer', {
      storeDocumentInfo: 'documentInfo',
      storeCurrentPage: 'currentPage',
      storeTotalPages: 'totalPages',
      storeScale: 'scale'
    }),
    
    ...mapGetters('pdfViewer', ['isDocumentLoaded']),
    
    // 是否为暗色主题
    isDarkTheme() {
      return this.currentTheme === 'dark';
    }
  },
  
  watch: {
    // 监听 Vuex 状态变化
    storeDocumentInfo: {
      handler(info) {
        this.documentInfo = info || {};
      },
      immediate: true,
      deep: true
    },
    
    storeCurrentPage(page) {
      this.currentPage = page;
    },
    
    storeTotalPages(total) {
      this.totalPages = total;
    },
    
    storeScale(scale) {
      this.currentScale = Math.round(scale * 100);
    }
  },
  
  mounted() {
    // 自动加载第一个示例文档
    this.loadDefaultDocument();
    
    // 从本地存储恢复主题设置
    const savedTheme = localStorage.getItem('pdf-viewer-theme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }
  },
  
  methods: {
    /**
     * 加载默认文档
     */
    async loadDefaultDocument() {
      try {
        // 使用第一个在线示例文档
        this.currentPdfUrl = this.pdfFiles[3].url;
      } catch (error) {
        console.warn('Failed to load default document:', error);
      }
    },
    
    /**
     * 显示文件选择器
     */
    showFileSelector() {
      this.showFilePicker = true;
    },
    
    /**
     * 处理文件选择
     */
    onFileSelect(action) {
      this.currentPdfUrl = action.url;
      this.showFilePicker = false;
      this.initialPage = 1; // 重置初始页码
      
      this.$toast.success(`正在加载：${action.name}`);
    },
    
    /**
     * 切换主题
     */
    toggleTheme() {
      this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      
      // 保存到本地存储
      localStorage.setItem('pdf-viewer-theme', this.currentTheme);
      
      this.$toast.success(`已切换到${this.isDarkTheme ? '深色' : '浅色'}主题`);
    },
    
    /**
     * 文档加载完成
     */
    onDocumentLoaded(event) {
      console.log('Document loaded:', event);
      this.$toast.success(`PDF 加载完成，共 ${event.numPages} 页`);
    },
    
    /**
     * 文档加载错误
     */
    onLoadError(error) {
      console.error('Load error:', error);
      this.$toast.fail('PDF 加载失败，请重试');
    },
    
    /**
     * 页面变化
     */
    onPageChanged(event) {
      console.log('Page changed:', event);
    },
    
    /**
     * 缩放变化
     */
    onScaleChanged(event) {
      console.log('Scale changed:', event);
    },
    
    /**
     * 格式化日期
     */
    formatDate(dateStr) {
      if (!dateStr) return '';
      
      try {
        // PDF 日期格式通常是 D:YYYYMMDDHHmmSSOHH'mm
        let cleanDate = dateStr.replace(/^D:/, '');
        if (cleanDate.length >= 14) {
          const year = cleanDate.substring(0, 4);
          const month = cleanDate.substring(4, 6);
          const day = cleanDate.substring(6, 8);
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      } catch (error) {
        return dateStr;
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-viewer-example {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  
  .example-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid #eee;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #333;
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .viewer-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
      
      p {
        margin: 16px 0 24px;
        font-size: 16px;
      }
      
      .select-file-btn {
        min-width: 120px;
      }
    }
  }
  
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 16px;
    background: #fff;
    border-top: 1px solid #eee;
    font-size: 12px;
    
    .status-left {
      display: flex;
      gap: 16px;
      
      .status-item {
        color: #666;
      }
    }
  }
  
  .doc-info-content {
    padding: 16px 0;
    
    .info-item {
      display: flex;
      margin-bottom: 12px;
      
      label {
        min-width: 80px;
        font-weight: 500;
        color: #333;
      }
      
      span {
        flex: 1;
        color: #666;
        word-break: break-word;
      }
    }
  }
}

// 暗色主题
.theme-dark .pdf-viewer-example {
  background: #1e1e1e;
  
  .example-header {
    background: #2c2c2c;
    border-bottom-color: #404040;
    
    h2 {
      color: #fff;
    }
  }
  
  .empty-state {
    color: #666;
    
    p {
      color: #999;
    }
  }
  
  .status-bar {
    background: #2c2c2c;
    border-top-color: #404040;
    
    .status-item {
      color: #bbb;
    }
  }
  
  .doc-info-content {
    .info-item {
      label {
        color: #fff;
      }
      
      span {
        color: #bbb;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .pdf-viewer-example {
    .example-header {
      padding: 0 12px;
      
      h2 {
        font-size: 16px;
      }
      
      .header-actions {
        gap: 4px;
      }
    }
    
    .status-bar {
      padding: 0 12px;
      
      .status-left {
        gap: 12px;
      }
    }
  }
}

@media (max-width: 480px) {
  .pdf-viewer-example {
    .example-header {
      height: 48px;
      
      h2 {
        font-size: 14px;
      }
    }
    
    .status-bar {
      height: 36px;
      font-size: 11px;
      
      .status-left {
        gap: 8px;
      }
    }
  }
}
</style>
