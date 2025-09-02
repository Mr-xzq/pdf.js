<template>
  <div
    class="pdf-sidebar"
    :class="{
      'pdf-sidebar--visible': visible,
      'pdf-sidebar--mobile': isMobile,
    }"
  >
    <!-- 侧边栏头部 -->
    <div class="pdf-sidebar__header">
      <!-- 标签切换 -->
      <van-tabs
        :value="activeTab"
        class="pdf-sidebar__tabs"
        :swipeable="false"
        :animated="false"
        @change="onTabChange"
      >
        <van-tab
          v-for="tab in availableTabs"
          :key="tab.key"
          :name="tab.key"
          :title="tab.title"
        >
          <van-icon :name="tab.icon" size="16px" />
        </van-tab>
      </van-tabs>

      <!-- 关闭按钮 -->
      <van-button
        type="default"
        size="mini"
        icon="cross"
        plain
        @click="onClose"
        class="pdf-sidebar__close"
      />
    </div>

    <!-- 侧边栏内容 -->
    <div class="pdf-sidebar__content">
      <!-- 缩略图面板 -->
      <div v-show="activeTab === 'thumbnails'" class="pdf-sidebar__panel">
        <pdf-thumbnail
          :thumbnail-size="thumbnailSize"
          @navigate-to-page="onNavigateToPage"
          @page-click="onPageClick"
          @error="onError"
        />
      </div>

      <!-- 目录面板 -->
      <div v-show="activeTab === 'outline'" class="pdf-sidebar__panel">
        <pdf-outline
          :auto-expand-to-current="true"
          @navigate-to-page="onNavigateToPage"
          @navigate-to-url="onNavigateToUrl"
          @item-click="onOutlineItemClick"
          @error="onError"
        />
      </div>

      <!-- 书签面板（预留） -->
      <div v-show="activeTab === 'bookmarks'" class="pdf-sidebar__panel">
        <div class="pdf-sidebar__placeholder">
          <van-icon name="bookmark-o" size="24px" color="#c8c9cc" />
          <span class="pdf-sidebar__placeholder-text">书签功能开发中...</span>
        </div>
      </div>

      <!-- 搜索面板（预留） -->
      <div v-show="activeTab === 'search'" class="pdf-sidebar__panel">
        <div class="pdf-sidebar__placeholder">
          <van-icon name="search" size="24px" color="#c8c9cc" />
          <span class="pdf-sidebar__placeholder-text">搜索功能开发中...</span>
        </div>
      </div>
    </div>

    <!-- 移动端遮罩 -->
    <div
      v-if="isMobile && visible"
      class="pdf-sidebar__overlay"
      @click="onClose"
      @touchmove.prevent
    ></div>
  </div>
</template>

<script>
import PdfThumbnail from "./PdfThumbnail.vue";
import PdfOutline from "./PdfOutline.vue";
import {
  mapDocumentState,
  mapViewerState,
  mapSidebarState,
  mapSidebarGetters,
  mapSidebarActions,
} from "../store/index.js";

