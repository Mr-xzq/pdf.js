<template>
  <div class="pdf-bottom-toolbar">
    <!-- 左侧按钮组 -->
    <div class="toolbar-left">
      <!-- 缩略图按钮 -->
      <van-button
        icon="photo-o"
        size="small"
        :type="isThumbsActive ? 'primary' : 'default'"
        @click="handleShowThumbnails"
        class="toolbar-btn"
      >
        缩略图
      </van-button>

      <!-- 目录按钮 -->
      <van-button
        icon="bars"
        size="small"
        :type="isOutlineActive ? 'primary' : 'default'"
        :disabled="!hasOutline"
        @click="handleShowOutline"
        class="toolbar-btn"
      >
        目录
      </van-button>
    </div>
    
    <!-- 中间页面导航 -->
    <div class="toolbar-center">
      <!-- 上一页 -->
      <van-button 
        icon="arrow-left" 
        size="small"
        :disabled="!canGoPrev"
        @click="handlePrevPage"
        class="nav-btn"
      />
      
      <!-- 页码显示 -->
      <div class="page-info" @click="showPageInput">
        <span class="current-page">{{ currentPage }}</span>
        <span class="separator">/</span>
        <span class="total-pages">{{ totalPages }}</span>
      </div>
      
      <!-- 下一页 -->
      <van-button
        icon="arrow"
        size="small"
        :disabled="!canGoNext"
        @click="handleNextPage"
        class="nav-btn"
      />
    </div>
    
    <!-- 右侧缩放控制 -->
    <div class="toolbar-right">
      <!-- 缩小 -->
      <van-button
        icon="minus"
        size="small"
        :disabled="!canZoomOut"
        @click="handleZoomOut"
        class="zoom-btn"
      />

      <!-- 缩放比例显示 -->
      <div class="scale-info" @click="showScaleOptions">
        {{ scalePercent }}%
      </div>

      <!-- 放大 -->
      <van-button
        icon="plus"
        size="small"
        :disabled="!canZoomIn"
        @click="handleZoomIn"
        class="zoom-btn"
      />

      <!-- 文档信息按钮 -->
      <van-button
        icon="info-o"
        size="small"
        @click="handleShowInfo"
        class="info-btn"
      />
    </div>
  </div>
</template>

<script>
import { mapPdfState, mapPdfGetters } from '../store/pdf-viewer.js';

