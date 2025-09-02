<template>
  <div class="stage2-test">
    <div class="test-header">
      <h2>阶段2验证 - 核心查看器实现</h2>
      <div class="test-info">
        <p>测试 PDF 文档的基本加载、显示和页面导航功能</p>
      </div>
    </div>

    <div class="test-controls">
      <div class="control-group">
        <label>PDF 文件:</label>
        <select v-model="selectedPdf" @change="loadSelectedPdf">
          <option value="">请选择测试文件</option>
          <option
            value="
https://mozilla.github.io/pdf.js/legacy/web/compressed.tracemonkey-pldi-09.pdf"
          >
            示例文档
          </option>
        </select>
      </div>

      <div class="control-group">
        <label>自定义 URL:</label>
        <input
          v-model="customUrl"
          type="text"
          placeholder="输入 PDF 文件 URL"
          @keyup.enter="loadCustomPdf"
        />
        <button @click="loadCustomPdf" :disabled="!customUrl">加载</button>
      </div>
    </div>

    <div class="test-status" v-if="statusMessage">
      <div :class="['status-message', statusType]">
        {{ statusMessage }}
      </div>
    </div>

    <div class="pdf-container">
      <pdf-reader
        v-if="currentPdfUrl"
        :src="currentPdfUrl"
        :initial-page="1"
        :initial-scale="1.2"
        :show-controls="true"
        @document-loaded="onDocumentLoaded"
        @document-error="onDocumentError"
        @load-progress="onLoadProgress"
        @page-changed="onPageChanged"
        @scale-changed="onScaleChanged"
        @page-rendered="onPageRendered"
      />
      <div v-else class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-text">请选择或输入 PDF 文件进行测试</div>
      </div>
    </div>

    <div class="test-log">
      <h3>测试日志</h3>
      <div class="log-container">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-item', log.type]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs" class="clear-logs">清除日志</button>
    </div>
  </div>
</template>

<script>
import PdfReader from "@/components/pdf-reader/index.vue";

export default {
  name: "Stage2Test",

  components: {
    PdfReader,
  },

  data() {
    return {
      selectedPdf: "",
      customUrl: "",
      currentPdfUrl: "",
      statusMessage: "",
      statusType: "info", // info, success, error
      logs: [],
    };
  },

  methods: {
    /**
     * 加载选中的 PDF
     */
    loadSelectedPdf() {
      if (this.selectedPdf) {
        this.currentPdfUrl = this.selectedPdf;
        this.customUrl = "";
        this.addLog("info", `开始加载: ${this.selectedPdf}`);
      }
    },

    /**
     * 加载自定义 PDF
     */
    loadCustomPdf() {
      if (this.customUrl) {
        this.currentPdfUrl = this.customUrl;
        this.selectedPdf = "";
        this.addLog("info", `开始加载自定义 URL: ${this.customUrl}`);
      }
    },

    /**
     * 文档加载完成
     */
    onDocumentLoaded(event) {
      this.statusMessage = `文档加载成功！共 ${event.numPages} 页`;
      this.statusType = "success";
      this.addLog(
        "success",
        `文档加载成功: ${event.numPages} 页, 指纹: ${event.fingerprint}`
      );

      // 3秒后清除状态消息
      setTimeout(() => {
        this.statusMessage = "";
      }, 3000);
    },

    /**
     * 文档加载错误
     */
    onDocumentError(event) {
      this.statusMessage = `文档加载失败: ${event.error}`;
      this.statusType = "error";
      this.addLog("error", `文档加载失败: ${event.error}`);
    },

    /**
     * 加载进度
     */
    onLoadProgress(event) {
      this.statusMessage = `加载中... ${event.percentage}%`;
      this.statusType = "info";

      if (event.percentage % 20 === 0) {
        // 每20%记录一次
        this.addLog("info", `加载进度: ${event.percentage}%`);
      }
    },

    /**
     * 页面变化
     */
    onPageChanged(event) {
      this.addLog("info", `页面切换: ${event.previous} → ${event.pageNumber}`);
    },

    /**
     * 缩放变化
     */
    onScaleChanged(event) {
      const percent = Math.round(event.scale * 100);
      this.addLog(
        "info",
        `缩放变化: ${Math.round(event.previous * 100)}% → ${percent}%`
      );
    },

    /**
     * 页面渲染完成
     */
    onPageRendered(event) {
      this.addLog("success", `页面 ${event.pageNumber} 渲染完成`);
    },

    /**
     * 添加日志
     */
    addLog(type, message) {
      const now = new Date();
      const time = now.toLocaleTimeString();

      this.logs.unshift({
        type,
        message,
        time,
        timestamp: now.getTime(),
      });

      // 限制日志数量
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(0, 50);
      }
    },

    /**
     * 清除日志
     */
    clearLogs() {
      this.logs = [];
      this.addLog("info", "日志已清除");
    },
  },

  mounted() {
    this.addLog("info", "阶段2测试页面已加载");
  },
};
</script>

<style lang="less" scoped>
.stage2-test {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.test-header {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;

  h2 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 20px;
  }

  .test-info p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.test-controls {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;

  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;

    label {
      font-size: 14px;
      color: #333;
      white-space: nowrap;
    }

    select,
    input {
      padding: 6px 12px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      font-size: 14px;
      min-width: 200px;

      &:focus {
        outline: none;
        border-color: #1890ff;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
      }
    }

    button {
      padding: 6px 12px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &:hover:not(:disabled) {
        background: #40a9ff;
      }

      &:disabled {
        background: #d9d9d9;
        cursor: not-allowed;
      }
    }
  }
}

.test-status {
  padding: 12px 24px;

  .status-message {
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;

    &.info {
      background: #e6f7ff;
      color: #1890ff;
      border: 1px solid #91d5ff;
    }

    &.success {
      background: #f6ffed;
      color: #52c41a;
      border: 1px solid #b7eb8f;
    }

    &.error {
      background: #fff2f0;
      color: #ff4d4f;
      border: 1px solid #ffccc7;
    }
  }
}

.pdf-container {
  flex: 1;
  margin: 16px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .empty-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-text {
      font-size: 16px;
      color: #999;
    }
  }
}

.test-log {
  background: white;
  border-top: 1px solid #e8e8e8;

  h3 {
    margin: 0;
    padding: 12px 24px;
    font-size: 16px;
    color: #333;
    border-bottom: 1px solid #f0f0f0;
  }

  .log-container {
    height: 200px;
    overflow-y: auto;
    padding: 8px 0;

    .log-item {
      padding: 4px 24px;
      font-size: 12px;
      font-family: monospace;
      border-left: 3px solid transparent;

      &.info {
        border-left-color: #1890ff;
        background: rgba(24, 144, 255, 0.05);
      }

      &.success {
        border-left-color: #52c41a;
        background: rgba(82, 196, 26, 0.05);
      }

      &.error {
        border-left-color: #ff4d4f;
        background: rgba(255, 77, 79, 0.05);
      }

      .log-time {
        color: #999;
        margin-right: 8px;
      }

      .log-message {
        color: #333;
      }
    }
  }

  .clear-logs {
    margin: 8px 24px 16px;
    padding: 4px 8px;
    background: #f5f5f5;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;

    &:hover {
      background: #e6f7ff;
      border-color: #91d5ff;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .test-controls {
    flex-direction: column;
    gap: 12px;

    .control-group {
      flex-direction: column;
      align-items: stretch;

      select,
      input {
        min-width: auto;
      }
    }
  }

  .pdf-container {
    margin: 8px 12px;
  }

  .test-log .log-container {
    height: 150px;
  }
}
</style>
