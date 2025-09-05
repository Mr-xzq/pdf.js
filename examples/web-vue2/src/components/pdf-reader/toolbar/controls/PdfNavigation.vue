<template>
  <div class="pdf-navigation">
    <!-- 上一页按钮 -->
    <van-button
      @click="onPrevPage"
      :disabled="!canGoPrev"
      size="normal"
      class="pdf-button pdf-navigation__prev"
    >
      <template #icon>◀</template>
    </van-button>

    <!-- 页码信息和输入 -->
    <div class="pdf-navigation__page-info">
      <pdf-page-input
        :current-page="currentPage"
        :total-pages="totalPages"
        @go-to-page="onGoToPage"
        class="pdf-navigation__page-input"
      />
    </div>

    <!-- 下一页按钮 -->
    <van-button
      @click="onNextPage"
      :disabled="!canGoNext"
      size="normal"
      class="pdf-button pdf-navigation__next"
    >
      <template #icon>▶</template>
    </van-button>
  </div>
</template>

<script>

import PdfPageInput from "./PdfPageInput.vue";

export default {
  name: "PdfNavigation",

  components: {

    PdfPageInput,
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
    canGoPrev: {
      type: Boolean,
      default: false,
    },
    canGoNext: {
      type: Boolean,
      default: false,
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
  },
};
</script>

<style lang="less" scoped>
@import "../../styles/common.less";
.pdf-navigation {
  display: flex;
  align-items: center;
  gap: 6px;

  &__prev,
  &__next {
    flex: 0 0 auto;
  }

  &__page-info {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  &__page-input {
    min-width: 85px;
  }
}

// 紧凑模式（在底部工具栏中使用）
.pdf-bottom-toolbar .pdf-navigation {
  gap: 6px;

  &__page-input {
    min-width: 85px;
  }
}
</style>

