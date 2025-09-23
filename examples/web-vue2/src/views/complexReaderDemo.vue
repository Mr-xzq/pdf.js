<template>
  <div class="page">
    <!-- <van-nav-bar
      title="Complex PDF Reader"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <van-field v-model="localPdfUrl" label="PDF地址" placeholder="输入PDF文件URL">
      <template #button>
        <van-button size="small" type="primary" @click="confirmUrl">确认</van-button>
      </template>
    </van-field> -->

    <div class="content">
      <complex-pdf-reader
        :src="pdfUrl"
        :auto-play-enabled.sync="autoPlay"
        :auto-play-interval-ms="autoPlayIntervalMs"
        :zoom-target="zoomTarget"
        @document-loaded="onLoaded"
        @document-error="onError"
        @load-progress="onProgress"
        @loading-start="onLoadingStart"
        @loading-stop="onLoadingStop"
      />
    </div>
  </div>
</template>

<script>
import ComplexPdfReader from "@/components/complexPdfReader/index.vue";

export default {
  name: "ComplexReaderDemo",
  components: { ComplexPdfReader },
  data() {
    return {
      localPdfUrl: "",
      pdfUrl: "http://127.0.0.1:5678/pdfs/gsjrPdf.pdf",
      // 控件
      autoPlay: false,
      autoPlayIntervalMs: 1500,
      zoomTarget: 1.5,
      // 进度展示
      progress: 0,
    };
  },
  methods: {
    confirmUrl() {
      // 设置 URL 即触发内部加载；loading 动画由外部（本组件）统一管理
      this.pdfUrl = this.localPdfUrl || this.pdfUrl;
    },
    onProgress(e) {
      // e.percentage: 0~1
      const p = typeof e?.percentage === "number" ? e.percentage : 0;
      this.progress = p;
    },
    onLoaded({ info }) {
      this.$toast &&
        this.$toast.success(`加载完成，共 ${info?.numPages || 0} 页`);
    },
    onError(err) {
      const msg = err?.message || err?.error || "文件加载失败";
      this.$toast && this.$toast.fail(msg);
    },
    onLoadingStart(e) {
      const t = this.$toast;
      if (t && typeof t.loading === "function") {
        t.loading({
          message: e?.message || "加载中",
          duration: 0,
          forbidClick: true,
        });
      }
    },
    onLoadingStop() {
      const t = this.$toast;
      if (t && typeof t.clear === "function") t.clear();
    },
  },
};
</script>

<style lang="less" scoped>
.content {
  height: 100vh;
}
</style>
