<template>
  <div class="pdf-empty">
    <div class="message">请选择 PDF 文件</div>
  </div>
</template>

<script>
export default {
  name: "PdfEmptyState",
};
</script>

<style lang="less" scoped>
.pdf-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  .message {
    font-size: 16px;
    color: #999;
  }
}
</style>
