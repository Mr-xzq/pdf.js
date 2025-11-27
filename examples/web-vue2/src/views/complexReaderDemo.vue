<template>
  <div class="page">
    <van-nav-bar title="Complex PDF Reader" left-arrow @click-left="$router.back()" />

    <van-field v-model="localPdfUrl" label="PDF地址" placeholder="输入PDF文件URL">
      <template #button>
        <van-button size="small" type="primary" @click="confirmUrl">确认 </van-button>
      </template>
    </van-field>

    <div class="content">
      <complex-pdf-reader
        :src="pdfUrl"
        @document-loaded="onLoaded"
        @error="onError"
        @loading-start="onLoadingStart"
        @loading-stop="onLoadingStop"
      />
    </div>
  </div>
</template>

<script>
import { ComplexPdfReader } from "@/components/pdf/index.js";

export default {
  name: "ComplexReaderDemo",
  components: { ComplexPdfReader },
  data() {
    const { protocol, hostname } = window.location;
    // 后端端口
    const port = "5678";

    return {
      localPdfUrl: "",
      // pdfUrl: http://127.0.0.1:5678/pdfs/compressed.tracemonkey-pldi-09.pdf?timeout=2
      // pdfUrl: http://127.0.0.1:5678/pdfs/gsjrPdf.pdf?timeout=2
      pdfUrl: `${protocol}//${hostname}:${port}/pdfs/gsjrPdf.pdf?timeout=2`,
      // 用于保存当前的 loading Toast 实例，避免使用全局 clear 误清除错误提示等
      loadingToast: null,
    };
  },

  methods: {
    confirmUrl() {
      this.pdfUrl = this.localPdfUrl;
      console.log("confirmUrl: ", this.pdfUrl);
    },

    onLoaded({ info }) {
      console.log("加载完成: ", info);
      // this.$toast.success(`加载完成`);
    },
    onError(err) {
      console.log("加载失败: ", err);
      // 若此时仍有 loading toast，在展示错误前先关闭 loading
      if (this.loadingToast) {
        this.loadingToast.clear();
        this.loadingToast = null;
      }
      this.$toast.fail({
        message: "文件加载失败",
        duration: 3000,
      });
    },
    onLoadingStart(e) {
      // 只有在当前没有 loadingToast 时才创建，避免重复创建导致闪烁
      if (!this.loadingToast) {
        this.loadingToast = this.$toast.loading({
          message: e && e.message ? e.message : "加载中",
          duration: 0,
          forbidClick: true,
        });
      }
    },
    onLoadingStop() {
      // 只清理当前这一个 loadingToast，而不是全局 clear，避免把错误等提示一并清除
      if (this.loadingToast) {
        this.loadingToast.clear();
        this.loadingToast = null;
      }
    },
  },
};
</script>

<style lang="less" scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;

  .content {
    flex: 1;
    //overflow-y: auto;
    min-height: 0;
  }
}
</style>
