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
          <van-button size="normal" class="pdf-button" @click="onFitWidth"
            >适配宽度</van-button
          >
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
import PdfNavigation from "./controls/PdfNavigation.vue";
import PdfZoomControl from "./controls/PdfZoomControl.vue";

export default {
  name: "PdfBottomToolbar",

  components: {
    PdfNavigation,
    PdfZoomControl,
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
@import "../styles/common.less";
.pdf-bottom-toolbar {
  width: 100%;
  height: 60px;
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
    padding: 0 8px;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;

    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__navigation {
    flex: 0 0 auto;
  }

  &__navigation.pdf-navigation {
    gap: 4px;

    ::v-deep .pdf-button {
      min-width: 32px;
      height: 32px;
      padding: 0;
      font-size: 14px;
    }

    ::v-deep .pdf-navigation__page-input {
      min-width: 70px;
      font-size: 13px;
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
  }

  &__zoom.pdf-zoom-control {
    gap: 4px;

    ::v-deep .pdf-button {
      min-width: 28px;
      height: 28px;
      padding: 0;
      font-size: 16px;

      &.pdf-button--round {
        width: 28px;
        height: 28px;
      }
    }

    ::v-deep .pdf-zoom-control__scale {
      min-width: 45px;
      font-size: 12px;
      padding: 2px 6px;
    }
  }

  &__actions {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    min-width: 0; // 允许收缩

    ::v-deep .pdf-button {
      min-width: 36px;
      height: 36px;
      padding: 0 6px;
      font-size: 13px;

      &.pdf-button--round {
        width: 36px;
        height: 36px;
        padding: 0;
      }
    }
  }
}
</style>
