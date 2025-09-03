<template>
  <div class="pdf-bottom-toolbar">
    <div class="pdf-bottom-toolbar__container">
      <!-- 导航控制 -->
      <pdf-navigation
        :current-page="currentPage"
        :total-pages="totalPages"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev-page="onPrevPage"
        @next-page="onNextPage"
        @go-to-page="onGoToPage"
        class="pdf-bottom-toolbar__navigation"
      />

      <!-- 分隔线 -->
      <div class="pdf-bottom-toolbar__divider"></div>

      <!-- 缩放控制 -->
      <pdf-zoom-control
        :scale="scale"
        :scale-label="scaleLabel"
        :can-zoom-in="canZoomIn"
        :can-zoom-out="canZoomOut"
        @zoom-in="onZoomIn"
        @zoom-out="onZoomOut"
        @set-scale="onSetScale"
        class="pdf-bottom-toolbar__zoom"
      />

      <!-- 扩展功能区域 -->
      <div class="pdf-bottom-toolbar__actions">
        <slot name="actions">
          <!-- 默认提供一个“适配宽度”按钮，可被外部插槽覆盖 -->
          <pdf-button size="medium" @click="onFitWidth">适配宽度</pdf-button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
import PdfNavigation from "./controls/PdfNavigation.vue";
import PdfZoomControl from "./controls/PdfZoomControl.vue";
import PdfButton from "../ui/PdfButton.vue";

export default {
  name: "PdfBottomToolbar",

  components: {
    PdfNavigation,
    PdfZoomControl,
    PdfButton,
  },

  props: {
    currentPage: {
      type: Number,
      default: 1,
    },
    totalPages: {
      type: Number,
      default: 0,
    },
    scale: {
      type: Number,
      default: 1.0,
    },
    canGoPrev: {
      type: Boolean,
      default: false,
    },
    canGoNext: {
      type: Boolean,
      default: false,
    },
    canZoomIn: {
      type: Boolean,
      default: true,
    },
    canZoomOut: {
      type: Boolean,
      default: true,
    },
    scaleLabel: {
      type: String,
      default: "",
    },
  },

  methods: {
    onPrevPage() {
      this.$emit("prev-page");
    },

    onNextPage() {
      this.$emit("next-page");
    },

    onGoToPage(pageNumber) {
      this.$emit("go-to-page", pageNumber);
    },

    onZoomIn() {
      this.$emit("zoom-in");
    },

    onZoomOut() {
      this.$emit("zoom-out");
    },

    onSetScale(scale) {
      this.$emit("set-scale", scale);
    },

    onFitWidth() {
      this.$emit("fit-width-once");
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-bottom-toolbar {
  width: 100%;
  height: 56px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #e8e8e8;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
  z-index: 1000;

  &__container {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__navigation {
    flex: 0 0 auto;

    // 紧凑布局
    :deep(.pdf-navigation) {
      gap: 4px;

      .pdf-button {
        min-width: 32px;
        height: 32px;
        padding: 0;
        font-size: 14px;
      }

      .pdf-navigation__page-input {
        min-width: 70px;
        font-size: 13px;
      }
    }
  }

  &__divider {
    width: 1px;
    height: 20px;
    background: #e8e8e8;
    flex: 0 0 auto;
    margin: 0 2px;
  }

  &__zoom {
    flex: 0 0 auto;

    // 紧凑布局
    :deep(.pdf-zoom-control) {
      gap: 4px;

      .pdf-button {
        min-width: 28px;
        height: 28px;
        padding: 0;
        font-size: 16px;

        &.pdf-button--round {
          width: 28px;
          height: 28px;
        }
      }

      .pdf-zoom-control__scale {
        min-width: 45px;
        font-size: 12px;
        padding: 2px 6px;
      }
    }
  }

  &__actions {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    min-width: 0; // 允许收缩

    // 操作按钮样式
    :deep(.pdf-button) {
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      font-size: 12px;

      &.pdf-button--round {
        width: 28px;
        height: 28px;
        padding: 0;
      }
    }
  }
}

// 平板适配
@media (max-width: 1024px) and (min-width: 769px) {
  .pdf-bottom-toolbar {
    &__container {
      padding: 0 16px;
      gap: 10px;
    }

    &__navigation {
      :deep(.pdf-navigation) {
        gap: 6px;

        .pdf-button {
          min-width: 36px;
          height: 36px;
        }

        .pdf-navigation__page-input {
          min-width: 80px;
        }
      }
    }

    &__zoom {
      :deep(.pdf-zoom-control) {
        gap: 6px;

        .pdf-button {
          min-width: 32px;
          height: 32px;

          &.pdf-button--round {
            width: 32px;
            height: 32px;
          }
        }

        .pdf-zoom-control__scale {
          min-width: 50px;
          font-size: 13px;
        }
      }
    }

    &__actions {
      gap: 6px;

      :deep(.pdf-button) {
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        font-size: 13px;

        &.pdf-button--round {
          width: 32px;
          height: 32px;
        }
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-bottom-toolbar {
    height: 60px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;

    &__container {
      padding: 0 8px;
      gap: 6px;
    }

    &__navigation {
      :deep(.pdf-navigation) {
        gap: 6px;

        .pdf-button {
          min-width: 40px;
          height: 40px;
          font-size: 16px;
        }

        .pdf-navigation__page-input {
          min-width: 85px;
          font-size: 14px;
        }
      }
    }

    &__divider {
      height: 16px;
      margin: 0 1px;
    }

    &__zoom {
      :deep(.pdf-zoom-control) {
        gap: 6px;

        .pdf-button {
          min-width: 36px;
          height: 36px;
          font-size: 18px;

          &.pdf-button--round {
            width: 36px;
            height: 36px;
          }
        }

        .pdf-zoom-control__scale {
          min-width: 50px;
          font-size: 14px;
          padding: 4px 8px;
        }
      }
    }

    &__actions {
      gap: 4px;

      :deep(.pdf-button) {
        min-width: 36px;
        height: 36px;
        padding: 0 6px;
        font-size: 13px;

        &.pdf-button--round {
          width: 36px;
          height: 36px;
        }
      }
    }
  }
}

// 小屏幕移动端适配
@media (max-width: 480px) {
  .pdf-bottom-toolbar {
    &__container {
      padding: 0 6px;
      gap: 4px;
    }

    &__navigation {
      :deep(.pdf-navigation) {
        gap: 4px;

        .pdf-navigation__page-input {
          min-width: 75px;
          font-size: 13px;
        }
      }
    }

    &__zoom {
      :deep(.pdf-zoom-control) {
        gap: 4px;

        .pdf-zoom-control__scale {
          min-width: 45px;
          font-size: 13px;
          padding: 2px 6px;
        }
      }
    }

    &__actions {
      gap: 3px;

      :deep(.pdf-button) {
        min-width: 32px;
        height: 32px;
        padding: 0 4px;
        font-size: 12px;

        &.pdf-button--round {
          width: 32px;
          height: 32px;
        }
      }
    }
  }
}
</style>

