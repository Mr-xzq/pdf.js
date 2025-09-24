<template>
  <div class="complex-pdf-reader">
    <!-- <div class="top-toolbar">
      <div class="right-operate-tool">
        <van-image class="search-tool-item" :src="searchIconUrl"></van-image>
        <van-image
          class="fullscreen-tool-item"
          :src="fullscreenIconUrl"
        ></van-image>
      </div>
    </div> -->
    <div class="content-area">
      <pdf-reader-core
        ref="pdfReader"
        :src="src"
        :initial-page="initialPage"
        :initial-scale="initialScale"
        :zoom-target="zoomTarget"
        :auto-play-enabled="autoPlay"
        :auto-play-interval-ms="autoPlayIntervalMs"
        @document-loaded="onPdfLoaded"
        @document-error="onPdfError"
        @page-changed="onPdfPageChanged"
        @scale-changed="onPdfScaleChanged"
        @loading-start="onLoadingStart"
        @loading-stop="onLoadingStop"
      />
    </div>
    <div class="bottom-toolbar">
      <van-image
        class="thumbnail-tool-item"
        :src="thumbnailIconUrl"
        @click="handleClickThumbnail"
      ></van-image>
      <van-image
        class="outline-tool-item"
        :src="outlineIconUrl"
        @click="handleClickOutline"
      ></van-image>
      <van-image
        class="page-flip-tool-item"
        :src="pageFlipIconUrl"
        @click="togglePageNav"
      ></van-image>
      <!-- <van-image
        class="page-flip-audio-tool-item"
        :src="pageFlipAudioIconUrl"
      ></van-image> -->
      <!-- 缩放：切换按钮（依据是否存在 lastScaleBeforeZoom 来互斥显示） -->
      <van-image
        v-if="!lastScaleBeforeZoom"
        class="zoom-in-tool-item"
        :src="zoomInIconUrl"
        @click="handleZoomIn"
      ></van-image>
      <van-image
        v-else
        class="zoom-out-tool-item"
        :src="zoomOutIconUrl"
        @click="handleResetZoom"
      ></van-image>
      <!-- 自动播放/暂停 -->
      <van-image
        class="auto-play-tool-item"
        :src="autoPlay ? pauseIconUrl : autoPlayIconUrl"
        @click="handleToggleAutoPlay"
      ></van-image>
    </div>
    <div class="page-nav" :class="{ 'is-open': isShowPageNav }">
      <div class="nav-row">
        <van-image
          class="nav-row-item first-page"
          :src="firstPageIconUrl"
          @click="goFirstPage"
        ></van-image>

        <van-image
          class="nav-row-item"
          :src="previousPageIconUrl"
          @click="goPrevPage"
        ></van-image>

        <van-field
          ref="pageInput"
          class="page-input"
          :value="
            isEditingPageInput ? String(gotoPageInput || '') : pageFieldDisplay
          "
          :readonly="!isEditingPageInput"
          :type="isEditingPageInput ? 'digit' : 'text'"
          input-align="center"
          @click="handlePageFieldClick"
          @input="onPageFieldInput"
          @blur="cancelEditPage"
          @keyup.enter.native="finishEditPage"
        />

        <van-image
          class="nav-row-item"
          :src="nextPageIconUrl"
          @click="goNextPage"
        ></van-image>

        <van-image
          class="nav-row-item last-page"
          :src="lastPageIconUrl"
          @click="goLastPage"
        ></van-image>
      </div>

      <van-slider
        class="slider-wrap"
        v-model="sliderValue"
        active-color="#CBCBCB"
        inactive-color="#F9F5FF"
        bar-height="0.29rem"
        :min="1"
        :max="Math.max(totalPages, 1)"
        :step="1"
        :lazy-change="true"
        @drag-start="onSliderDragStart"
        @change="onSliderChange"
      >
        <template #button>
          <div class="custom-slide-button"></div>
        </template>
      </van-slider>
    </div>

    <drawer
      :is-show.sync="isShowOutlineDrawer"
      title="目录"
      @close="onOutlineDrawerClose"
      @opened="onOutlineOpened"
    >
      <outline-panel
        ref="outlinePanel"
        :get-outline="getOutline"
        :navigate-to-destination="navigateToDestination"
        :current-page="currentPage"
        :resolve-dest-to-page-number="resolveDestToPageNumber"
        @selected="closeOutlineDrawer"
        @loading-start="onLoadingStart"
        @loading-stop="onLoadingStop"
      />
    </drawer>
    <drawer
      :is-show.sync="isShowThumbnailDrawer"
      title="缩略图"
      @close="onThumbnailDrawerClose"
      @opened="onThumbnailOpened"
    >
      <thumbnail-panel
        ref="thumbPanel"
        :get-total-pages="getTotalPages"
        :render-thumbnail="renderThumbnail"
        :go-to-page="goToPage"
        :current-page="currentPage"
        @selected="closeThumbnailDrawer"
        @loading-start="onLoadingStart"
        @loading-stop="onLoadingStop"
      />
    </drawer>
  </div>
