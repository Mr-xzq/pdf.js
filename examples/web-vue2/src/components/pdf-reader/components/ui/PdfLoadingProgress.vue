<template>
  <div class="pdf-loading-progress">
    <div class="pdf-loading-progress__container">
      <!-- 加载图标 -->
      <div class="pdf-loading-progress__icon">
        <div class="loading-spinner"></div>
      </div>

      <!-- 加载信息 -->
      <div class="pdf-loading-progress__info">
        <div class="loading-message">{{ message }}</div>
        <div v-if="showProgress" class="loading-percentage">
          {{ progress }}%
        </div>
      </div>

      <!-- 进度条 -->
      <div v-if="showProgress" class="pdf-loading-progress__bar">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <!-- 详细信息 -->
      <div v-if="showDetails" class="pdf-loading-progress__details">
        <div v-if="loaded && total" class="loading-size">
          {{ formatBytes(loaded) }} / {{ formatBytes(total) }}
        </div>
        <div v-if="estimatedTime" class="loading-time">
          预计剩余时间: {{ estimatedTime }}
        </div>
      </div>

      <!-- 取消按钮 -->
      <div v-if="showCancel" class="pdf-loading-progress__actions">
        <button @click="onCancel" class="cancel-button">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "PdfLoadingProgress",

  props: {
    // 进度百分比 (0-100)
    progress: {
      type: Number,
      default: 0,
    },

    // 加载消息
    message: {
      type: String,
      default: "正在加载...",
    },

    // 已加载字节数
    loaded: {
      type: Number,
      default: 0,
    },

    // 总字节数
    total: {
      type: Number,
      default: 0,
    },

    // 是否显示进度条
    showProgress: {
      type: Boolean,
      default: true,
    },

    // 是否显示详细信息
    showDetails: {
      type: Boolean,
      default: false,
    },

    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      default: false,
    },

    // 加载类型
    type: {
      type: String,
      default: "document", // document, page, thumbnail
      validator: value => ["document", "page", "thumbnail"].includes(value),
    },
  },

  data() {
    return {
      startTime: Date.now(),
      estimatedTime: null,
    };
  },

  watch: {
    progress: {
      handler: "calculateEstimatedTime",
      immediate: true,
    },
  },

  methods: {
    /**
     * 格式化字节数
     */
    formatBytes(bytes) {
      if (bytes === 0) return "0 B";

      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    },

    /**
     * 计算预计剩余时间
     */
    calculateEstimatedTime() {
      if (this.progress <= 0 || this.progress >= 100) {
        this.estimatedTime = null;
        return;
      }

      const elapsed = Date.now() - this.startTime;
      const rate = this.progress / elapsed;
      const remaining = (100 - this.progress) / rate;

      if (remaining > 0 && remaining < Infinity) {
        this.estimatedTime = this.formatTime(remaining);
      } else {
        this.estimatedTime = null;
      }
    },

    /**
     * 格式化时间
     */
    formatTime(milliseconds) {
      const seconds = Math.ceil(milliseconds / 1000);

      if (seconds < 60) {
        return `${seconds} 秒`;
      } else if (seconds < 3600) {
        const minutes = Math.ceil(seconds / 60);
        return `${minutes} 分钟`;
      } else {
        const hours = Math.ceil(seconds / 3600);
        return `${hours} 小时`;
      }
    },

    /**
     * 处理取消操作
     */
    onCancel() {
      this.$emit("cancel");
    },
  },

  mounted() {
    this.startTime = Date.now();
  },
};
</script>

<style lang="less" scoped>
.pdf-loading-progress {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  z-index: 1000;

  &__container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 280px;
    max-width: 400px;
  }

  &__icon {
    margin-bottom: 16px;

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #1890ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  &__info {
    text-align: center;
    margin-bottom: 16px;

    .loading-message {
      font-size: 16px;
      color: #333;
      margin-bottom: 8px;
    }

    .loading-percentage {
      font-size: 24px;
      font-weight: bold;
      color: #1890ff;
    }
  }

  &__bar {
    width: 100%;
    margin-bottom: 16px;

    .progress-track {
      width: 100%;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #1890ff, #40a9ff);
        border-radius: 4px;
        transition: width 0.3s ease;
        position: relative;

        &::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          animation: shimmer 2s infinite;
        }
      }
    }
  }

  &__details {
    text-align: center;
    margin-bottom: 16px;

    .loading-size {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }

    .loading-time {
      font-size: 12px;
      color: #999;
    }
  }

  &__actions {
    .cancel-button {
      padding: 8px 16px;
      background: #f5f5f5;
      color: #666;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;

      &:hover {
        background: #e6f7ff;
        border-color: #91d5ff;
        color: #1890ff;
      }

      &:active {
        background: #bae7ff;
        border-color: #69c0ff;
      }
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-loading-progress {
    &__container {
      margin: 16px;
      padding: 24px;
      min-width: auto;
      max-width: none;
    }

    &__icon {
      .loading-spinner {
        width: 32px;
        height: 32px;
        border-width: 3px;
      }
    }

    &__info {
      .loading-message {
        font-size: 14px;
      }

      .loading-percentage {
        font-size: 20px;
      }
    }
  }
}
</style>
