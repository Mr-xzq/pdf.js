<template>
  <div class="pdf-zoom-control">
    <!-- 缩小按钮 -->
    <pdf-button
      @click="onZoomOut"
      :disabled="!canZoomOut"
      size="medium"
      round
      class="pdf-zoom-control__out"
    >
      <template #icon>−</template>
    </pdf-button>

    <!-- 缩放比例显示 -->
    <div class="pdf-zoom-control__scale">
      {{ scalePercent }}%
    </div>

    <!-- 放大按钮 -->
    <pdf-button
      @click="onZoomIn"
      :disabled="!canZoomIn"
      size="medium"
      round
      class="pdf-zoom-control__in"
    >
      <template #icon>+</template>
    </pdf-button>


  </div>
</template>

<script>
import PdfButton from "../../ui/PdfButton.vue";

export default {
  name: "PdfZoomControl",

  components: {
    PdfButton,
  },

  props: {
    scale: {
      type: Number,
      default: 1.0,
    },
    canZoomIn: {
      type: Boolean,
      default: true,
    },
    canZoomOut: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {};
  },

  computed: {
    scalePercent() {
      return Math.round(this.scale * 100);
    },
  },

  methods: {
    onZoomIn() {
      this.$emit("zoom-in");
    },

    onZoomOut() {
      this.$emit("zoom-out");
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;

  &__out,
  &__in {
    flex: 0 0 auto;
  }

  &__scale {
    flex: 0 0 auto;
    font-size: 14px;
    color: #333;
    font-weight: 500;
    min-width: 50px;
    text-align: center;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background: #f5f5f5;
      color: #1890ff;
    }
  }

  &__selector {
    padding: 16px;

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e8e8e8;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }
    }

    &-content {
      .preset-item {
        padding: 12px;
        text-align: center;
        border-radius: 8px;
        transition: all 0.3s;
        cursor: pointer;

        &:hover {
          background: #f5f5f5;
        }

        .preset-label {
          font-size: 14px;
          color: #333;
          margin-bottom: 4px;
        }

        .preset-value {
          font-size: 12px;
          color: #666;
        }
      }

      :deep(.van-grid-item) {
        &.active .preset-item {
          background: #e6f7ff;
          color: #1890ff;

          .preset-label {
            color: #1890ff;
          }

          .preset-value {
            color: #1890ff;
          }
        }
      }
    }
  }

  &__custom {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e8e8e8;
  }
}

// 紧凑模式（在底部工具栏中使用）
.pdf-bottom-toolbar .pdf-zoom-control {
  gap: 4px;

  &__scale {
    min-width: 45px;
    font-size: 12px;
    padding: 2px 6px;
  }
}

// 平板适配
@media (max-width: 1024px) and (min-width: 769px) {
  .pdf-zoom-control {
    gap: 10px;

    &__scale {
      font-size: 15px;
      min-width: 55px;
      padding: 6px 10px;
    }
  }

  .pdf-bottom-toolbar .pdf-zoom-control {
    gap: 6px;

    &__scale {
      min-width: 50px;
      font-size: 13px;
      padding: 4px 8px;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-zoom-control {
    gap: 12px;

    &__scale {
      font-size: 16px;
      min-width: 60px;
      padding: 8px 12px;
    }
  }

  .pdf-bottom-toolbar .pdf-zoom-control {
    gap: 6px;

    &__scale {
      min-width: 50px;
      font-size: 14px;
      padding: 4px 8px;
    }
  }
}

// 小屏幕移动端适配
@media (max-width: 480px) {
  .pdf-bottom-toolbar .pdf-zoom-control {
    gap: 4px;

    &__scale {
      min-width: 45px;
      font-size: 13px;
      padding: 2px 6px;
    }
  }
}
</style>

