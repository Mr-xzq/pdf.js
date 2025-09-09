<template>
  <div class="page">
    <van-nav-bar
      title="Simple PDF Reader"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />
    <van-field
      v-model="localPdfUrl"
      label="PDF地址"
      placeholder="输入PDF文件URL"
    >
      <template #button>
        <van-button @click="pdfUrl = localPdfUrl" size="small" type="primary"
          >确认</van-button
        >
      </template>
    </van-field>
    <div class="content">
      <simple-pdf-reader
        :src="pdfUrl"
        @loading-start="onLoadingStart"
        @progress="onProgress"
        @loaded="onLoaded"
        @error="onError"
      />
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
      localPdfUrl: "",
      pdfUrl:
        // "http://127.0.0.1:5678/pdfs/compressed.tracemonkey-pldi-09.pdf",
        "http://127.0.0.1:5678/pdfs/gsjrPdf.pdf",
      progress: 0,
      toast: null,
    };
  },
  methods: {
    onLoadingStart() {
      if (this.toast && this.toast.clear) this.toast.clear();
      this.progress = 0;
      this.toast = this.$toast.loading({
        duration: 0,
        forbidClick: true,
        message: "加载 0%",
      });
    },
    onProgress({ progress }) {
      this.progress = progress || 0;
      if (this.toast && this.toast.message !== undefined) {
        this.toast.message = `加载 ${Math.round((this.progress || 0) * 100)}%`;
      }
    },
    onLoaded({ numPages }) {
      if (this.toast && this.toast.clear) this.toast.clear();
      this.$toast.success(`加载完成，共 ${numPages} 页`);
    },
    onError(errMsg) {
      if (this.toast && this.toast.clear) this.toast.clear();
      this.$toast.fail(errMsg || "文件加载失败");
    },
  },
};
</script>

<style lang="less" scoped>
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
  padding: 0.5rem;
  overflow-y: auto;
}
.content > * {
  height: 100%;
}
</style>
