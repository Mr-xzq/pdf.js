<template>
  <div class="page">
    <van-nav-bar
      title="Simple PDF Reader"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />
    <div class="content">
      <simple-pdf-reader :src="pdfUrl" />
    </div>
  </div>
</template>

<script>
import SimplePdfReader from "@/components/simple-pdf-reader/SimplePdfReader.vue";

export default {
  name: "SimpleReaderDemo",
  components: { SimplePdfReader },
  data() {
    return {
      // 使用官方示例 PDF（允许跨域）
      pdfUrl:
        // "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
        "http://127.0.0.1:5678/pdfs/gsjrPdf.pdf",
    };
  },
};
</script>

<style scoped>
.page {
  position: fixed;
  inset: 0;
  background: #f5f6f7;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  min-height: 0;
}
.content > * {
  height: 100%;
}
</style>
