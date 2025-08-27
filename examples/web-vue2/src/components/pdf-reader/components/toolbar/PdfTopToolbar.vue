<template>
  <div class="pdf-top-toolbar">
    <div class="pdf-top-toolbar__container">
      <!-- 左侧：返回按钮（可选） -->
      <div class="pdf-top-toolbar__left">
        <slot name="left">
          <!-- 默认为空，可由使用方自定义 -->
        </slot>
      </div>

      <!-- 中间：标题区域 -->
      <div class="pdf-top-toolbar__center">
        <slot name="center">
          <div class="pdf-top-toolbar__title">
            PDF 阅读器
            <span v-if="documentLoaded" class="pdf-top-toolbar__page-info">
              ({{ currentPage }}/{{ totalPages }})
            </span>
          </div>
        </slot>
      </div>

      <!-- 右侧：功能按钮 -->
      <div class="pdf-top-toolbar__right">
        <slot name="right">
          <!-- 搜索按钮 -->
          <pdf-button
            v-if="documentLoaded"
            @click="onSearchToggle"
            :active="searchActive"
            class="pdf-top-toolbar__search-btn"
            size="small"
          >
            🔍
          </pdf-button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
import PdfButton from '../shared/PdfButton.vue';

export default {
  name: 'PdfTopToolbar',

  components: {
    PdfButton
  },

  props: {
    documentLoaded: {
      type: Boolean,
      default: false
    },
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: {
      type: Number,
      default: 0
    },
    searchActive: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    onSearchToggle() {
      this.$emit('search-toggle');
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-top-toolbar {
  width: 100%;
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;

  &__container {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }

  &__left,
  &__right {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  &__title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    line-height: 1.4;
  }

  &__page-info {
    font-size: 14px;
    color: #666;
    font-weight: normal;
    margin-left: 8px;
  }

  &__search-btn {
    min-width: 36px;
    height: 36px;
    border-radius: 50%;
    
    &.active {
      background: #1890ff;
      color: white;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-top-toolbar {
    height: 44px;

    &__container {
      padding: 0 12px;
    }

    &__title {
      font-size: 14px;
    }

    &__page-info {
      font-size: 12px;
    }

    &__search-btn {
      min-width: 40px;
      height: 40px;
    }
  }
}
</style>