</template>

<script>
// 组件
import PdfReaderCore from "./components/pdfReaderCore/index.vue";
import Drawer from "./components/drawer/index.vue";
import OutlinePanel from "./components/outlinePanel/index.vue";
import ThumbnailPanel from "./components/thumbnailPanel/index.vue";

// 图标
// import fullscreenIconUrl from "@/assets/images/complexPdfReader/fullscreen-2x.png";
// import searchIconUrl from "@/assets/images/complexPdfReader/search-2x.png";
import thumbnailIconUrl from "@/assets/images/complexPdfReader/thumbnail-2x.png";
import outlineIconUrl from "@/assets/images/complexPdfReader/outline-2x.png";
import pageFlipIconUrl from "@/assets/images/complexPdfReader/page-flip-2x.png";
import firstPageIconUrl from "@/assets/images/complexPdfReader/firstPage-2x.png";
import lastPageIconUrl from "@/assets/images/complexPdfReader/lastPage-2x.png";
import previousPageIconUrl from "@/assets/images/complexPdfReader/previousPage-2x.png";
import nextPageIconUrl from "@/assets/images/complexPdfReader/nextPage-2x.png";

// import pageFlipAudioIconUrl from "@/assets/images/complexPdfReader/page-flip-audio-2x.png";
import zoomInIconUrl from "@/assets/images/complexPdfReader/zoom-in-2x.png";
import zoomOutIconUrl from "@/assets/images/complexPdfReader/zoom-out-2x.png";
import autoPlayIconUrl from "@/assets/images/complexPdfReader/auto-play-2x.png";
import pauseIconUrl from "@/assets/images/complexPdfReader/pause-2x.png";