export default {
  name: 'PdfBottomToolbar',

  computed: {
    ...mapPdfState([
      'currentPage',
      'totalPages',
      'scale',
      'sidebarMode',
      'showSidebar'
    ]),

    ...mapPdfGetters([
      'canGoNext',
      'canGoPrev',
      'canZoomIn',
      'canZoomOut',
      'scalePercent',
      'hasOutline',
      'isSidebarVisible'
    ]),
    
    // 缩略图是否激活
    isThumbsActive() {
      return this.isSidebarVisible && this.sidebarMode === 'thumbs';
    },
    
    // 目录是否激活
    isOutlineActive() {
      return this.isSidebarVisible && this.sidebarMode === 'outline';
    }
  },
  
  methods: {
    /**
     * 显示缩略图
     */
    handleShowThumbnails() {
      this.$emit('show-thumbnails');
    },
    
    /**
     * 显示目录
     */
    handleShowOutline() {
      if (!this.hasOutline) {
        this.$toast('当前PDF文档没有目录');
        return;
      }
      this.$emit('show-outline');
    },
    
    /**
     * 上一页
     */
    handlePrevPage() {
      this.$emit('prev-page');
    },
    
    /**
     * 下一页
     */
    handleNextPage() {
      this.$emit('next-page');
    },
    
    /**
     * 放大
     */
    handleZoomIn() {
      this.$emit('zoom-in');
    },
    
    /**
     * 缩小
     */
    handleZoomOut() {
      this.$emit('zoom-out');
    },
    
    /**
     * 显示页面输入框
     */
    showPageInput() {
      this.$dialog.prompt({
        title: '跳转到页面',
        message: `请输入页码 (1-${this.totalPages})`,
        inputPlaceholder: '页码',
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入有效的页码',
        showCancelButton: true,
        beforeClose: (action, done) => {
          if (action === 'confirm') {
            const value = parseInt(this.$dialog.currentInstance.inputValue);
            if (value >= 1 && value <= this.totalPages) {
              this.$store.dispatch('pdfViewer/goToPage', value);
            } else {
              this.$toast.fail(`页码必须在 1-${this.totalPages} 之间`);
              return;
            }
          }
          done();
        }
      });
    },
    
    /**
     * 显示缩放选项
     */
    showScaleOptions() {
      const scaleOptions = [
        { name: '25%', value: 0.25 },
        { name: '50%', value: 0.5 },
        { name: '75%', value: 0.75 },
        { name: '100%', value: 1.0 },
        { name: '125%', value: 1.25 },
        { name: '150%', value: 1.5 },
        { name: '200%', value: 2.0 },
        { name: '300%', value: 3.0 },
        { name: '适应宽度', value: 'fit-width' },
        { name: '适应页面', value: 'fit-page' }
      ];
      
      this.$actionSheet.show({
        title: '选择缩放比例',
        actions: scaleOptions.map(option => ({
          name: option.name,
          callback: () => {
            if (typeof option.value === 'number') {
              this.$store.dispatch('pdfViewer/setScale', option.value);
            } else {
              // 处理适应宽度/页面的逻辑
              this.handleFitMode(option.value);
            }
          }
        })),
        cancelText: '取消'
      });
    },
    
    /**
     * 处理适应模式
     */
    handleFitMode(mode) {
      switch (mode) {
        case 'fit-width':
          this.$store.dispatch('pdfViewer/fitToWidth');
          break;
        case 'fit-page':
          // 暂时使用 1.0，后续根据容器尺寸计算
          this.$store.dispatch('pdfViewer/setScale', 1.0);
          break;
      }
    },

    /**
     * 显示文档信息
     */
    handleShowInfo() {
      this.$emit('show-info');
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-bottom-toolbar {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 8px;
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;
  flex-shrink: 0;
  width: 100%;
  
  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .toolbar-center {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .toolbar-btn {
    min-width: 60px;
    font-size: 12px;
    white-space: nowrap;

    // 确保按钮内容可见
    /deep/ .van-button__content {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    // 确保图标显示
    /deep/ .van-icon {
      font-size: 14px;
    }
  }
  
  .nav-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    padding: 0;
    
    /deep/ .van-icon {
      font-size: 16px;
    }
  }
  
  .zoom-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    padding: 0;

    /deep/ .van-icon {
      font-size: 14px;
    }
  }

  .info-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    padding: 0;
    margin-left: 4px;

    /deep/ .van-icon {
      font-size: 14px;
    }
  }
  
  .page-info {
    display: flex;
    align-items: center;
    min-width: 60px;
    height: 32px;
    padding: 0 8px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    cursor: pointer;
    user-select: none;
    
    .current-page {
      color: #1989fa;
    }
    
    .separator {
      margin: 0 4px;
      color: #666;
    }
    
    .total-pages {
      color: #666;
    }
    
    &:active {
      background: #e8e8e8;
    }
  }
  
  .scale-info {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 28px;
    padding: 0 6px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #333;
    cursor: pointer;
    user-select: none;
    
    &:active {
      background: #e8e8e8;
    }
  }
}

// 响应式适配
@media (max-width: 375px) {
  .pdf-bottom-toolbar {
    padding: 0 4px;
    
    .toolbar-left,
    .toolbar-right {
      gap: 2px;
    }
    
    .toolbar-btn {
      min-width: 50px;
      font-size: 11px;
      padding: 0 6px;
    }
    
    .page-info {
      min-width: 50px;
      font-size: 13px;
    }
    
    .scale-info {
      min-width: 40px;
      font-size: 11px;
    }
  }
}
</style>
