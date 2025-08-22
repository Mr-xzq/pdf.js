<template>
  <div class="pdf-top-toolbar">
    <div class="toolbar-left">
      <!-- 文档标题 -->
      <div v-if="documentTitle" class="document-title">
        {{ documentTitle }}
      </div>
    </div>
    
    <div class="toolbar-right">
      <!-- 搜索按钮（占位，后续扩展功能） -->
      <van-button 
        icon="search" 
        type="default" 
        size="small"
        plain
        @click="handleSearch"
        :disabled="!isSearchEnabled"
        class="search-btn"
      >
        搜索
      </van-button>
    </div>
  </div>
</template>

<script>
import { mapPdfState, mapPdfGetters } from '../store/pdf-viewer.js';

export default {
  name: 'PdfTopToolbar',

  data() {
    return {
      searchQuery: ''
    };
  },

  computed: {
    // 使用命名空间辅助函数
    ...mapPdfState(['documentInfo']),
    ...mapPdfGetters(['isDocumentLoaded']),
    
    // 文档标题
    documentTitle() {
      if (!this.documentInfo || !this.documentInfo.title) {
        return '';
      }
      
      // 限制标题长度
      const title = this.documentInfo.title;
      return title.length > 30 ? title.substring(0, 30) + '...' : title;
    },
    
    // 搜索功能目前作为扩展功能，暂时禁用
    isSearchEnabled() {
      return false; // 后续扩展时启用: this.isDocumentLoaded
    }
  },
  
  methods: {
    /**
     * 处理搜索
     */
    handleSearch() {
      if (!this.isSearchEnabled) {
        this.$toast('搜索功能正在开发中...');
        return;
      }
      
      // 触发搜索事件
      this.$emit('search', this.searchQuery);
    },
    
    /**
     * 显示搜索输入框
     */
    showSearchInput() {
      this.$dialog.prompt({
        title: '搜索PDF内容',
        message: '请输入要搜索的关键词',
        inputPlaceholder: '关键词',
        showCancelButton: true,
        beforeClose: (action, done) => {
          if (action === 'confirm') {
            const value = this.$dialog.currentInstance.inputValue;
            if (value && value.trim()) {
              this.searchQuery = value.trim();
              this.handleSearch();
            }
          }
          done();
        }
      });
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  .toolbar-left {
    flex: 1;
    display: flex;
    align-items: center;
    
    .document-title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .search-btn {
      min-width: 60px;
      
      &:disabled {
        opacity: 0.5;
      }
    }
  }
}
</style>
