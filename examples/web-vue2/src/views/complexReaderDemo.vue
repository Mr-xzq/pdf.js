<template>
  <div class="page">
    <van-nav-bar
      title="Complex PDF Reader"
      left-arrow
      @click-left="$router.back()"
    />

    <van-field
      v-model="localPdfUrl"
      label="PDF地址"
      placeholder="输入PDF文件URL"
    >
      <template #button>
        <van-button size="small" type="primary" @click="confirmUrl"
          >确认
        </van-button>
      </template>
    </van-field>

    <div class="content">
      <complex-pdf-reader
        :src="pdfUrl"
        :auto-play-enabled.sync="autoPlay"
        :auto-play-interval-ms="autoPlayIntervalMs"
        :zoom-target="zoomTarget"
        @document-loaded="onLoaded"
        @document-error="onError"
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
      // pdfUrl: http://127.0.0.1:5678/pdfs/compressed.tracemonkey-pldi-09.pdf
      pdfUrl: "http://127.0.0.1:5678/pdfs/gsjrPdf.pdf",
      // 控件
      autoPlay: false,
      autoPlayIntervalMs: 1500,
      zoomTarget: 1.5,
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
      const msg = err?.message || "文件加载失败";
      console.log("加载失败: ", msg);
      this.$toast.fail("文件加载失败");
    },
    onLoadingStart() {
      this.$toast.loading({
        message: "加载中",
        duration: 0,
        forbidClick: true,
      });
    },
    onLoadingStop() {
      this.$toast.clear();
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
