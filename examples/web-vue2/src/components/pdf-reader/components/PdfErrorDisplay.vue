<template>
  <div class="pdf-error">
    <div class="icon">⚠️</div>
    <div class="message">{{ message }}</div>
    <button class="retry" @click="$emit('retry')">重试</button>
  </div>
</template>

<script>
export default {
  name: "PdfErrorDisplay",
  props: {
    message: { type: String, default: "" },
  },
};
</script>

<style lang="less" scoped>
.pdf-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .message {
    font-size: 16px;
    color: #666;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .retry {
    padding: 8px 16px;
    background: #1890ff;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      background: #40a9ff;
    }

    &:active {
      background: #096dd9;
    }
  }
}
</style>

