<template>
  <div class="pdf-page-input">
    <!-- 使用 Vant@2 的 van-field 组件优化输入体验 -->
    <van-field
      v-model="inputValue"
      type="number"
      :placeholder="currentPage.toString()"
      center
      @blur="onInputBlur"
      @keyup.enter="onInputEnter"
      class="pdf-page-input__field"
    >
      <template #button>
        <span class="pdf-page-input__total">/ {{ totalPages }}</span>
      </template>
    </van-field>
  </div>
</template>

<script>
export default {
  name: "PdfPageInput",

  props: {
    currentPage: {
      type: Number,
      default: 1,
    },
    totalPages: {
      type: Number,
      default: 0,
    },
  },

  data() {
    return {
      inputValue: "",
      focused: false,
    };
  },

  watch: {
    currentPage: {
      handler(newPage) {
        if (!this.focused) {
          this.inputValue = "";
        }
      },
      immediate: true,
    },
  },

  methods: {
    onInputBlur() {
      this.focused = false;
      this.handlePageChange();
    },

    onInputEnter() {
      this.handlePageChange();
      // 移动端隐藏键盘
      if (this.$refs.input) {
        this.$refs.input.blur();
      }
    },

    handlePageChange() {
      const pageNumber = parseInt(this.inputValue);

      if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > this.totalPages) {
        // 无效输入，重置为当前页
        this.inputValue = "";
        return;
      }

      if (pageNumber !== this.currentPage) {
        this.$emit("go-to-page", pageNumber);
      }

      this.inputValue = "";
    },

    onFocus() {
      this.focused = true;
      if (!this.inputValue) {
        this.inputValue = this.currentPage.toString();
      }
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-page-input {
  display: inline-block;
  min-width: 80px;

  &__field {
    // 覆盖 Vant 默认样式
    :deep(.van-field__control) {
      text-align: center;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      background: transparent;
      border: none;
      padding: 4px 8px;
      min-width: 40px;
      width: 40px;
    }

    :deep(.van-field__button) {
      padding-left: 4px;
    }

    // 移除 Vant 的边框和背景
    :deep(.van-field) {
      background: transparent;
      border: none;
      padding: 0;
    }

    :deep(.van-field__body) {
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      background: #fff;
      padding: 4px 8px;
      transition: all 0.3s;

      &:hover {
        border-color: #40a9ff;
      }

      &:focus-within {
        border-color: #1890ff;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
      }
    }
  }

  &__total {
    font-size: 14px;
    color: #666;
    font-weight: normal;
    white-space: nowrap;
  }
}

// 紧凑模式（在底部工具栏中使用）
.pdf-bottom-toolbar .pdf-page-input {
  min-width: 70px;

  &__field {
    :deep(.van-field__control) {
      font-size: 13px;
      width: 35px;
      min-width: 35px;
      padding: 2px 4px;
    }

    :deep(.van-field__body) {
      padding: 2px 6px;
      border-radius: 3px;
    }

    :deep(.van-field__button) {
      padding-left: 2px;
    }
  }

  &__total {
    font-size: 13px;
  }
}

// 平板适配
@media (max-width: 1024px) and (min-width: 769px) {
  .pdf-page-input {
    min-width: 90px;

    &__field {
      :deep(.van-field__control) {
        font-size: 15px;
        width: 45px;
        min-width: 45px;
      }

      :deep(.van-field__body) {
        padding: 6px 10px;
      }
    }

    &__total {
      font-size: 15px;
    }
  }

  .pdf-bottom-toolbar .pdf-page-input {
    min-width: 80px;

    &__field {
      :deep(.van-field__control) {
        font-size: 14px;
        width: 40px;
        min-width: 40px;
        padding: 3px 6px;
      }

      :deep(.van-field__body) {
        padding: 3px 8px;
      }
    }

    &__total {
      font-size: 14px;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-page-input {
    min-width: 100px;

    &__field {
      :deep(.van-field__control) {
        font-size: 16px;
        width: 50px;
        min-width: 50px;
      }

      :deep(.van-field__body) {
        padding: 8px 12px;
      }
    }

    &__total {
      font-size: 16px;
    }
  }

  .pdf-bottom-toolbar .pdf-page-input {
    min-width: 85px;

    &__field {
      :deep(.van-field__control) {
        font-size: 14px;
        width: 42px;
        min-width: 42px;
        padding: 4px 6px;
      }

      :deep(.van-field__body) {
        padding: 4px 8px;
      }
    }

    &__total {
      font-size: 14px;
    }
  }
}

// 小屏幕移动端适配
@media (max-width: 480px) {
  .pdf-bottom-toolbar .pdf-page-input {
    min-width: 75px;

    &__field {
      :deep(.van-field__control) {
        font-size: 13px;
        width: 38px;
        min-width: 38px;
        padding: 2px 4px;
      }

      :deep(.van-field__body) {
        padding: 2px 6px;
      }
    }

    &__total {
      font-size: 13px;
    }
  }
}
</style>

