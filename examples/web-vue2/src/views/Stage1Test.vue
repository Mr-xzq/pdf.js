<template>
  <div class="stage1-test">
    <div class="test-header">
      <h2>阶段1验证 - 基础架构</h2>
      <p>测试 PDF.js 零配置导入和基础组件功能</p>
    </div>

    <div class="test-controls">
      <div class="control-group">
        <label>选择测试PDF：</label>
        <select v-model="selectedPdf" @change="loadSelectedPdf">
          <option value="">请选择PDF文件</option>
          <option v-for="pdf in testPdfs" :key="pdf.value" :value="pdf.value">
            {{ pdf.label }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label>自定义URL：</label>
        <input
          v-model="customUrl"
          type="text"
          placeholder="输入PDF文件URL"
          @keyup.enter="loadCustomPdf"
        />
        <button @click="loadCustomPdf" :disabled="!customUrl">加载</button>
      </div>
    </div>

    <div class="test-result">
      <div class="result-info">
        <div v-if="loadStatus" class="status-item">
          <strong>状态：</strong> {{ loadStatus }}
        </div>
        <div v-if="documentInfo" class="status-item">
          <strong>文档信息：</strong> {{ documentInfo }}
        </div>
      </div>

      <div class="pdf-container">
        <pdf-reader
          v-if="currentPdfUrl"
          :src="currentPdfUrl"
          @document-loaded="onDocumentLoaded"
          @load-error="onLoadError"
        />
        <div v-else class="no-pdf">
          <p>请选择或输入PDF文件进行测试</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PdfReader from "@/components/pdf-reader/index.vue";

export default {
  name: "Stage1Test",
  components: {
    PdfReader,
  },
  data() {
    return {
      currentPdfUrl: "",
      selectedPdf: "",
      customUrl: "",
      loadStatus: "",
      documentInfo: "",
      testPdfs: [
        {
          label: "测试PDF 1 - 简单文档",
          value: "/assets/sample.pdf",
        },
        {
          label: "测试PDF 2 - 在线文档",
          value:
            "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
        },
      ],
    };
  },
  methods: {
    loadSelectedPdf() {
      if (this.selectedPdf) {
        this.currentPdfUrl = this.selectedPdf;
        this.loadStatus = "正在加载选定的PDF...";
      }
    },

    loadCustomPdf() {
      if (this.customUrl) {
        this.currentPdfUrl = this.customUrl;
        this.loadStatus = "正在加载自定义PDF...";
      }
    },

    onDocumentLoaded(event) {
      this.loadStatus = "PDF加载成功";
      this.documentInfo = `页数: ${
        event.numPages
      }, 指纹: ${event.fingerprint.substring(0, 8)}...`;
      console.log("Stage1 Test - 文档加载成功:", event);
    },

    onLoadError(error) {
      this.loadStatus = "PDF加载失败";
      this.documentInfo = `错误: ${error.message}`;
      console.error("Stage1 Test - 文档加载失败:", error);
    },
  },
};
</script>

<style lang="less" scoped>
.stage1-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;

  h2 {
    color: #1890ff;
    margin-bottom: 8px;
  }

  p {
    color: #666;
    font-size: 14px;
  }
}

.test-controls {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;

  .control-group {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    label {
      width: 120px;
      font-weight: bold;
      color: #333;
    }

    select,
    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      margin-right: 8px;
    }

    button {
      padding: 8px 16px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #40a9ff;
      }
    }
  }
}

.test-result {
  .result-info {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;

    .status-item {
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .pdf-container {
    height: 500px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;

    .no-pdf {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 16px;
    }
  }
}
</style>
