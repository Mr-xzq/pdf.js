<template>
  <div class="pdf-outline">
    <!-- 加载状态 -->
    <div v-if="loading" class="pdf-outline__loading">
      <van-loading size="20px" />
      <span class="pdf-outline__loading-text">正在加载目录...</span>
    </div>

    <!-- 无目录状态 -->
    <div v-else-if="!hasOutline" class="pdf-outline__empty">
      <van-icon name="notes-o" size="24px" color="#c8c9cc" />
      <span class="pdf-outline__empty-text">此文档没有目录</span>
    </div>

    <!-- 目录列表 -->
    <div v-else class="pdf-outline__content">
      <div class="pdf-outline__header">
        <span class="pdf-outline__title">目录</span>
        <van-button
          v-if="hasNestedItems"
          type="default"
          size="mini"
          plain
          @click="toggleAllItems"
          class="pdf-outline__toggle-all"
        >
          {{ allExpanded ? '全部收起' : '全部展开' }}
        </van-button>
      </div>

      <div class="pdf-outline__list">
        <pdf-outline-item
          v-for="(item, index) in outline"
          :key="`outline-${index}`"
          :item="item"
          :item-index="index"
          :level="0"
          :current-page="currentPage"
          :expanded-items="expandedItems"
          :pdf-document="pdfDocument"
          @item-click="onItemClick"
          @toggle-expand="onToggleExpand"
        />
      </div>
    </div>
  </div>
</template>

<script>
import PdfOutlineItem from './PdfOutlineItem.vue';
import { mapDocumentState, mapViewerState } from '../../store/index.js';

