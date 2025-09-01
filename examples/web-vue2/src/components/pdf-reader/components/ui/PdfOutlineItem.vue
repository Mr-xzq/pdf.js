<template>
  <div class="pdf-outline-item">
    <!-- 目录项内容 -->
    <div
      class="pdf-outline-item__content"
      :class="{
        'pdf-outline-item__content--active': isActive,
        'pdf-outline-item__content--has-children': hasChildren,
      }"
      :style="{ paddingLeft: `${level * 16 + 16}px` }"
      :data-item-id="getItemId()"
      @click="onItemClick"
    >
      <!-- 展开/收起按钮 -->
      <div
        v-if="hasChildren"
        class="pdf-outline-item__toggle"
        @click.stop="onToggleClick"
      >
        <van-icon
          :name="isExpanded ? 'arrow-down' : 'arrow'"
          size="12px"
          :class="{ 'pdf-outline-item__toggle-icon--expanded': isExpanded }"
        />
      </div>
      <div v-else class="pdf-outline-item__toggle-placeholder"></div>

      <!-- 目录项标题 -->
      <div
        class="pdf-outline-item__title"
        :class="{
          'pdf-outline-item__title--bold': item.bold,
          'pdf-outline-item__title--italic': item.italic,
        }"
        :style="titleStyle"
      >
        {{ item.title || "无标题" }}
      </div>

      <!-- 页码指示器 -->
      <div v-if="pageNumber" class="pdf-outline-item__page">
        {{ pageNumber }}
      </div>
    </div>

    <!-- 子项目 -->
    <div v-if="hasChildren && isExpanded" class="pdf-outline-item__children">
      <pdf-outline-item
        v-for="(childItem, index) in item.items"
        :key="`child-${level}-${index}`"
        :item="childItem"
        :item-index="index"
        :level="level + 1"
        :current-page="currentPage"
        :expanded-items="expandedItems"
        :pdf-document="pdfDocument"
        @item-click="onChildItemClick"
        @toggle-expand="onChildToggleExpand"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: "PdfOutlineItem",

  props: {
    // 目录项数据
    item: {
      type: Object,
      required: true,
    },
    // 层级深度
    level: {
      type: Number,
      default: 0,
    },
    // 项目索引
    itemIndex: {
      type: Number,
      default: 0,
    },
    // 当前页码
    currentPage: {
      type: Number,
      default: 1,
    },
    // 展开的项目集合
    expandedItems: {
      type: Object,
      default: () => ({}),
    },
    // PDF文档对象
    pdfDocument: {
      type: Object,
      default: null,
    },
  },

  data() {
    return {
      // 缓存的页码
      cachedPageNumber: null,
    };
  },

  computed: {
    // 是否有子项目
    hasChildren() {
      return this.item.items && this.item.items.length > 0;
    },

    // 是否展开
    isExpanded() {
      if (!this.hasChildren) return false;
      const itemId = this.getItemId();
      return !!this.expandedItems[itemId];
    },

    // 是否为当前激活项
    isActive() {
      // 根据当前页面和目录项的页码判断是否激活
      return this.cachedPageNumber === this.currentPage;
    },

    // 标题样式
    titleStyle() {
      const style = {};

      // 应用颜色
      if (this.item.color && this.item.color.length >= 3) {
        const [r, g, b] = this.item.color;
        style.color = `rgb(${r}, ${g}, ${b})`;
      }

      return style;
    },

    // 页码
    pageNumber() {
      return this.cachedPageNumber;
    },
  },

  watch: {
    // 监听PDF文档变化
    pdfDocument: {
      handler(newDoc, oldDoc) {
        if (newDoc && newDoc !== oldDoc) {
          this.loadPageNumber();
        }
      },
      immediate: true,
    },
  },

  async mounted() {
    // 异步获取页码
    await this.loadPageNumber();
  },

  methods: {
    /**
     * 获取项目唯一ID
     */
    getItemId() {
      // 使用简单的字符串哈希来生成唯一ID，与父组件保持一致
      const str = `${this.item.title || "untitled"}-${JSON.stringify(
        this.item.dest || {}
      )}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 转换为32位整数
      }
      return `outline-item-${Math.abs(hash)}`;
    },

    /**
     * 处理项目点击
     */
    onItemClick() {
      this.$emit("item-click", this.item);
    },

    /**
     * 处理展开/收起点击
     */
    onToggleClick() {
      const newExpanded = !this.isExpanded;
      console.log(
        "点击展开/收起:",
        this.item.title,
        "当前状态:",
        this.isExpanded,
        "新状态:",
        newExpanded
      );
      this.$emit("toggle-expand", this.item, newExpanded);
    },

    /**
     * 处理子项目点击
     */
    onChildItemClick(childItem) {
      this.$emit("item-click", childItem);
    },

    /**
     * 处理子项目展开/收起
     */
    onChildToggleExpand(childItem, expanded) {
      this.$emit("toggle-expand", childItem, expanded);
    },

    /**
     * 加载页码
     */
    async loadPageNumber() {
      if (!this.item.dest) return;

      try {
        // 这里需要从父组件获取PDF文档对象来解析页码
        // 暂时简化处理
        this.cachedPageNumber = await this.getDestinationPageNumber(
          this.item.dest
        );
      } catch (error) {
        console.error("获取目录项页码失败:", error);
      }
    },

    /**
     * 获取目标页码
     */
    async getDestinationPageNumber(dest) {
      if (!this.pdfDocument || !dest) return null;

      try {
        // 解析目标页码
        let pageIndex;

        if (Array.isArray(dest)) {
          // 如果dest是数组，第一个元素通常是页面引用
          const pageRef = dest[0];
          if (typeof pageRef === "object" && pageRef !== null) {
            // 通过页面引用获取页码
            pageIndex = await this.pdfDocument.getPageIndex(pageRef);
          } else if (typeof pageRef === "number") {
            // 直接是页码索引
            pageIndex = pageRef;
          }
        } else if (typeof dest === "string") {
          // 如果是字符串，可能是命名目标
          // 这里需要更复杂的解析逻辑
          return null;
        }

        if (typeof pageIndex === "number") {
          return pageIndex + 1; // 页码从1开始
        }

        return null;
      } catch (error) {
        console.error("解析目标页码失败:", error);
        return null;
      }
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-outline-item {
  &__content {
    display: flex;
    align-items: center;
    padding: 8px 16px 8px 0;
    cursor: pointer;
    transition: background-color 0.2s ease;
    border-radius: 4px;
    margin: 0 8px;

    &:hover {
      background-color: #f5f7fa;
    }

    &--active {
      background-color: #e8f4ff;
      color: #1989fa;
    }

    &--has-children {
      .pdf-outline-item__title {
        font-weight: 500;
      }
    }
  }

  &__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 4px;
    cursor: pointer;
    border-radius: 2px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #ebedf0;
    }

    &-icon--expanded {
      transform: rotate(90deg);
    }
  }

  &__toggle-placeholder {
    width: 20px;
    margin-right: 4px;
  }

  &__title {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
    color: #323233;
    word-break: break-word;

    &--bold {
      font-weight: bold;
    }

    &--italic {
      font-style: italic;
    }
  }

  &__page {
    font-size: 12px;
    color: #969799;
    margin-left: 8px;
    white-space: nowrap;
  }

  &__children {
    // 子项目容器，无需额外样式
  }
}

// 深层嵌套的样式调整
.pdf-outline-item {
  .pdf-outline-item {
    .pdf-outline-item__content {
      margin: 0 4px;
    }
  }
}
</style>
