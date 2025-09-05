<template>
  <div class="pdf-zoom-control">
    <!-- 缩小按钮 -->
    <van-button
      @click="onZoomOut"
      :disabled="!canZoomOut"
      size="normal"
      class="pdf-button pdf-button--round pdf-zoom-control__out"
    >
      <template #icon>−</template>
    </van-button>

    <!-- 缩放比例显示 -->
    <div class="pdf-zoom-control__scale">
      {{ scalePercent }}%
    </div>

    <!-- 放大按钮 -->
    <van-button
      @click="onZoomIn"
      :disabled="!canZoomIn"
      size="normal"
      class="pdf-button pdf-button--round pdf-zoom-control__in"
    >
      <template #icon>+</template>
    </van-button>


  </div>
</template>

<script>


export default {
  name: "PdfZoomControl",

  components: {
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
@import "../../styles/common.less";
.pdf-zoom-control {
  display: flex;
  align-items: center;
  gap: 6px;

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

      ::v-deep .van-grid-item {
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
  gap: 6px;

  &__scale {
    min-width: 50px;
    font-size: 14px;
    padding: 4px 8px;
  }
}
</style>

