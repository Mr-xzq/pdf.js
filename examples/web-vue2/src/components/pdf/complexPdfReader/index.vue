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
      <pdf-viewport
        ref="pdfReader"
        :src="src"
        :initial-page="initialPage"
        :initial-scale="initialScale"
        :auto-play-enabled="autoPlay"
        :auto-play-interval-ms="autoPlayIntervalMs"
        @document-loaded="onPdfLoaded"
        @document-error="onPdfError"
        @page-changed="onPdfPageChanged"
        @scale-changed="onPdfScaleChanged"
        @page-rendered="onPdfPageRendered"
        @render-error="onPdfRenderError"
        @loading-start="onLoadingStart"
        @loading-stop="onLoadingStop"
        @auto-play-ended="onAutoPlayEnded"
      />
    </div>
    <div class="bottom-toolbar" :class="{ 'is-open-page-nav': isShowPageNav }">
      <div class="page-nav" :class="{ 'is-open': isShowPageNav }">
        <div class="nav-row">
          <TouchIconButton
            :src="firstPageIconUrl"
            img-class="nav-row-item first-page"
            :min-size="30"
            @click="goToPage(1)"
          />

          <TouchIconButton :src="previousPageIconUrl" img-class="nav-row-item" :min-size="30" @click="prevPage" />

          <van-field
            ref="pageInput"
            class="page-input"
            :value="isEditingPageInput ? String(gotoPageInput || '') : pageFieldDisplay"
            :readonly="!isEditingPageInput"
            type="text"
            input-align="center"
            @click="handlePageFieldClick"
            @input="onPageFieldInput"
            @blur="cancelEditPage"
            @keyup.enter.native="finishEditPage"
          />

          <TouchIconButton :src="nextPageIconUrl" img-class="nav-row-item" :min-size="30" @click="nextPage" />

          <TouchIconButton
            :src="lastPageIconUrl"
            img-class="nav-row-item last-page"
            :min-size="30"
            @click="goToPage(totalPages)"
          />
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

      <div class="bottom-toolbar-tool-list">
        <TouchIconButton :src="thumbnailIconUrl" img-class="thumbnail-tool-item" @click="handleClickThumbnail" />
        <TouchIconButton :src="outlineIconUrl" img-class="outline-tool-item" @click="handleClickOutline" />
        <TouchIconButton :src="pageFlipIconUrl" img-class="page-flip-tool-item" @click="togglePageNav" />
        <!-- <van-image
          class="page-flip-audio-tool-item"
          :src="pageFlipAudioIconUrl"
        ></van-image> -->
        <!-- 缩放：切换按钮（依据是否存在 lastScaleBeforeZoom 来互斥显示） -->
        <template>
          <TouchIconButton
            v-show="!lastScaleBeforeZoom"
            :src="zoomInIconUrl"
            img-class="zoom-in-tool-item"
            @click="handleZoomIn"
          />
          <TouchIconButton
            v-show="lastScaleBeforeZoom"
            :src="zoomOutIconUrl"
            img-class="zoom-out-tool-item"
            @click="handleResetZoom"
          />
        </template>

        <!-- 自动播放/暂停 -->
        <template>
          <TouchIconButton
            v-show="!autoPlay"
            :src="autoPlayIconUrl"
            img-class="auto-play-tool-item"
            @click="handleToggleAutoPlay"
          />
          <TouchIconButton
            v-show="autoPlay"
            :src="pauseIconUrl"
            img-class="auto-play-tool-item"
            @click="handleToggleAutoPlay"
          />
        </template>
      </div>
    </div>

    <drawer :is-show.sync="isShowOutlineDrawer" title="目录" @closed="onOutlineDrawerClosed" @opened="onOutlineOpened">
      <outline-panel
        :key="pdfDocKey"
        ref="outlinePanel"
        :current-page="currentPage"
        :get-outline="getOutline"
        :navigate-to-destination="navigateToDestination"
        :resolve-dest-to-page-number="resolveDestToPageNumber"
        @selected="closeOutlineDrawer"
      />
    </drawer>
    <drawer
      :is-show.sync="isShowThumbnailDrawer"
      title="缩略图"
      @closed="onThumbnailDrawerClosed"
      @opened="onThumbnailOpened"
    >
      <thumbnail-panel
        :key="pdfDocKey"
        ref="thumbPanel"
        :current-page="currentPage"
        :total-pages="totalPages"
        :render-thumbnail="renderThumbnail"
        :go-to-page="goToPage"
        @selected="closeThumbnailDrawer"
      />
    </drawer>
  </div>
</template>

<script>
// 引入组件
import PdfViewport from "./components/pdfReaderCore/index.vue";
import Drawer from "./components/Drawer.vue";
import OutlinePanel from "./components/OutlinePanel.vue";
import ThumbnailPanel from "./components/ThumbnailPanel.vue";
import TouchIconButton from "./components/TouchIconButton.vue";

// 引入图标
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

// 引入第三方库
import { mapActions, mapGetters } from "vuex";

