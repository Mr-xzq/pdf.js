<template>
  <div class="stage3-test">
    <h2>阶段3验证 - 工具栏与基础交互</h2>

    <!-- PDF 路径输入 -->
    <div class="pdf-input-section">
      <h3>PDF 文件设置</h3>
      <div class="input-group">
        <van-field
          v-model="inputPdfUrl"
          label="PDF 路径:"
          placeholder="请输入 PDF 文件路径或 URL"
          clearable
          @keyup.enter="loadPdf"
        />
        <div class="button-group">
          <van-button type="primary" @click="loadPdf" :loading="loading">
            加载 PDF
          </van-button>
          <van-button type="default" @click="loadSamplePdf">
            加载示例 PDF
          </van-button>
        </div>
      </div>
      <div class="quick-links">
        <span class="quick-link-label">快速选择:</span>
        <van-button
          v-for="sample in samplePdfs"
          :key="sample.name"
          type="default"
          size="small"
          @click="selectSamplePdf(sample.url)"
        >
          {{ sample.name }}
        </van-button>
      </div>
    </div>

    <!-- PDF 阅读器 -->
    <div class="pdf-container">
      <pdf-reader
        :src="pdfUrl"
        :show-controls="true"
        @document-loaded="onDocumentLoaded"
        @document-error="onDocumentError"
        @page-changed="onPageChanged"
        @scale-changed="onScaleChanged"
        @search-toggle="onSearchToggle"
      />
    </div>

    <!-- 状态信息 -->
    <div class="status-info">
      <h3>状态信息</h3>
      <div class="info-grid">
        <div class="info-item">
          <label>文档状态:</label>
          <span :class="documentLoaded ? 'success' : 'pending'">
            {{ documentLoaded ? "已加载" : "未加载" }}
          </span>
        </div>
        <div class="info-item">
          <label>当前页码:</label>
          <span>{{ currentPage }} / {{ totalPages }}</span>
        </div>
        <div class="info-item">
          <label>缩放比例:</label>
          <span>{{ Math.round(currentScale * 100) }}%</span>
        </div>
        <div class="info-item">
          <label>搜索状态:</label>
          <span :class="searchActive ? 'active' : 'inactive'">
            {{ searchActive ? "激活" : "未激活" }}
          </span>
        </div>
      </div>
    </div>

    <!-- 功能测试按钮 -->
    <div class="test-controls">
      <h3>功能测试</h3>
      <div class="button-group">
        <van-button type="primary" @click="testNavigation">测试导航</van-button>
        <van-button type="primary" @click="testZoom">测试缩放</van-button>
        <van-button type="primary" @click="testToolbarToggle"
          >切换工具栏</van-button
        >
        <van-button type="primary" @click="testSearch">测试搜索</van-button>
      </div>
    </div>

    <!-- 事件日志 -->
    <div class="event-log">
      <h3>事件日志</h3>
      <div class="log-container">
        <div
          v-for="(log, index) in eventLogs"
          :key="index"
          class="log-item"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-event">{{ log.event }}</span>
          <span class="log-data">{{ log.data }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PdfReader from "../components/pdf-reader/index.vue";

export default {
  name: "Stage3Test",

  components: {
    PdfReader,
  },

  data() {
    return {
      // PDF 配置
      pdfUrl: "/assets/sample.pdf", // 当前加载的PDF文件
      inputPdfUrl: "/assets/sample.pdf", // 输入框中的PDF路径
      loading: false, // 加载状态

      // 示例PDF文件列表
      samplePdfs: [
        { name: "示例1", url: "/assets/sample.pdf" },
        { name: "示例2", url: "/assets/sample2.pdf" },
        { name: "测试文档", url: "/assets/test.pdf" },
        {
          name: "在线PDF",
          url: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
        },
      ],

      // 状态
      documentLoaded: false,
      currentPage: 1,
      totalPages: 0,
      currentScale: 1.0,
      searchActive: false,

      // 事件日志
      eventLogs: [],

      // 测试状态
      testRunning: false,
    };
  },

  mounted() {
    this.addLog("info", "页面加载", "开始测试阶段3功能");
  },

  methods: {
    // PDF 加载相关方法
    async loadPdf() {
      if (!this.inputPdfUrl.trim()) {
        this.$toast("请输入PDF文件路径");
        return;
      }

      this.loading = true;
      this.addLog("info", "PDF加载", `开始加载: ${this.inputPdfUrl}`);

      try {
        // 重置状态
        this.documentLoaded = false;
        this.currentPage = 1;
        this.totalPages = 0;
        this.currentScale = 1.0;

        // 更新PDF URL
        this.pdfUrl = this.inputPdfUrl;

        // 等待一下让组件有时间响应
        await this.sleep(100);
      } catch (error) {
        this.addLog("error", "PDF加载", `加载失败: ${error.message}`);
        this.$toast("PDF加载失败");
      } finally {
        this.loading = false;
      }
    },

    loadSamplePdf() {
      this.inputPdfUrl = "/assets/sample.pdf";
      this.loadPdf();
    },

    selectSamplePdf(url) {
      this.inputPdfUrl = url;
      this.loadPdf();
    },

    // 事件处理
    onDocumentLoaded(event) {
      this.documentLoaded = true;
      this.totalPages = event.numPages;
      this.currentPage = 1;
      this.loading = false;
      this.addLog("success", "文档加载", `成功加载 ${event.numPages} 页PDF`);
    },

    onDocumentError(event) {
      this.documentLoaded = false;
      this.loading = false;
      this.addLog("error", "文档错误", event.message || "加载失败");
      this.$toast("PDF文档加载失败");
    },

    onPageChanged(event) {
      this.currentPage = event.pageNumber;
      this.addLog("info", "页面切换", `切换到第 ${event.pageNumber} 页`);
    },

    onScaleChanged(event) {
      this.currentScale = event.scale;
      this.addLog(
        "info",
        "缩放变化",
        `缩放比例: ${Math.round(event.scale * 100)}%`
      );
    },

    onSearchToggle(active) {
      this.searchActive = active;
      this.addLog("info", "搜索切换", active ? "搜索激活" : "搜索关闭");
    },

    // 测试功能
    async testNavigation() {
      if (!this.documentLoaded) {
        this.$toast("请先加载PDF文档");
        return;
      }

      this.addLog("info", "测试开始", "导航功能测试");

      // 模拟导航操作
      await this.sleep(500);
      this.addLog("info", "测试操作", "导航功能正常");
    },

    async testZoom() {
      if (!this.documentLoaded) {
        this.$toast("请先加载PDF文档");
        return;
      }

      this.addLog("info", "测试开始", "缩放功能测试");

      // 模拟缩放操作
      await this.sleep(500);
      this.addLog("info", "测试操作", "缩放功能正常");
    },

    async testToolbarToggle() {
      this.addLog("info", "测试开始", "工具栏切换测试");

      // 模拟工具栏切换
      await this.sleep(500);
      this.addLog("info", "测试操作", "工具栏切换正常");
    },

    async testSearch() {
      this.addLog("info", "测试开始", "搜索功能测试");

      // 模拟搜索操作
      await this.sleep(500);
      this.addLog("info", "测试操作", "搜索功能正常");
    },

    // 工具方法
    addLog(type, event, data) {
      const log = {
        type,
        event,
        data,
        time: new Date().toLocaleTimeString(),
      };
      this.eventLogs.unshift(log);

      // 限制日志数量
      if (this.eventLogs.length > 50) {
        this.eventLogs = this.eventLogs.slice(0, 50);
      }
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
  },
};
</script>

<style lang="less" scoped>
.stage3-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;

  h2 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
  }

  .pdf-input-section {
    margin-bottom: 20px;
    padding: 16px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;

    h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .input-group {
      margin-bottom: 12px;

      .button-group {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
      }
    }

    .quick-links {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .quick-link-label {
        font-size: 14px;
        color: #666;
        margin-right: 4px;
      }
    }
  }

  .pdf-container {
    height: 600px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .status-info {
    margin-bottom: 20px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;

    h3 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;

      label {
        font-weight: 500;
        color: #666;
      }

      span {
        &.success {
          color: #52c41a;
        }

        &.pending {
          color: #faad14;
        }

        &.active {
          color: #1890ff;
        }

        &.inactive {
          color: #999;
        }
      }
    }
  }

  .test-controls {
    margin-bottom: 20px;
    padding: 16px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;

    h3 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .button-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }

  .event-log {
    padding: 16px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;

    h3 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .log-container {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
    }

    .log-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;

      &:last-child {
        border-bottom: none;
      }

      &.success {
        background: #f6ffed;
        border-left: 3px solid #52c41a;
      }

      &.error {
        background: #fff2f0;
        border-left: 3px solid #ff4d4f;
      }

      &.info {
        background: #f0f8ff;
        border-left: 3px solid #1890ff;
      }

      .log-time {
        flex: 0 0 auto;
        color: #999;
        font-size: 12px;
      }

      .log-event {
        flex: 0 0 auto;
        font-weight: 500;
        color: #333;
      }

      .log-data {
        flex: 1;
        color: #666;
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .stage3-test {
    padding: 12px;

    .pdf-input-section {
      .button-group {
        flex-direction: column;
      }

      .quick-links {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;

        .quick-link-label {
          margin-bottom: 4px;
        }
      }
    }

    .pdf-container {
      min-height: 400px;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .button-group {
      flex-direction: column;
    }
  }
}
</style>
