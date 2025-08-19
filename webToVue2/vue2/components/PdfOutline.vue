<template>
  <div class="pdf-outline-viewer">
    <!-- 头部 -->
    <div class="outline-header">
      <div class="header-title">
        <van-icon name="list-switch" />
        <span>目录</span>
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
    
    <!-- 目录内容 -->
    <div class="outline-container" ref="outlineContainer">
      <!-- 空状态 -->
      <div v-if="!hasOutline" class="empty-state">
        <van-icon name="list-switch" size="48" color="#ddd" />
        <p>当前PDF文档没有目录</p>
      </div>
      
      <!-- 加载状态 -->
      <van-loading v-else-if="loading" class="loading-center">
        加载中...
      </van-loading>
      
      <!-- 目录树 -->
      <div v-else class="outline-tree">
        <outline-item
          v-for="(item, index) in outlineItems"
          :key="index"
          :item="item"
          :level="0"
          @item-click="handleItemClick"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

// 目录项组件
const OutlineItem = {
  name: 'OutlineItem',
  
  props: {
    item: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    }
  },
  
  data() {
    return {
      expanded: this.level < 2 // 默认展开前两层
    };
  },
  
  computed: {
    hasChildren() {
      return this.item.items && this.item.items.length > 0;
    },
    
    itemStyle() {
      return {
        paddingLeft: `${this.level * 16 + 16}px`
      };
    },
    
    itemClasses() {
      return {
        'outline-item': true,
        'has-children': this.hasChildren,
        'expanded': this.expanded
      };
    }
  },
  
  methods: {
    handleClick() {
      if (this.hasChildren) {
        this.expanded = !this.expanded;
      }
      
      this.$emit('item-click', this.item);
    }
  },
  
  template: `
    <div class="outline-item-container">
      <div 
        :class="itemClasses"
        :style="itemStyle"
        @click="handleClick"
      >
        <!-- 展开/收起图标 -->
        <van-icon 
          v-if="hasChildren"
          :name="expanded ? 'arrow-down' : 'arrow'"
          class="expand-icon"
        />
        <div v-else class="expand-placeholder"></div>
        
        <!-- 目录标题 -->
        <div class="item-title">{{ item.title }}</div>
        
        <!-- 页码 -->
        <div v-if="item.page" class="item-page">
          {{ item.page }}
        </div>
      </div>
      
      <!-- 子项 -->
      <div 
        v-if="hasChildren && expanded" 
        class="outline-children"
      >
        <outline-item
          v-for="(child, index) in item.items"
          :key="index"
          :item="child"
          :level="level + 1"
          @item-click="$emit('item-click', $event)"
        />
      </div>
    </div>
  `
};