export default {
  name: "PdfSidebar",

  components: {
    PdfThumbnail,
    PdfOutline,
  },

  props: {
    // 是否显示
    visible: {
      type: Boolean,
      default: false,
    },
    // 默认激活的标签
    defaultTab: {
      type: String,
      default: "thumbnails",
    },
    // 缩略图尺寸（简化配置）
    thumbnailSize: {
      type: Number,
      default: 120,
    },
  },

  data() {
    return {
      // 本地状态已移至全局管理，这里只保留临时状态
    };
  },

  computed: {
    // Vuex 状态映射 - 包含侧边栏状态
    ...mapDocumentState(["pdfDocument"]),
    ...mapViewerState(["currentPage"]),
    ...mapSidebarState(["activeTab", "isMobile"]),
    ...mapSidebarGetters(["enabledTabs", "currentTab"]),

    // 可用的标签页（从全局状态获取）
    availableTabs() {
      return this.enabledTabs;
    },
  },

  watch: {
    // 监听默认标签变化
    defaultTab(newTab) {
      // 使用全局状态管理
      if (typeof this.switchToTab === "function") {
        this.switchToTab(newTab);
      } else if (this.$store) {
        this.$store.dispatch("pdfReader/sidebar/switchToTab", newTab);
      }
    },

    // 监听侧边栏显示状态，处理滚动穿透
    visible(newVisible) {
      this.$nextTick(() => {
        if (newVisible) {
          this.preventScrollThrough();
        } else {
          this.restoreScrollThrough();
        }
      });
    },
  },

  mounted() {
    // 如果侧边栏默认显示，则防止滚动穿透
    if (this.visible) {
      this.$nextTick(() => {
        this.preventScrollThrough();
      });
    }
  },

  beforeDestroy() {
    // 组件销毁时恢复滚动
    this.restoreScrollThrough();
  },

  methods: {
    // 映射全局状态管理actions
    ...mapSidebarActions(["switchToTab", "hide"]),

    /**
     * 处理标签切换 - 使用全局状态管理
     */
    onTabChange(tabKey) {
      console.log("PdfSidebar.onTabChange 被调用，参数:", tabKey);
      console.log("switchToTab 方法存在:", typeof this.switchToTab);

      if (typeof this.switchToTab === "function") {
        this.switchToTab(tabKey);
      } else {
        // 备用方案：直接调用 store
        if (this.$store) {
          this.$store.dispatch("pdfReader/sidebar/switchToTab", tabKey);
        }
      }

      this.$emit("tab-change", tabKey);
    },

    /**
     * 处理关闭 - 使用全局状态管理
     */
    onClose() {
      console.log("PdfSidebar.onClose 被调用");

      if (typeof this.hide === "function") {
        this.hide();
      } else {
        // 备用方案：直接调用 store
        if (this.$store) {
          this.$store.dispatch("pdfReader/sidebar/hide");
        }
      }

      this.$emit("close");
    },

    /**
     * 处理页面导航
     */
    onNavigateToPage(pageNumber) {
      this.$emit("navigate-to-page", pageNumber);
    },

    /**
     * 处理URL导航
     */
    onNavigateToUrl(url) {
      this.$emit("navigate-to-url", url);
    },

    /**
     * 处理页面点击
     */
    onPageClick(pageNumber) {
      this.$emit("page-click", pageNumber);
    },

    /**
     * 处理目录项点击
     */
    onOutlineItemClick(item) {
      this.$emit("outline-item-click", item);
    },

    /**
     * 处理错误
     */
    onError(error) {
      this.$emit("error", error);
    },

    /**
     * 获取当前标签信息
     */
    getCurrentTab() {
      return this.currentTab;
    },

    /**
     * 防止滚动穿透 - 简化版本
     */
    preventScrollThrough() {
      // 在移动端，当侧边栏显示时禁用 body 滚动
      if (this.isMobile && document.body) {
        document.body.classList.add("sidebar-open");
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
      }
    },

    /**
     * 恢复滚动穿透 - 简化版本
     */
    restoreScrollThrough() {
      // 恢复 body 滚动
      if (document.body) {
        document.body.classList.remove("sidebar-open");
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.height = "";
      }
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-sidebar {
  position: relative;
  width: 280px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #ebedf0;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  /* 防止滚动穿透 */
  overscroll-behavior: contain;
  touch-action: pan-y;

  &--visible {
    transform: translateX(0);
  }

  &--mobile {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  &__header {
    display: flex;
    align-items: center;
    padding: 8px 12px 0 12px;
    border-bottom: 1px solid #ebedf0;
    background: #fafafa;
  }

  &__tabs {
    flex: 1;

    :deep(.van-tabs__nav) {
      background: transparent;
    }

    :deep(.van-tab) {
      font-size: 12px;
      padding: 8px 12px;
    }

    :deep(.van-tab__text) {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__close {
    margin-left: 8px;
  }

  &__content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  &__panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
    /* 防止滚动穿透 */
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #c8c9cc;
    padding: 40px 20px;
  }

  &__placeholder-text {
    margin-top: 8px;
    font-size: 14px;
  }

  &__overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
    /* 防止滚动穿透 */
    touch-action: none;
    overscroll-behavior: contain;
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-sidebar {
    width: 100vw;
    max-width: 320px;
  }
}

/* 全局样式：防止滚动穿透 */
:global(body.sidebar-open) {
  overflow: hidden !important;
  position: fixed !important;
  width: 100% !important;
  height: 100% !important;
  touch-action: none !important;
}
</style>