export default {
  name: 'PdfOutline',

  components: {
    PdfOutlineItem
  },

  props: {
    // 是否自动展开到当前页
    autoExpandToCurrent: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      // 目录数据
      outline: null,
      // 加载状态
      loading: false,
      // 展开的项目 - 使用对象而不是Set，确保Vue 2的响应式
      expandedItems: {},
      // 是否全部展开
      allExpanded: false,
      // 页面到目录项的映射关系
      pageToOutlineMap: {},
      // 目录项的层级关系
      outlineHierarchy: {}
    };
  },

  computed: {
    // 是否有目录
    hasOutline() {
      return this.outline && this.outline.length > 0;
    },

    // 是否有嵌套项目
    hasNestedItems() {
      if (!this.hasOutline) return false;
      return this.outline.some(item => this.hasNestedChildren(item));
    },

    // Vuex 状态映射
    ...mapDocumentState(['pdfDocument']),
    ...mapViewerState(['currentPage'])
  },

  watch: {
    // 监听文档变化
    pdfDocument: {
      handler(newDoc, oldDoc) {
        if (newDoc && newDoc !== oldDoc) {
          this.loadOutline();
        }
      },
      immediate: true
    },

    // 监听当前页变化
    currentPage(newPage, oldPage) {
      if (newPage !== oldPage && this.hasOutline) {
        console.log('当前页面变化:', oldPage, '->', newPage);
        this.$nextTick(() => {
          this.expandToCurrentPage(newPage);
        });
      }
    }
  },

  methods: {
    /**
     * 加载文档目录
     */
    async loadOutline() {
      if (!this.pdfDocument) {
        this.outline = null;
        return;
      }

      try {
        this.loading = true;
        const outline = await this.pdfDocument.getOutline();
        this.outline = outline;
        console.log('PDF目录加载完成:', outline);

        // 调试：检查目录结构
        if (outline && outline.length > 0) {
          console.log('目录结构分析:');
          outline.forEach((item, index) => {
            console.log(`- ${index}: ${item.title}, 有子项: ${!!(item.items && item.items.length > 0)}, 子项数量: ${item.items ? item.items.length : 0}`);
            if (item.items && item.items.length > 0) {
              item.items.forEach((subItem, subIndex) => {
                console.log(`  - ${subIndex}: ${subItem.title}`);
              });
            }
          });
        }

        // 如果有目录，建立映射关系并展开到当前页
        if (outline && outline.length > 0) {
          this.$nextTick(async () => {
            console.log('目录加载完成，建立页面映射关系');
            await this.buildPageToOutlineMapping();
            console.log('页面映射关系建立完成，展开到当前页面:', this.currentPage);
            this.expandToCurrentPage(this.currentPage);
          });
        }
      } catch (error) {
        console.error('加载文档目录失败:', error);
        this.outline = null;
        this.$emit('error', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 检查项目是否有嵌套子项
     */
    hasNestedChildren(item) {
      return item.items && item.items.length > 0;
    },

    /**
     * 处理目录项点击
     */
    async onItemClick(item) {
      try {
        // 发出点击事件
        this.$emit('item-click', item);

        // 如果有目标页面，导航到该页面
        if (item.dest) {
          const pageNumber = await this.getDestinationPageNumber(item.dest);
          if (pageNumber) {
            this.$emit('navigate-to-page', pageNumber);
          }
        }
        // 如果有URL，打开链接
        else if (item.url) {
          this.$emit('navigate-to-url', item.url);
        }
      } catch (error) {
        console.error('处理目录项点击失败:', error);
        this.$emit('error', error);
      }
    },

    /**
     * 获取目标页码
     */
    async getDestinationPageNumber(dest) {
      if (!this.pdfDocument) return null;

      try {
        // 如果dest是字符串，需要解析命名目标
        if (typeof dest === 'string') {
          const destination = await this.pdfDocument.getDestination(dest);
          if (destination) {
            dest = destination;
          } else {
            return null;
          }
        }

        // 如果dest是数组，第一个元素通常是页面引用
        if (Array.isArray(dest) && dest.length > 0) {
          const pageRef = dest[0];
          if (pageRef && typeof pageRef === 'object') {
            // 获取页面索引
            const pageIndex = await this.pdfDocument.getPageIndex(pageRef);
            return pageIndex + 1; // 页码从1开始
          }
        }

        return null;
      } catch (error) {
        console.error('解析目标页码失败:', error);
        return null;
      }
    },

    /**
     * 切换项目展开状态
     */
    onToggleExpand(item, expanded) {
      const itemId = this.getItemId(item);
      if (expanded) {
        this.$set(this.expandedItems, itemId, true);
      } else {
        this.$delete(this.expandedItems, itemId);
      }
      this.$emit('item-expand', item, expanded);
      console.log('目录展开状态变化:', item.title, expanded, itemId);
    },

    /**
     * 获取项目唯一ID
     */
    getItemId(item) {
      // 使用简单的字符串哈希来生成唯一ID
      const str = `${item.title || 'untitled'}-${JSON.stringify(item.dest || {})}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      const id = `outline-item-${Math.abs(hash)}`;
      console.log('生成目录项ID:', item.title, '->', id);
      return id;
    },

    /**
     * 建立页面到目录项的映射关系
     */
    async buildPageToOutlineMapping() {
      if (!this.outline) return;

      this.pageToOutlineMap = {};
      this.outlineHierarchy = {};

      await this.processOutlineItems(this.outline, []);

      // 建立页面范围映射
      this.buildPageRangeMapping();

      console.log('页面映射关系:', this.pageToOutlineMap);
      console.log('目录层级关系:', this.outlineHierarchy);
    },

    /**
     * 递归处理目录项，建立映射关系
     */
    async processOutlineItems(items, parentPath = []) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const currentPath = [...parentPath, item];
        const itemId = this.getItemId(item);

        // 记录层级关系
        this.outlineHierarchy[itemId] = {
          item,
          path: currentPath,
          level: parentPath.length,
          hasChildren: this.hasNestedChildren(item)
        };

        // 获取目录项对应的页码
        try {
          const pageNumber = await this.getDestinationPageNumber(item.dest);
          if (pageNumber) {
            this.pageToOutlineMap[pageNumber] = {
              item,
              path: currentPath,
              itemId
            };
          }
        } catch (error) {
          console.error('获取目录项页码失败:', item.title, error);
        }

        // 递归处理子项目
        if (this.hasNestedChildren(item)) {
          await this.processOutlineItems(item.items, currentPath);
        }
      }
    },

    /**
     * 建立页面范围映射（为没有精确对应目录项的页面找到所属的父级目录）
     */
    buildPageRangeMapping() {
      const pageNumbers = Object.keys(this.pageToOutlineMap)
        .map(p => parseInt(p))
        .sort((a, b) => a - b);

      // 为每个页面范围分配对应的目录项
      for (let page = 1; page <= (this.totalPages || 1000); page++) {
        if (!this.pageToOutlineMap[page]) {
          // 找到最接近且不超过当前页面的目录项
          let bestMatch = null;
          for (const pageNum of pageNumbers) {
            if (pageNum <= page) {
              bestMatch = this.pageToOutlineMap[pageNum];
            } else {
              break;
            }
          }

          if (bestMatch) {
            this.pageToOutlineMap[page] = bestMatch;
          }
        }
      }
    },

    /**
     * 展开到当前页面
     */
    expandToCurrentPage(pageNumber) {
      if (!this.hasOutline || !pageNumber) return;

      console.log('展开到当前页面:', pageNumber);

      const mapping = this.pageToOutlineMap[pageNumber];
      if (mapping) {
        console.log('找到页面映射:', mapping.item.title, '路径:', mapping.path.map(p => p.title));
        this.expandToItem(mapping);
      } else {
        console.log('未找到页面', pageNumber, '的映射关系');
      }
    },



    /**
     * 展开到指定项目
     */
    expandToItem(mapping) {
      if (!mapping) return;

      const { item, path } = mapping;
      console.log('展开到目标项目:', item.title, '路径:', path.map(p => p.title));

      // 展开路径上的所有父项目（除了最后一个目标项本身）
      for (let i = 0; i < path.length - 1; i++) {
        const parentItem = path[i];

        if (this.hasNestedChildren(parentItem)) {
          const itemId = this.getItemId(parentItem);
          console.log('展开父项目:', parentItem.title, 'ID:', itemId, '层级:', i);

          // 使用Vue.set确保响应式更新
          this.$set(this.expandedItems, itemId, true);
        }
      }

      console.log('展开完成，当前展开项目:', Object.keys(this.expandedItems));

      // 使用nextTick等待DOM更新
      this.$nextTick(() => {
        this.scrollToActiveItem(item);
      });
    },

    /**
     * 滚动到激活的目录项
     */
    scrollToActiveItem(targetItem) {
      try {
        const itemId = this.getItemId(targetItem);
        console.log('查找目录项元素，ID:', itemId);

        // 使用更安全的方式查找元素：遍历所有元素而不是使用CSS选择器
        const container = this.$el.querySelector('.pdf-outline__list');
        if (!container) {
          console.log('未找到目录容器');
          return;
        }

        // 查找所有带有data-item-id属性的元素
        const allItems = container.querySelectorAll('[data-item-id]');
        let itemElement = null;

        for (const element of allItems) {
          if (element.getAttribute('data-item-id') === itemId) {
            itemElement = element;
            break;
          }
        }

        if (itemElement) {
          console.log('找到目标元素，开始滚动');
          // 计算滚动位置，让目标元素在容器中央
          const containerRect = container.getBoundingClientRect();
          const itemRect = itemElement.getBoundingClientRect();
          const scrollTop = container.scrollTop;

          const targetScrollTop = scrollTop + (itemRect.top - containerRect.top) - (containerRect.height / 2) + (itemRect.height / 2);

          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        } else {
          console.log('未找到目标元素，ID:', itemId);
        }
      } catch (error) {
        console.error('滚动到激活项目失败:', error);
      }
    },

    /**
     * 切换全部展开/收起
     */
    toggleAllItems() {
      console.log('切换全部展开/收起，当前状态:', this.allExpanded);
      if (this.allExpanded) {
        this.collapseAllItems();
      } else {
        this.expandAllItems();
      }
      this.allExpanded = !this.allExpanded;
      console.log('切换后状态:', this.allExpanded, '展开项目:', this.expandedItems);
    },

    /**
     * 展开所有项目
     */
    expandAllItems() {
      this.expandedItems = {};
      this.addAllItemsToExpanded(this.outline);
    },

    /**
     * 收起所有项目
     */
    collapseAllItems() {
      this.expandedItems = {};
    },

    /**
     * 递归添加所有项目到展开列表
     */
    addAllItemsToExpanded(items) {
      for (const item of items) {
        if (this.hasNestedChildren(item)) {
          const itemId = this.getItemId(item);
          this.$set(this.expandedItems, itemId, true);
          this.addAllItemsToExpanded(item.items);
        }
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-outline {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #969799;
  }

  &__loading-text {
    margin-left: 8px;
    font-size: 14px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #c8c9cc;
  }

  &__empty-text {
    margin-top: 8px;
    font-size: 14px;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #ebedf0;
    background: #fafafa;
  }

  &__title {
    font-size: 16px;
    font-weight: 500;
    color: #323233;
  }

  &__toggle-all {
    font-size: 12px;
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
}
</style>