export default {
  name: 'PdfOutline',
  
  components: {
    OutlineItem
  },
  
  data() {
    return {
      // PDF 查看器核心实例
      pdfViewerCore: null,
      outlineViewer: null,
      
      // 目录数据
      outlineItems: [],
      loading: false
    };
  },
  
  computed: {
    ...mapState('pdfViewer', ['outline']),
    ...mapGetters('pdfViewer', ['hasOutline', 'isDocumentLoaded'])
  },
  
  watch: {
    outline: {
      handler(newOutline) {
        this.processOutline(newOutline);
      },
      immediate: true
    }
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
        // 初始化目录查看器
        this.outlineViewer = pdfViewerCore.initOutlineViewer(
          this.$refs.outlineContainer
        );
        
        // 处理目录数据
        if (this.outline) {
          this.processOutline(this.outline);
        }
        
      } catch (error) {
        console.error('Failed to initialize outline viewer:', error);
        this.$toast.fail('目录初始化失败');
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 处理目录数据
     */
    async processOutline(outline) {
      if (!outline || !Array.isArray(outline)) {
        this.outlineItems = [];
        return;
      }
      
      this.loading = true;
      
      try {
        // 递归处理目录项
        this.outlineItems = await this.processOutlineItems(outline);
      } catch (error) {
        console.error('Failed to process outline:', error);
        this.outlineItems = [];
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 递归处理目录项
     */
    async processOutlineItems(items) {
      const result = [];
      
      for (const item of items) {
        const processedItem = {
          title: item.title || '无标题',
          url: item.url,
          dest: item.dest,
          page: null,
          items: []
        };
        
        // 获取页码
        if (item.dest && this.pdfViewerCore) {
          try {
            const pageIndex = await this.getDestinationPageIndex(item.dest);
            if (pageIndex !== null) {
              processedItem.page = pageIndex + 1; // 转换为1基页码
            }
          } catch (error) {
            console.warn('Failed to get page for outline item:', error);
          }
        }
        
        // 递归处理子项
        if (item.items && item.items.length > 0) {
          processedItem.items = await this.processOutlineItems(item.items);
        }
        
        result.push(processedItem);
      }
      
      return result;
    },
    
    /**
     * 获取目标页码索引
     */
    async getDestinationPageIndex(dest) {
      if (!this.pdfViewerCore || !this.pdfViewerCore.pdfDocument) {
        return null;
      }
      
      try {
        // 如果dest是数组，第一个元素通常是页面引用
        if (Array.isArray(dest) && dest.length > 0) {
          const pageRef = dest[0];
          const pageIndex = await this.pdfViewerCore.pdfDocument.getPageIndex(pageRef);
          return pageIndex;
        }
        
        return null;
      } catch (error) {
        console.warn('Failed to get destination page index:', error);
        return null;
      }
    },
    
    /**
     * 处理目录项点击
     */
    handleItemClick(item) {
      if (item.page) {
        // 跳转到指定页面
        this.$emit('item-click', {
          page: item.page,
          dest: item.dest,
          title: item.title
        });
      } else if (item.url) {
        // 处理外部链接
        if (item.url.startsWith('http')) {
          window.open(item.url, '_blank');
        }
      }
    },
    
    /**
     * 处理关闭
     */
    handleClose() {
      this.$store.dispatch('pdfViewer/hideSidebar');
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-outline-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  
  .outline-header {
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
  
  .outline-container {
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
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #999;
      
      p {
        margin-top: 16px;
        font-size: 14px;
      }
    }
  }
  
  .outline-tree {
    padding: 8px 0;
  }
}

// 目录项样式
.outline-item-container {
  .outline-item {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 8px 16px 8px 0;
    cursor: pointer;
    border-radius: 4px;
    margin: 0 8px;
    transition: background-color 0.2s ease;
    
    &:hover {
      background: #f5f5f5;
    }
    
    &:active {
      background: #e8e8e8;
    }
    
    .expand-icon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
      font-size: 12px;
      color: #666;
      transition: transform 0.2s ease;
      
      &.arrow {
        transform: rotate(-90deg);
      }
    }
    
    .expand-placeholder {
      width: 16px;
      height: 16px;
      margin-right: 8px;
    }
    
    .item-title {
      flex: 1;
      font-size: 14px;
      color: #333;
      line-height: 1.4;
      word-break: break-word;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .item-page {
      margin-left: 8px;
      font-size: 12px;
      color: #666;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 24px;
      text-align: center;
    }
  }
  
  .outline-children {
    overflow: hidden;
    transition: all 0.3s ease;
  }
}

// 暗色主题
.theme-dark .pdf-outline-viewer {
  background: #2c2c2c;
  color: #fff;
  
  .outline-header {
    border-bottom-color: #404040;
    
    .header-title {
      color: #fff;
    }
  }
  
  .empty-state {
    color: #666;
  }
  
  .outline-item {
    &:hover {
      background: #404040;
    }
    
    &:active {
      background: #4a4a4a;
    }
    
    .expand-icon {
      color: #bbb;
    }
    
    .item-title {
      color: #fff;
    }
    
    .item-page {
      color: #bbb;
      background: #404040;
    }
  }
}

// 滚动条样式
.outline-container {
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

.theme-dark .outline-container {
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
