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
      />
    </div>
  </div>
</template>

<script>
import ComplexPdfReader from "@/components/complexPdfReader/index.vue";
import { mapState } from "vuex";

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
  computed: {
    ...mapState("pdfReader/document", {
      docLoading: state => state.loading,
      docMessage: state => state.loadMessage,
    }),
    ...mapState("pdfReader/viewer", {
      displayLoading: state => state.displayLoading,
      displayLoadingMessage: state => state.displayLoadingMessage,
    }),
    globalLoading() {
      return !!(this.displayLoading || this.docLoading);
    },
    globalMessage() {
      return this.displayLoading
        ? this.displayLoadingMessage || "正在翻页..."
        : this.docMessage || "加载中";
    },
  },
  watch: {
    globalLoading(n) {
      if (n) {
        this.$toast.loading({
          message: this.globalMessage,
          duration: 0,
          forbidClick: true,
        });
      } else {
        this.$toast.clear();
      }
    },
    // 当消息变更时，如果仍处于 loading 中，同步更新提示文案
    displayLoadingMessage() {
      if (this.globalLoading) {
        this.$toast.loading({
          message: this.globalMessage,
          duration: 0,
          forbidClick: true,
        });
      }
    },
    docMessage() {
      if (this.globalLoading) {
        this.$toast.loading({
          message: this.globalMessage,
          duration: 0,
          forbidClick: true,
        });
      }
    },
  },
  methods: {
    confirmUrl() {
      // 设置 URL 即触发内部加载；loading 动画交由全局（store）托管
      this.pdfUrl = this.localPdfUrl || this.pdfUrl;
    },
    onProgress(e) {
      // e.percentage: 0~1
      const p = typeof e?.percentage === "number" ? e.percentage : 0;
      this.progress = p;
    },
    onLoaded({ info }) {
      console.log("加载完成: ", info);
      this.$toast.success(`加载完成`);
    },
    onError(err) {
      const msg = err?.message || err?.error || "文件加载失败";
      this.$toast.fail(msg);
    },
  },
};
</script>

<style lang="less" scoped>
.content {
  height: 100vh;
}
</style>
