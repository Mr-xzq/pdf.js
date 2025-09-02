<template>
  <div class="pdf-loading-progress">
    <van-loading type="spinner" size="24px" />
    <div class="pdf-loading-progress__text">
      <slot>{{ defaultText }}</slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "PdfLoadingProgress",
  props: {
    progress: { type: Number, default: 0 },
    message: { type: String, default: "正在加载..." },
  },
  computed: {
    defaultText() {
      return this.progress > 0
        ? `${this.message} ${Math.round(this.progress)}%`
        : this.message;
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-loading-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #666;

  &__text {
    margin-top: 8px;
    font-size: 14px;
  }
}
</style>