export default {
  name: "ComplexPdfReader",
  components: {
    Drawer,
    PdfViewport,
    OutlinePanel,
    ThumbnailPanel,
    TouchIconButton,
  },
  props: {
    src: {
      type: String,
      default: "",
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
    // 点击放大目标倍数
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
  mounted() {
    this.pdfReaderRef = this.$refs.pdfReader ?? {};
    this.pageInputRef = this.$refs.pageInput ?? {};
  },
  data() {
    return {
      pdfReaderRef: {},
      pageInputRef: {},

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
      isShowPageNav: false,
      gotoPageInput: 1,
      // 用于 slider 展示与拖动中的临时值（实际跳转由 @change 触发）
      sliderValue: 1,
      // 仅用于“放大后可还原”的 UI 状态
      lastScaleBeforeZoom: null,

      // 当前已加载文档的指纹，用于触发子组件重新挂载
      docFingerprint: null,
    };
  },
  watch: {
    // 外部通过 prop 变更时，同步到本地 data
    autoPlayEnabled(val) {
      this.autoPlay = !!val;
    },
    // 监听真实页码：用于同步 slider 显示与输入框
    currentPage(n) {
      if (Number.isFinite(n)) {
        this.sliderValue = n;
        this.gotoPageInput = n;
      }
    },
  },
  computed: {
    ...mapGetters("complexPdfReader", ["navigationState", "zoomState", "isLoading", "loadingMessage"]),
    currentPage() {
      return this.navigationState?.currentPage || 1;
    },
    totalPages() {
      return this.navigationState?.totalPages || 0;
    },
    pageFieldDisplay() {
      return `${this.sliderValue}/${this.totalPages}`;
    },
    // 用于强制子面板在文档切换/加载完成时重新挂载：src + 指纹
    pdfDocKey() {
      const s = this.src || "";
      const f = this.docFingerprint || "";
      return `${s}|${f}`;
    },
  },
  methods: {
    ...mapActions("complexPdfReader", {
      goToPageAction: "goToPage",
      nextPageAction: "nextPage",
      prevPageAction: "prevPage",
      setScale: "setScale",
      runWithLoadPending: "runWithLoadPending",
    }),

    async goToPage(n) {
      const t = this.totalPages || 0;
      if (!Number.isFinite(n) || n < 1 || n > t) return;
      if (n === this.currentPage) return;
      await this.runWithLoadPending({
        message: "跳转页面",
        run: () => this.goToPageAction(n),
      });
    },
    async nextPage() {
      const t = this.totalPages || 0;
      const cur = this.currentPage || 0;
      if (!Number.isFinite(cur) || !Number.isFinite(t) || cur >= t || t <= 0) return;
      await this.runWithLoadPending({
        message: "下一页",
        run: () => this.nextPageAction(),
      });
    },
    async prevPage() {
      const cur = this.currentPage || 0;
      if (!Number.isFinite(cur) || cur <= 1) return;
      await this.runWithLoadPending({
        message: "上一页",
        run: () => this.prevPageAction(),
      });
    },

    handleClickThumbnail() {
      console.log("open drawer: thumbnail");
      this.isShowThumbnailDrawer = true;
    },
    handleClickOutline() {
      console.log("open drawer: outline");
      this.isShowOutlineDrawer = true;
    },
    onThumbnailOpened() {
      console.log("opened drawer: thumbnail");
      this.$refs.thumbPanel?.onParentOpened?.();
    },
    onOutlineOpened() {
      console.log("opened drawer: outline");
      this.$refs.outlinePanel?.onParentOpened?.();
    },
    // Drawer 关闭（按面板分别关闭）
    closeOutlineDrawer() {
      this.isShowOutlineDrawer = false;
    },
    closeThumbnailDrawer() {
      this.isShowThumbnailDrawer = false;
    },
    onOutlineDrawerClosed() {
      console.log("closed drawer: outline");
      this.isShowOutlineDrawer = false;
      this.$refs.outlinePanel?.onParentClosed();
    },
    onThumbnailDrawerClosed() {
      console.log("closed drawer: thumbnail");
      this.isShowThumbnailDrawer = false;
      // 通知子组件更新可见状态
      this.$refs.thumbPanel?.onParentClosed();
    },
    // 底部翻页导航
    togglePageNav() {
      this.isShowPageNav = !this.isShowPageNav;
    },
    goToPageByInput() {
      const n = Number(this.gotoPageInput);
      const t = this.totalPages || 0;
      if (Number.isFinite(n) && n >= 1 && n <= t) this.goToPage(n);
    },
    // slider 进度变化且结束拖动后触发
    onSliderChange(val) {
      const n = Number(val);
      const t = this.totalPages || 0;
      if (Number.isFinite(n) && n >= 1 && n <= t) this.goToPage(n);
    },
    // 与滑条交互开始：若处于编辑态则退出（避免不触发 blur 的情况）
    onSliderDragStart() {
      if (this.isEditingPageInput) {
        this.pageInputRef?.blur();
        this.isEditingPageInput = false;
      }
    },
    // 放大：记录放大前倍数 -> 放大到目标倍数
    handleZoomIn() {
      // 记录放大前的倍数（从 Store 获取当前缩放）
      this.lastScaleBeforeZoom = this.zoomState?.scale || this.lastScaleBeforeZoom || 1;
      this.setScale(this.zoomTarget);
    },

    // 缩小：恢复到最近一次“放大前”的倍数，若没有记录则退回基础倍数
    handleResetZoom() {
      const target = this.lastScaleBeforeZoom;
      if (typeof target === "number") this.setScale(target);
      // 恢复后清除记录
      this.lastScaleBeforeZoom = null;
    },

    // 切换自动播放
    handleToggleAutoPlay() {
      this.autoPlay = !this.autoPlay;
      this.$emit("update:autoPlayEnabled", this.autoPlay);
    },
    onAutoPlayEnded() {
      // 子组件自动播放到达最后一页
      this.autoPlay = false;
      this.$emit("update:autoPlayEnabled", false);
    },
    getOutline() {
      return this.pdfReaderRef?.getOutline();
    },
    renderThumbnail(pageNumber, canvasEl, options) {
      return this.pdfReaderRef?.renderThumbnail(pageNumber, canvasEl, options);
    },
    // 页码输入：编辑/回显切换
    startEditPage() {
      this.gotoPageInput = this.sliderValue;
      this.isEditingPageInput = true;
      this.$nextTick(() => {
        this.pageInputRef?.focus();
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
    navigateToDestination(dest) {
      return this.pdfReaderRef?.navigateToDestination(dest);
    },
    resolveDestToPageNumber(dest) {
      return this.pdfReaderRef?.resolveDestToPageNumber(dest);
    },
    onPdfLoaded(e) {
      // 输入框 & slider 的初始值回显
      this.gotoPageInput = this.currentPage;
      this.sliderValue = this.currentPage;
      // 记录文档指纹（若缺失则兜底一个唯一值）
      this.docFingerprint = e?.info?.fingerprint || String(Date.now());
      this.$emit("document-loaded", e);
      // 注意：初始化时不触发翻页 loading，避免与文档级 loading 冲突
    },
    onPdfError(e) {
      console.error("PDF 加载失败", e);
      // 强制 Outline/Thumb 重新挂载
      this.docFingerprint = `error:${Date.now()}`;
      this.$emit("document-error", e);
    },
    onPdfPageChanged(e) {
      if (e?.pageNumber) {
        this.gotoPageInput = e.pageNumber;
        this.sliderValue = e.pageNumber;
      }
      this.$emit("page-changed", e);
    },
    onLoadingStart(e) {
      const payload = {
        source: e?.source || "core",
        message: this.loadingMessage,
      };
      this.$emit("loading-start", payload);
    },
    onLoadingStop(e) {
      this.$emit("loading-stop", e);
    },
    onPdfScaleChanged(e) {
      this.$emit("scale-changed", e);
    },
    onPdfPageRendered(e) {
      this.$emit("page-rendered", e);
    },
    onPdfRenderError(e) {
      this.$emit("render-error", e);
    },
  },
};
</script>

<style lang="less" scoped>
.complex-pdf-reader {
  --top-toolbar-height: 2.73rem;
  --bottom-toolbar-height: 4.14rem;

  // z-index 不同层的渲染
  --z-annot: 2;
  --z-bottom-toolbar-tool-list: 10;

  position: relative;
  box-sizing: border-box;

  height: 100%;
  // padding-top: var(--top-toolbar-height);
  padding-bottom: var(--bottom-toolbar-height);

  background-image: url("@/assets/images/complexPdfReader/full-background-2x.jpg");
  background-repeat: no-repeat;
  background-size: 100% 100%;

  * {
    box-sizing: border-box;
  }

  .top-toolbar {
    position: absolute;
    top: 0;

    display: flex;
    justify-content: flex-end;

    width: 100%;
    height: var(--top-toolbar-height);

    opacity: 0.7;
    background-image: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%);

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

  .bottom-toolbar {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: var(--bottom-toolbar-height);
    overflow: hidden;
    background-color: rgba(256, 256, 256, 0.7);

    &.is-open-page-nav {
      overflow: initial;
    }

    /deep/ .page-nav {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.8rem 2.39rem;
      background: #fff;
      border-radius: 0.43rem 0.43rem 0 0;
      // 初始收起：下滑隐藏
      transform: translateY(calc(100% + var(--bottom-toolbar-height)));
      // 防止遮住
      z-index: calc(var(--z-bottom-toolbar-tool-list) - 1);
      transition: all 240ms ease;

      &.is-open {
        transform: translateY(calc(-1 * var(--bottom-toolbar-height)));
      }

      .nav-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        flex-wrap: wrap;
        margin-bottom: 8px;

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

    /deep/ .bottom-toolbar-tool-list {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: rgba(256, 256, 256, 0.7);

      width: 100%;
      height: 100%;
      padding: 0 2.39rem;

      z-index: var(--z-bottom-toolbar-tool-list);

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
}
</style>