export default {
  name: "ComplexPdfReader",
  components: {
    Drawer,
    PdfReaderCore,
    OutlinePanel,
    ThumbnailPanel,
  },
  props: {
    // 文档地址（对外暴露，默认指向示例文件）
    src: {
      type: String,
      default: "http://127.0.0.1:5678/pdfs/gsjrPdf.pdf",
    },
    // 初始页
    initialPage: {
      type: Number,
      default: 1,
    },
    // 初始缩放
    initialScale: {
      type: Number,
      default: 1,
    },
    // 双击放大目标倍数
    zoomTarget: {
      type: Number,
      default: 1.5,
    },
    // 自动播放（外部可控，内部也可切换）
    autoPlayEnabled: {
      type: Boolean,
      default: false,
    },
    autoPlayIntervalMs: {
      type: Number,
      default: 1500,
    },
  },
  data() {
    return {
      // 全屏
      // fullscreenIconUrl,
      // 搜索
      // searchIconUrl,
      // 缩略图
      thumbnailIconUrl,
      // 目录
      outlineIconUrl,
      // 翻页
      pageFlipIconUrl,
      firstPageIconUrl,
      lastPageIconUrl,
      previousPageIconUrl,
      nextPageIconUrl,
      // 翻页声音
      // pageFlipAudioIconUrl,
      // 放大
      zoomInIconUrl,
      // 缩小
      zoomOutIconUrl,
      // 自动播放
      autoPlayIconUrl,
      // 暂停
      pauseIconUrl,
      isShowOutlineDrawer: false,
      isShowThumbnailDrawer: false,
      isEditingPageInput: false,
      // 自动播放相关（由 PdfReader 内部驱动）
      autoPlay: this.autoPlayEnabled,
      // Drawer/导航相关
      isShowPageNav: false,
      gotoPageInput: 1,
      // 页信息
      currentPage: 1,
      sliderValue: 1,
      totalPages: 0,
      // 缩放信息（单一目标倍数）
      currentScale: 1,
      lastScaleBeforeZoom: null,
    };
  },
  watch: {
    // 外部通过 prop 变更时，同步到本地 data
    autoPlayEnabled(val) {
      this.autoPlay = !!val;
    },
  },
  computed: {
    pageFieldDisplay() {
      return `${this.sliderValue}/${this.totalPages}`;
    },
  },
  methods: {
    // Drawer 关闭（按面板分别关闭）
    closeOutlineDrawer() {
      this.isShowOutlineDrawer = false;
    },
    closeThumbnailDrawer() {
      this.isShowThumbnailDrawer = false;
    },
    onOutlineDrawerClose() {
      console.log("[Demo1] outline drawer closed");
      this.isShowOutlineDrawer = false;
      const op = this.$refs.outlinePanel;
      if (op && typeof op.onParentClosed === "function") op.onParentClosed();
    },
    onThumbnailDrawerClose() {
      console.log("[Demo1] thumbnail drawer closed");
      this.isShowThumbnailDrawer = false;
      // 通知子组件更新可见状态（第二次及以后不会触发 mounted）
      const tp = this.$refs.thumbPanel;
      if (tp && typeof tp.onParentClosed === "function") tp.onParentClosed();
    },
    handleClickThumbnail() {
      console.log("[Demo1] open drawer: thumbnail");
      this.isShowThumbnailDrawer = true;
    },

    handleClickOutline() {
      console.log("[Demo1] open drawer: outline");
      this.isShowOutlineDrawer = true;
    },

    // Drawer 打开：作为“可见且挂载完成”的稳定时机
    onThumbnailOpened() {
      const tp = this.$refs.thumbPanel;
      if (tp && typeof tp.onParentOpened === "function") tp.onParentOpened();
    },
    onOutlineOpened() {
      const op = this.$refs.outlinePanel;
      if (op && typeof op.onParentOpened === "function") op.onParentOpened();
    },

    // 底部翻页导航：开关
    togglePageNav() {
      this.isShowPageNav = !this.isShowPageNav;
    },

    // 翻页能力（通过 PdfReader 暴露的方法）
    goPrevPage() {
      const r = this.$refs.pdfReader;
      if (r && typeof r.prevPage === "function" && (r.canGoPrev ?? true))
        r.prevPage();
    },
    goNextPage() {
      const r = this.$refs.pdfReader;
      if (r && typeof r.nextPage === "function" && (r.canGoNext ?? true))
        r.nextPage();
    },
    goFirstPage() {
      this.goToPage(1);
    },
    goLastPage() {
      const t = this.getTotalPages?.();
      if (Number.isFinite(t) && t && t > 0) this.goToPage(t);
    },
    goToPageByInput() {
      const n = Number(this.gotoPageInput);
      const t = this.getTotalPages?.() || 0;
      if (Number.isFinite(n) && n >= 1 && n <= t) this.goToPage(n);
    },
    // 进度条拖动：仅在拖动结束时触发（依赖 Slider 的 lazy-change）
    onSliderChange(val) {
      const n = Number(val);
      const t = this.getTotalPages?.() || 0;
      if (Number.isFinite(n) && n >= 1 && n <= t) this.goToPage(n);
    },

    // 与滑条交互开始：若处于编辑态则退出（避免不触发 blur 的情况）
    onSliderDragStart() {
      if (this.isEditingPageInput) {
        const ref = this.$refs.pageInput;
        if (ref && typeof ref.blur === "function") {
          try {
            ref.blur();
          } catch (e) {}
        }
        this.isEditingPageInput = false;
      }
    },

    // 下一页（单击“翻页”按钮）
    handleNextPage() {
      const r = this.$refs.pdfReader;
      if (r && typeof r.nextPage === "function" && r.canGoNext) {
        r.nextPage();
      }
    },

    // 放大：记录放大前倍数 -> 放大到目标倍数
    handleZoomIn() {
      const reader = this.$refs.pdfReader;
      if (reader && typeof reader.setScale === "function") {
        // 记录放大前的倍数，用于“缩小”恢复
        this.lastScaleBeforeZoom = this.currentScale;
        reader.setScale(this.zoomTarget);
      }
    },
    // 缩小：恢复到最近一次“放大前”的倍数，若没有记录则退回基线倍数
    handleResetZoom() {
      const reader = this.$refs.pdfReader;
      if (reader && typeof reader.setScale === "function") {
        const fallback =
          typeof reader.getBaselineScale === "function"
            ? reader.getBaselineScale()
            : 1;
        const target =
          typeof this.lastScaleBeforeZoom === "number"
            ? this.lastScaleBeforeZoom
            : fallback;
        reader.setScale(target);
        // 恢复后清除记录
        this.lastScaleBeforeZoom = null;
      }
    },

    // 自动播放：交由 PdfReader 内部实现，这里仅切换 props，并向外同步（.sync）
    handleToggleAutoPlay() {
      this.autoPlay = !this.autoPlay;
      this.$emit("update:autoPlayEnabled", this.autoPlay);
    },

    // Drawer -> PdfReader 的方法转发（Plan A）
    getOutline() {
      const r = this.$refs.pdfReader;
      return r && typeof r.getOutline === "function" ? r.getOutline() : [];
    },
    renderThumbnail(pageNumber, canvasEl, options) {
      const r = this.$refs.pdfReader;
      return r && typeof r.renderThumbnail === "function"
        ? r.renderThumbnail(pageNumber, canvasEl, options)
        : Promise.resolve();
    },

    // 页码输入：编辑/回显切换
    startEditPage() {
      this.gotoPageInput = this.sliderValue;
      this.isEditingPageInput = true;
      this.$nextTick(() => {
        const pageInputRef = this.$refs.pageInput;
        if (typeof pageInputRef?.focus === "function") pageInputRef?.focus();
      });
    },
    finishEditPage() {
      this.isEditingPageInput = false;
      this.goToPageByInput();
    },
    cancelEditPage() {
      // 仅退出编辑态，不进行跳转
      this.isEditingPageInput = false;
    },
    handlePageFieldClick() {
      if (!this.isEditingPageInput) {
        this.startEditPage();
      }
    },
    onPageFieldInput(val) {
      if (this.isEditingPageInput) {
        this.gotoPageInput = Number(val);
      }
    },

    goToPage(n) {
      const r = this.$refs.pdfReader;
      if (r && typeof r.goToPage === "function") r.goToPage(n);
    },
    getTotalPages() {
      const r = this.$refs.pdfReader;
      return r && typeof r.getTotalPages === "function" ? r.getTotalPages() : 0;
    },
    navigateToDestination(dest) {
      const r = this.$refs.pdfReader;
      return r && typeof r.navigateToDestination === "function"
        ? r.navigateToDestination(dest)
        : Promise.resolve();
    },
    resolveDestToPageNumber(dest) {
      const r = this.$refs.pdfReader;
      return r && typeof r.resolveDestToPageNumber === "function"
        ? r.resolveDestToPageNumber(dest)
        : Promise.resolve(null);
    },

    // 以下事件用于和外层 UI 同步，并向外转发事件
    onPdfLoaded(e) {
      this.totalPages = this.getTotalPages?.() || 0;
      this.gotoPageInput = this.currentPage;
      this.sliderValue = this.currentPage;
      // 同步 PdfReader 的当前缩放到本地，用于阈值切换显示缩放按钮
      const r = this.$refs.pdfReader;
      if (r) {
        if (typeof r.currentScale === "number")
          this.currentScale = r.currentScale;
        if (!this._unwatchReaderScale && typeof r.$watch === "function") {
          this._unwatchReaderScale = r.$watch("currentScale", s => {
            if (typeof s === "number") this.currentScale = s;
          });
        }
      }
      this.$emit("document-loaded", e);
    },
    onPdfError(e) {
      console.error("PDF 加载失败", e);
      this.$emit("document-error", e);
    },
    onPdfPageChanged(e) {
      if (e && e.pageNumber) {
        this.currentPage = e.pageNumber;
        this.gotoPageInput = e.pageNumber;
        this.sliderValue = e.pageNumber;
      }
      this.$emit("page-changed", e);
    },
    onLoadingStart(e) {
      this.$emit("loading-start", e);
    },
    onLoadingStop(e) {
      this.$emit("loading-stop", e);
    },

    onPdfScaleChanged(e) {
      const s = typeof e === "number" ? e : e && e.scale;
      if (typeof s === "number") this.currentScale = s;
      this.$emit("scale-changed", e);
    },
  },
};
</script>

