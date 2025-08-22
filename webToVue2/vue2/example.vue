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

      </div>
    </div>
    
    <!-- PDF 查看器 -->
    <div class="viewer-wrapper">
      <pdf-viewer
        v-if="currentPdfUrl"
        :src="currentPdfUrl"
        :show-toolbar="showToolbar"
        :initial-page="initialPage"
        @document-loaded="onDocumentLoaded"
        @load-error="onLoadError"
        @page-changed="onPageChanged"
        @scale-changed="onScaleChanged"
        @show-info="showDocInfo = true"
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
    

  </div>
</template>

<script>
// 使用命名空间辅助函数 - 符合项目 Vuex 规范
import { mapPdfState, mapPdfGetters } from './store/pdf-viewer.js';
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
      

      
      // 初始页码
      initialPage: 1,
      
      // 示例PDF文件列表
      pdfFiles: [
        {
          name: '示例文档 1 - 技术手册',
          url: 'https://www.pdf995.com/samples/pdf.pdf',
          description: 'PDF.js 技术文档示例'
        },
        {
          name: '示例文档 2 - 用户指南', 
          url: 'https://www.pdf995.com/samples/pdf.pdf',
          description: '用户操作指南示例'
        },
        {
          name: '示例文档 3 - API 文档',
          url: 'https://www.pdf995.com/samples/pdf.pdf', 
          description: 'API 接口文档示例'
        },
        {
          name: '在线文档示例',
          url: 'https://www.pdf995.com/samples/pdf.pdf',
          description: '来自 PDF.js 官方的示例文档'
        }
      ],
    };
  },
  
  computed: {
    // 使用命名空间辅助函数 - 直接映射状态，无需重命名
    ...mapPdfState([
      'documentInfo',
      'currentPage',
      'totalPages',
      'scale'
    ]),

    ...mapPdfGetters([
      'isDocumentLoaded',
      'scalePercent' // 使用 Vuex 中已有的缩放百分比 getter
    ]),



    // 缩放百分比（使用 Vuex getter，避免重复计算）
    currentScale() {
      return this.scalePercent;
    }
  },
  
  // 移除 watch，因为现在直接使用 Vuex 状态，无需同步到本地状态
  
  mounted() {
    // 自动加载第一个示例文档
    this.loadDefaultDocument();
    

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
</style>
