<template>
  <div class="stage4-test">
    <h2>阶段4验证 - 功能组件实现</h2>
    
    <div class="test-container">
      <!-- 侧边栏 -->
      <pdf-sidebar
        ref="sidebar"
        :visible="sidebarVisible"
        :default-tab="sidebarTab"
        @close="onSidebarClose"
        @navigate-to-page="onNavigateToPage"
        @tab-change="onTabChange"
        class="test-sidebar"
      />

      <!-- 主内容区 -->
      <div class="test-main">
        <!-- 控制面板 -->
        <div class="test-controls">
          <van-button
            type="primary"
            size="small"
            @click="toggleSidebarDisplay"
          >
            {{ sidebarVisible ? '隐藏侧边栏' : '显示侧边栏' }}
          </van-button>

          <van-button
            type="default"
            size="small"
            @click="switchToThumbnails"
          >
            切换到缩略图
          </van-button>

          <van-button
            type="default"
            size="small"
            @click="switchToOutline"
          >
            切换到目录
          </van-button>

          <van-button
            type="default"
            size="small"
            @click="testExpandAll"
          >
            测试展开全部
          </van-button>

          <van-button
            type="default"
            size="small"
            @click="debugOutlineExpansion"
          >
            调试目录展开
          </van-button>

          <div style="margin-top: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              当前页: {{ currentPage }} / {{ totalPages || '加载中...' }}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <van-field
                v-model="testPageNumber"
                type="number"
                placeholder="输入页码"
                style="width: 100px;"
                :min="1"
                :max="totalPages"
              />
              <van-button
                type="primary"
                size="small"
                @click="testGoToPage"
                :disabled="!totalPages"
              >
                前往
              </van-button>
            </div>
            <div style="display: flex; gap: 4px; margin-top: 4px;">
              <van-button
                type="default"
                size="mini"
                @click="setTestPage(1)"
                :disabled="!totalPages"
              >
                首页
              </van-button>
              <van-button
                type="default"
                size="mini"
                @click="setTestPage(Math.ceil(totalPages / 2))"
                :disabled="!totalPages"
              >
                中间页
              </van-button>
              <van-button
                type="default"
                size="mini"
                @click="setTestPage(totalPages)"
                :disabled="!totalPages"
              >
                末页
              </van-button>
            </div>
          </div>

          <van-field
            v-model="pdfUrl"
            label="PDF地址"
            placeholder="输入PDF文件URL"
            @blur="loadPdf"
          />

          <div class="current-page">
            当前页: {{ currentPage }} / {{ totalPages }}
          </div>
        </div>

        <!-- PDF查看器 -->
        <div class="test-viewer">
          <pdf-viewer
            v-if="pdfUrl"
            :src="pdfUrl"
            :show-controls="true"
            @document-loaded="onDocumentLoaded"
            @page-changed="onPageChanged"
            @error="onError"
          />
          <div v-else class="no-pdf">
            请输入PDF文件URL并按回车加载
          </div>
        </div>
      </div>
    </div>

    <!-- 独立功能组件测试 -->
    <div class="standalone-tests">
      <h3>独立组件测试</h3>
      
      <div class="test-grid">
        <!-- 独立目录组件 -->
        <div class="test-item">
          <h4>独立目录组件</h4>
          <div class="component-container">
            <pdf-outline
              @navigate-to-page="onNavigateToPage"
              @error="onError"
            />
          </div>
        </div>

        <!-- 独立缩略图组件 -->
        <div class="test-item">
          <h4>独立缩略图组件</h4>
          <div class="component-container">
            <pdf-thumbnail
              :thumbnail-size="100"
              @navigate-to-page="onNavigateToPage"
              @error="onError"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <van-dialog
      v-model="showErrorDialog"
      title="错误"
      :message="errorMessage"
      show-cancel-button
      @confirm="closeErrorDialog"
      @cancel="closeErrorDialog"
    />
  </div>
</template>