<style lang="less" scoped>
.complex-pdf-reader {
  @top-toolbar-height: 2.73rem;
  @bottom-toolbar-height: 4.14rem;

  /* z-index */
  --z-canvas: 0;
  --z-text: 1;
  --z-annot: 2;
  --z-toolbar: 10;
  --z-page-nav: 9;
  --z-page-nav-open: 11;

  position: relative;

  height: 100%;
  padding-top: @top-toolbar-height;
  padding-bottom: @bottom-toolbar-height;

  background-image: url("@/assets/images/complexPdfReader/full-background-2x.jpg");
  background-repeat: no-repeat;
  background-size: 100% 100%;

  .top-toolbar {
    position: absolute;
    top: 0;

    display: flex;
    justify-content: flex-end;

    width: 100%;
    height: @top-toolbar-height;

    opacity: 0.7;
    background-image: linear-gradient(
      180deg,
      #ffffff 0%,
      rgba(255, 255, 255, 0.6) 100%
    );
    box-shadow: 0 0.29rem 0.29rem 0 rgba(0, 0, 0, 0.05);
    border-radius: 0 0 0.57rem 0.57rem;

    .right-operate-tool {
      display: flex;
      align-items: center;
      margin-right: 1.64rem;

      .search-tool-item {
        width: 1.23rem;
        height: 1.42rem;
        margin-right: 2.06rem;
      }

      .fullscreen-tool-item {
        width: 1.46rem;
        height: 1.46rem;
      }
    }
  }

  .content-area {
    height: 100%;
  }

  .page-nav {
    position: absolute;
    left: 0;
    right: 0;
    bottom: @bottom-toolbar-height;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0.8rem 2.39rem;
    background: #fff;
    //box-shadow: 0 -0.29rem 0.29rem rgba(0, 0, 0, 0.05);
    border-radius: 0.43rem 0.43rem 0 0;
    // 初始收起：下滑隐藏，避免遮挡与点击穿透
    transform: translateY(100%);
    opacity: 0;
    z-index: var(--z-page-nav);
    transition: all 240ms ease;
    &.is-open {
      transform: translateY(0);
      opacity: 1;
      z-index: var(--z-page-nav-open);
    }
    .nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      flex-wrap: wrap;

      .nav-row-item {
        width: 0.7rem;
        height: 1.3rem;

        &.first-page,
        &.last-page {
          width: 0.9rem;
          height: 1.2rem;
        }
      }
    }

    .slider-wrap {
      margin: 10px 0;

      &.van-slider {
        background: #cbcbcb;
      }

      .custom-slide-button {
        width: 1.43rem;
        height: 1.43rem;
        background: #e5d7f6;
        border-radius: 50%;
        border: 3px solid #7e38d2;
      }
    }

    .page-input {
      display: flex;
      align-items: center;
      padding: 0;
      width: 12rem;
      height: 2rem;
      border: 0.07rem solid rgba(241, 234, 250, 1);
      border-radius: 3.21rem;

      font-size: 0.86rem;
      color: #000000;
      letter-spacing: 0;
      font-weight: 400;
    }
  }

  .bottom-toolbar {
    position: absolute;
    bottom: 0;

    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;
    height: @bottom-toolbar-height;
    padding: 0 2.39rem;

    opacity: 0.7;
    background-image: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
    //box-shadow: 0 -0.29rem 0.29rem 0 rgba(0, 0, 0, 0.05);
    //border-radius: 0.43rem 0.43rem 0 0;
    z-index: var(--z-toolbar);

    .thumbnail-tool-item {
      width: 1.7rem;
      height: 1.56rem;
    }

    .outline-tool-item {
      width: 1.43rem;
      height: 1.29rem;
    }

    .page-flip-tool-item {
      width: 1.74rem;
      height: 0.68rem;
    }

    .page-flip-audio-tool-item {
      width: 1.21rem;
      height: 1.91rem;
    }

    .zoom-in-tool-item,
    .zoom-out-tool-item {
      width: 1.29rem;
      height: 1.52rem;
    }

    .auto-play-tool-item,
    .pause-tool-item {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
}
</style>
