<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="onClick"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <span v-if="$slots.icon" class="pdf-button__icon">
      <slot name="icon"></slot>
    </span>
    <span v-if="$slots.default" class="pdf-button__text">
      <slot></slot>
    </span>
  </button>
</template>

<script>
export default {
  name: 'PdfButton',

  props: {
    // 按钮类型
    type: {
      type: String,
      default: 'default', // default, primary, secondary, danger
      validator: value => ['default', 'primary', 'secondary', 'danger'].includes(value)
    },
    // 按钮尺寸
    size: {
      type: String,
      default: 'medium', // small, medium, large
      validator: value => ['small', 'medium', 'large'].includes(value)
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    // 是否激活状态
    active: {
      type: Boolean,
      default: false
    },
    // 是否圆形按钮
    round: {
      type: Boolean,
      default: false
    },
    // 是否块级按钮
    block: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      touching: false
    };
  },

  computed: {
    buttonClasses() {
      return [
        'pdf-button',
        `pdf-button--${this.type}`,
        `pdf-button--${this.size}`,
        {
          'pdf-button--disabled': this.disabled,
          'pdf-button--active': this.active,
          'pdf-button--round': this.round,
          'pdf-button--block': this.block,
          'pdf-button--touching': this.touching
        }
      ];
    }
  },

  methods: {
    onClick(event) {
      if (!this.disabled) {
        this.$emit('click', event);
      }
    },

    onTouchStart(event) {
      if (!this.disabled) {
        this.touching = true;
        this.$emit('touchstart', event);
      }
    },

    onTouchEnd(event) {
      if (!this.disabled) {
        this.touching = false;
        this.$emit('touchend', event);
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  text-align: center;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  user-select: none;
  touch-action: manipulation;
  outline: none;
  position: relative;
  overflow: hidden;

  // 基础样式
  &--default {
    background: #fff;
    border-color: #d9d9d9;
    color: #333;

    &:hover:not(.pdf-button--disabled) {
      background: #f5f5f5;
      border-color: #40a9ff;
      color: #40a9ff;
    }

    &:active:not(.pdf-button--disabled),
    &.pdf-button--touching:not(.pdf-button--disabled) {
      background: #f0f0f0;
      border-color: #096dd9;
      color: #096dd9;
    }
  }

  &--primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #fff;

    &:hover:not(.pdf-button--disabled) {
      background: #40a9ff;
      border-color: #40a9ff;
    }

    &:active:not(.pdf-button--disabled),
    &.pdf-button--touching:not(.pdf-button--disabled) {
      background: #096dd9;
      border-color: #096dd9;
    }
  }

  &--secondary {
    background: transparent;
    border-color: #1890ff;
    color: #1890ff;

    &:hover:not(.pdf-button--disabled) {
      background: #f0f8ff;
      border-color: #40a9ff;
      color: #40a9ff;
    }

    &:active:not(.pdf-button--disabled),
    &.pdf-button--touching:not(.pdf-button--disabled) {
      background: #e6f7ff;
      border-color: #096dd9;
      color: #096dd9;
    }
  }

  &--danger {
    background: #ff4d4f;
    border-color: #ff4d4f;
    color: #fff;

    &:hover:not(.pdf-button--disabled) {
      background: #ff7875;
      border-color: #ff7875;
    }

    &:active:not(.pdf-button--disabled),
    &.pdf-button--touching:not(.pdf-button--disabled) {
      background: #d9363e;
      border-color: #d9363e;
    }
  }

  // 尺寸
  &--small {
    padding: 4px 8px;
    font-size: 12px;
    height: 28px;
    min-width: 28px;
  }

  &--medium {
    padding: 6px 12px;
    font-size: 14px;
    height: 36px;
    min-width: 36px;
  }

  &--large {
    padding: 8px 16px;
    font-size: 16px;
    height: 44px;
    min-width: 44px;
  }

  // 状态
  &--disabled {
    background: #f5f5f5 !important;
    border-color: #d9d9d9 !important;
    color: #bfbfbf !important;
    cursor: not-allowed;
    box-shadow: none;
  }

  &--active {
    background: #1890ff;
    border-color: #1890ff;
    color: #fff;
  }

  &--round {
    border-radius: 50%;
    padding: 0;

    &.pdf-button--small {
      width: 28px;
      height: 28px;
    }

    &.pdf-button--medium {
      width: 36px;
      height: 36px;
    }

    &.pdf-button--large {
      width: 44px;
      height: 44px;
    }
  }

  &--block {
    width: 100%;
  }

  // 内容布局
  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &__text {
    display: inline-block;
  }

  &__icon + &__text {
    margin-left: 4px;
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-button {
    // 移动端最小触摸目标
    &--small {
      min-height: 32px;
      min-width: 32px;
    }

    &--medium {
      min-height: 44px;
      min-width: 44px;
    }

    &--large {
      min-height: 48px;
      min-width: 48px;
    }
  }
}
</style>