<script>
import PdfViewer from '../components/pdf-reader/components/PdfViewer.vue';
import PdfSidebar from '../components/pdf-reader/components/ui/PdfSidebar.vue';
import PdfOutline from '../components/pdf-reader/components/ui/PdfOutline.vue';
import PdfThumbnail from '../components/pdf-reader/components/ui/PdfThumbnail.vue';
import {
  mapDocumentState,
  mapViewerState,
  mapDocumentActions,
  mapViewerActions,
  mapDocumentGetters,
  mapViewerGetters
} from '../components/pdf-reader/store/index.js';

export default {
  name: 'Stage4Test',

  components: {
    PdfViewer,
    PdfSidebar,
    PdfOutline,
    PdfThumbnail
  },

  data() {
    return {
      // 仅保留组件特有的临时状态
      pdfUrl: '/assets/sample.pdf', // 默认测试PDF

      // 测试页码输入
      testPageNumber: 1,

      // UI状态本地管理
      showSidebar: false,
      sidebarMode: 'thumbnails',
      errorMessage: null,
      showErrorDialog: false
    };
  },

  computed: {
    // 映射Vuex状态 - 只保留核心状态
    ...mapDocumentState(['pdfDocument', 'loading', 'error']),
    ...mapViewerState(['currentPage']),

    // 映射Vuex getters
    ...mapDocumentGetters(['totalPages']),

    // 为了兼容模板，提供别名
    sidebarVisible() {
      return this.showSidebar;
    },

    sidebarTab() {
      return this.sidebarMode;
    },

    hasError() {
      return !!this.error || !!this.errorMessage;
    }
  },

  mounted() {
    // 自动加载默认PDF
    if (this.pdfUrl) {
      this.loadPdf();
    }
  },

  methods: {
    // 映射Vuex actions - 只保留核心状态管理
    ...mapDocumentActions(['loadDocument']),
    ...mapViewerActions(['goToPage']),

    /**
     * 加载PDF文档
     */
    async loadPdf() {
      if (!this.pdfUrl) return;

      try {
        // 使用Vuex action加载文档
        await this.loadDocument(this.pdfUrl);
        console.log('PDF文档加载完成');
      } catch (error) {
        this.onError(error);
      }
    },

    /**
     * 文档加载完成
     */
    onDocumentLoaded(document) {
      console.log('文档加载完成:', document);
    },

    /**
     * 页面变化
     */
    onPageChanged(pageNumber) {
      console.log('页面变化:', pageNumber);
    },

    /**
     * 导航到指定页面
     */
    onNavigateToPage(pageNumber) {
      // 使用Vuex action跳转页面
      this.goToPage(pageNumber);
      console.log('导航到页面:', pageNumber);
    },

    /**
     * 切换侧边栏显示 - UI状态本地管理
     */
    toggleSidebarDisplay() {
      this.showSidebar = !this.showSidebar;
    },

    /**
     * 显示错误 - UI状态本地管理
     */
    showError(message) {
      this.errorMessage = message;
      this.showErrorDialog = true;
    },

    /**
     * 清除错误 - UI状态本地管理
     */
    clearError() {
      this.errorMessage = null;
      this.showErrorDialog = false;
    },

    /**
     * 关闭侧边栏 - 使用Vuex action
     */
    onSidebarClose() {
      this.toggleSidebar(); // 如果已显示则关闭
    },

    /**
     * 标签页变化 - 使用Vuex action切换模式
     */
    onTabChange(tabKey) {
      this.toggleSidebar(tabKey);
      console.log('标签页变化:', tabKey);
    },

    /**
     * 切换到缩略图 - 使用Vuex action
     */
    switchToThumbnails() {
      this.toggleSidebar('thumbs');
    },

    /**
     * 切换到目录 - 使用Vuex action
     */
    switchToOutline() {
      this.toggleSidebar('outline');
    },

    /**
     * 错误处理 - 使用Vuex action
     */
    onError(error) {
      console.error('PDF错误:', error);
      this.showError({
        message: error.message || error.toString(),
        details: error.stack
      });
    },

    /**
     * 关闭错误对话框 - 使用Vuex action
     */
    closeErrorDialog() {
      this.clearError();
    },

    /**
     * 测试展开全部目录
     */
    testExpandAll() {
      // 通过ref访问侧边栏中的目录组件
      const sidebar = this.$refs.sidebar || this.$children.find(child => child.$options.name === 'PdfSidebar');
      if (sidebar) {
        console.log('找到侧边栏组件:', sidebar);
        // 尝试找到目录组件
        const outlineComponent = sidebar.$children.find(child => child.$options.name === 'PdfOutline');
        if (outlineComponent) {
          console.log('找到目录组件，触发展开全部');
          outlineComponent.toggleAllItems();
        } else {
          console.log('未找到目录组件');
        }
      } else {
        console.log('未找到侧边栏组件');
      }
    },

    /**
     * 测试跳转到指定页面
     */
    testGoToPage() {
      const pageNumber = parseInt(this.testPageNumber);

      if (!pageNumber || pageNumber < 1) {
        this.$toast('请输入有效的页码');
        return;
      }

      if (this.totalPages && pageNumber > this.totalPages) {
        this.$toast(`页码不能超过总页数 ${this.totalPages}`);
        return;
      }

      console.log('测试跳转到第', pageNumber, '页');
      this.goToPage(pageNumber);
    },

    /**
     * 设置测试页码
     */
    setTestPage(pageNumber) {
      if (pageNumber && pageNumber >= 1 && pageNumber <= this.totalPages) {
        this.testPageNumber = pageNumber;
      }
    },

    /**
     * 调试目录展开功能
     */
    debugOutlineExpansion() {
      const sidebar = this.$refs.sidebar;
      if (sidebar) {
        // 尝试找到目录组件
        const outlineComponent = sidebar.$children.find(child => child.$options.name === 'PdfOutline');
        if (outlineComponent) {
          console.log('=== 目录展开调试信息 ===');
          console.log('当前页面:', this.currentPage);
          console.log('总页数:', this.totalPages);
          console.log('页面映射关系:', outlineComponent.pageToOutlineMap);
          console.log('目录层级关系:', outlineComponent.outlineHierarchy);
          console.log('展开项目:', outlineComponent.expandedItems);

          // 显示当前页面的映射信息
          const mapping = outlineComponent.pageToOutlineMap[this.currentPage];
          if (mapping) {
            console.log('当前页面映射到:', mapping.item.title, '路径:', mapping.path.map(p => p.title));
          } else {
            console.log('当前页面没有找到映射关系');
          }

          // 手动触发展开到当前页面
          outlineComponent.expandToCurrentPage(this.currentPage);
        } else {
          console.log('未找到目录组件');
        }
      } else {
        console.log('未找到侧边栏组件');
      }
    }
  }
};
</script>

<style lang="less" scoped>
.stage4-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;

  h2 {
    color: #323233;
    margin-bottom: 20px;
  }
}

.test-container {
  display: flex;
  height: 600px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 30px;
}

.test-sidebar {
  flex-shrink: 0;
}

.test-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.test-controls {
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
  background: #fafafa;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .van-field {
    flex: 1;
    min-width: 200px;
  }

  .current-page {
    font-size: 14px;
    color: #646566;
    white-space: nowrap;
  }
}

.test-viewer {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.no-pdf {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #969799;
  font-size: 16px;
}

.standalone-tests {
  h3 {
    color: #323233;
    margin-bottom: 16px;
  }
}

.test-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.test-item {
  border: 1px solid #ebedf0;
  border-radius: 8px;
  overflow: hidden;

  h4 {
    padding: 12px 16px;
    margin: 0;
    background: #fafafa;
    border-bottom: 1px solid #ebedf0;
    color: #323233;
    font-size: 14px;
  }
}

.component-container {
  height: 300px;
  overflow: hidden;
}

// 移动端适配
@media (max-width: 768px) {
  .test-container {
    flex-direction: column;
    height: auto;
  }

  .test-grid {
    grid-template-columns: 1fr;
  }

  .test-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
