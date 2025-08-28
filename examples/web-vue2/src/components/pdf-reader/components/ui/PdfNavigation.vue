<template>
  <div class="pdf-navigation">
    <!-- 上一页按钮 -->
    <pdf-button
      @click="onPrevPage"
      :disabled="!canGoPrev"
      size="medium"
      class="pdf-navigation__prev"
    >
      <template #icon>◀</template>
    </pdf-button>

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
    <pdf-button
      @click="onNextPage"
      :disabled="!canGoNext"
      size="medium"
      class="pdf-navigation__next"
    >
      <template #icon>▶</template>
    </pdf-button>
  </div>
</template>

<script>
import PdfButton from './PdfButton.vue';
import PdfPageInput from './PdfPageInput.vue';

export default {
  name: 'PdfNavigation',

  components: {
    PdfButton,
    PdfPageInput
  },

  props: {
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: {
      type: Number,
      default: 0
    },
    canGoPrev: {
      type: Boolean,
      default: false
    },
    canGoNext: {
      type: Boolean,
      default: false
    }
  },



  methods: {
    onPrevPage() {
      this.$emit('prev-page');
    },

    onNextPage() {
      this.$emit('next-page');
    },

    onGoToPage(pageNumber) {
      this.$emit('go-to-page', pageNumber);
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-navigation {
  display: flex;
  align-items: center;
  gap: 8px;

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
    min-width: 80px;
  }
}

// 紧凑模式（在底部工具栏中使用）
.pdf-bottom-toolbar .pdf-navigation {
  gap: 4px;

  &__page-input {
    min-width: 70px;
  }
}

// 平板适配
@media (max-width: 1024px) and (min-width: 769px) {
  .pdf-navigation {
    gap: 10px;

    &__page-input {
      min-width: 90px;
    }
  }

  .pdf-bottom-toolbar .pdf-navigation {
    gap: 6px;

    &__page-input {
      min-width: 80px;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-navigation {
    gap: 12px;

    &__page-input {
      min-width: 100px;
    }
  }

  .pdf-bottom-toolbar .pdf-navigation {
    gap: 6px;

    &__page-input {
      min-width: 85px;
    }
  }
}

// 小屏幕移动端适配
@media (max-width: 480px) {
  .pdf-bottom-toolbar .pdf-navigation {
    gap: 4px;

    &__page-input {
      min-width: 75px;
    }
  }
}
</style>
