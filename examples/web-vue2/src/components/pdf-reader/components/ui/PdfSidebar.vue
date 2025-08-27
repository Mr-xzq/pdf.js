<template>
  <div 
    class="pdf-sidebar"
    :class="{
      'pdf-sidebar--visible': visible,
      'pdf-sidebar--mobile': isMobile
    }"
  >
    <!-- 侧边栏头部 -->
    <div class="pdf-sidebar__header">
      <!-- 标签切换 -->
      <van-tabs 
        v-model="activeTab"
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
      <div 
        v-show="activeTab === 'thumbnails'"
        class="pdf-sidebar__panel"
      >
        <pdf-thumbnail
          :thumbnail-size="thumbnailSize"
          @navigate-to-page="onNavigateToPage"
          @page-click="onPageClick"
          @error="onError"
        />
      </div>

      <!-- 目录面板 -->
      <div 
        v-show="activeTab === 'outline'"
        class="pdf-sidebar__panel"
      >
        <pdf-outline
          :auto-expand-to-current="true"
          @navigate-to-page="onNavigateToPage"
          @navigate-to-url="onNavigateToUrl"
          @item-click="onOutlineItemClick"
          @error="onError"
        />
      </div>

      <!-- 书签面板（预留） -->
      <div 
        v-show="activeTab === 'bookmarks'"
        class="pdf-sidebar__panel"
      >
        <div class="pdf-sidebar__placeholder">
          <van-icon name="bookmark-o" size="24px" color="#c8c9cc" />
          <span class="pdf-sidebar__placeholder-text">书签功能开发中...</span>
        </div>
      </div>

      <!-- 搜索面板（预留） -->
      <div 
        v-show="activeTab === 'search'"
        class="pdf-sidebar__panel"
      >
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
    ></div>
  </div>
</template>

<script>
import PdfThumbnail from './PdfThumbnail.vue';
import PdfOutline from './PdfOutline.vue';
import { mapDocumentState, mapViewerState } from '../../store/index.js';

export default {
  name: 'PdfSidebar',

  components: {
    PdfThumbnail,
    PdfOutline
  },

  props: {
    // 是否显示
    visible: {
      type: Boolean,
      default: false
    },
    // 默认激活的标签
    defaultTab: {
      type: String,
      default: 'thumbnails'
    },
    // 缩略图尺寸（简化配置）
    thumbnailSize: {
      type: Number,
      default: 120
    }
  },

  data() {
    return {
      // UI状态本地管理
      activeTab: this.defaultTab,

      // MVP版本：只保留核心标签页
      allTabs: [
        {
          key: 'thumbnails',
          title: '缩略图',
          icon: 'photo-o'
        },
        {
          key: 'outline',
          title: '目录',
          icon: 'notes-o'
        }
      ]
    };
  },

  computed: {
    // 可用的标签页（MVP版本：直接返回所有标签）
    availableTabs() {
      return this.allTabs;
    },

    // 是否为移动端（简化检测）
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // Vuex 状态映射 - 只保留核心状态
    ...mapDocumentState(['pdfDocument']),
    ...mapViewerState(['currentPage'])
  },

  watch: {
    // 监听默认标签变化
    defaultTab(newTab) {
      // MVP版本：所有标签都可用，直接切换
      this.activeTab = newTab;
    },

    // 监听可见性变化
    visible(newVisible) {
      if (newVisible && !this.allTabs.find(tab => tab.key === this.activeTab)) {
        // 如果当前标签不存在，切换到第一个标签
        const firstAvailableTab = this.allTabs[0]?.key || 'thumbnails';
        this.activeTab = firstAvailableTab;
      }
    }
  },

  methods: {
    // UI状态本地管理，不再需要Vuex actions

    /**
     * 处理标签切换 - UI状态本地管理
     */
    onTabChange(tabKey) {
      this.activeTab = tabKey;
      this.$emit('tab-change', tabKey);
    },

    /**
     * 处理关闭 - 通过事件通知父组件
     */
    onClose() {
      this.$emit('close');
    },

    /**
     * 处理页面导航
     */
    onNavigateToPage(pageNumber) {
      this.$emit('navigate-to-page', pageNumber);
    },

    /**
     * 处理URL导航
     */
    onNavigateToUrl(url) {
      this.$emit('navigate-to-url', url);
    },

    /**
     * 处理页面点击
     */
    onPageClick(pageNumber) {
      this.$emit('page-click', pageNumber);
    },

    /**
     * 处理目录项点击
     */
    onOutlineItemClick(item) {
      this.$emit('outline-item-click', item);
    },

    /**
     * 处理错误
     */
    onError(error) {
      this.$emit('error', error);
    },

    /**
     * 切换到指定标签 - UI状态本地管理
     */
    switchToTab(tabKey) {
      // MVP版本：所有标签都可用，直接切换
      if (this.allTabs.find(tab => tab.key === tabKey)) {
        this.activeTab = tabKey;
      }
    },

    /**
     * 获取当前标签信息
     */
    getCurrentTab() {
      return this.allTabs.find(tab => tab.key === this.activeTab);
    }
  }
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
    overflow: hidden;
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
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-sidebar {
    width: 100vw;
    max-width: 320px;
  }
}
</style>
