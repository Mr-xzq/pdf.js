<template>
  <div class="complex-pdf-reader">
    <!-- 结构与 mobile/complex 一致，后续 Desktop 仅在此基础上演进样式与交互 -->
    <div class="content-area">
      <pdf-viewport
        ref="pdfReader"
        :src="src"
        :initial-page="initialPage"
        :initial-scale="initialScale"
        :auto-play-enabled="autoPlay"
        :auto-play-interval-ms="autoPlayIntervalMs"
        @document-loaded="onPdfLoaded"
        @auto-play-ended="onAutoPlayEnded"
        @container-resized="handleViewportResized"
      />
    </div>
    <div class="bottom-toolbar">
      <div class="bottom-toolbar-tool-list">
        <div class="toolbar-section toolbar-section--left">
          <TouchIconButton :src="thumbnailIconUrl" img-class="thumbnail-tool-item" @click="handleClickThumbnail" />
          <TouchIconButton :src="outlineIconUrl" img-class="outline-tool-item" @click="handleClickOutline" />
        </div>

        <div class="toolbar-section toolbar-section--center">
          <div class="page-nav">
            <div class="nav-row">
              <TouchIconButton
                :src="firstPageIconUrl"
                img-class="nav-row-item first-page"
                :min-size="30"
                @click="goToPage(1)"
              />

              <TouchIconButton :src="previousPageIconUrl" img-class="nav-row-item" :min-size="30" @click="prevPage" />

              <el-input
                ref="pageInput"
                class="page-input"
                :value="isEditingPageInput ? String(gotoPageInput || '') : pageFieldDisplay"
                :readonly="!isEditingPageInput"
                type="text"
                @click.native="handlePageFieldClick"
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
          </div>
        </div>

        <div class="toolbar-section toolbar-section--right">
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

    <!-- Desktop 缩略图：采用 Wrapper + Content 组合，内容单行左右滚动，不再区分列数 -->
    <thumbnail-wrapper
      :is-show.sync="isShowThumbnailDrawer"
      title="缩略图"
      @closed="onThumbnailDrawerClosed"
      @opened="onThumbnailOpened"
    >
      <thumbnail-content
        :key="pdfDocKey"
        ref="thumbPanel"
        :current-page="currentPage"
        :total-pages="totalPages"
        :render-thumbnail="renderThumbnail"
        :go-to-page="goToPage"
        @selected="closeThumbnailDrawer"
      />
    </thumbnail-wrapper>
  </div>
</template>

<script>
// Desktop 版本复用自身目录下的组件，实现与 mobile/complex 解耦
import PdfViewport from "./components/pdfReaderCore/index.vue";
import Drawer from "./components/Drawer.vue";
import OutlinePanel from "./components/OutlinePanel.vue";
import ThumbnailWrapper from "./components/Thumbnail/ThumbnailWrapper.vue";
import ThumbnailContent from "./components/Thumbnail/ThumbnailContent.vue";
import TouchIconButton from "./components/TouchIconButton.vue";
import { isValidPageNumber } from "@/components/pdf/core/pdf-utils.js";
import { ERROR_TYPES } from "@/components/pdf/core/pdf-config.js";
import { mapActions, mapMutations, mapGetters, mapState } from "vuex";

// 静态资源：先直接复用移动端 Complex 的资源，后续 Desktop UI 统一替换
import thumbnailIconUrl from "@/assets/images/complexPdfReader/thumbnail-2x.png";
import outlineIconUrl from "@/assets/images/complexPdfReader/outline-2x.png";
import firstPageIconUrl from "@/assets/images/complexPdfReader/firstPage-2x.png";
import lastPageIconUrl from "@/assets/images/complexPdfReader/lastPage-2x.png";
import previousPageIconUrl from "@/assets/images/complexPdfReader/previousPage-2x.png";
import nextPageIconUrl from "@/assets/images/complexPdfReader/nextPage-2x.png";
import zoomInIconUrl from "@/assets/images/complexPdfReader/zoom-in-2x.png";
import zoomOutIconUrl from "@/assets/images/complexPdfReader/zoom-out-2x.png";
import autoPlayIconUrl from "@/assets/images/complexPdfReader/auto-play-2x.png";
import pauseIconUrl from "@/assets/images/complexPdfReader/pause-2x.png";

export default {
  name: "DesktopComplexPdfReader",
  components: {
    Drawer,
    PdfViewport,
    OutlinePanel,
    ThumbnailWrapper,
    ThumbnailContent,
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

      // 图标与 UI 状态，与 mobile/complex 保持一致，后续 Desktop 可按需调整
      thumbnailIconUrl,
      outlineIconUrl,
      firstPageIconUrl,
      lastPageIconUrl,
      previousPageIconUrl,
      nextPageIconUrl,
      zoomInIconUrl,
      zoomOutIconUrl,
      autoPlayIconUrl,
      pauseIconUrl,
      isShowOutlineDrawer: false,
      isShowThumbnailDrawer: false,
      isEditingPageInput: false,
      // 自动播放相关（由 PdfReader 内部驱动）
      autoPlay: this.autoPlayEnabled,
      gotoPageInput: 1,
      lastScaleBeforeZoom: null,

      // 当前已加载文档的指纹，用于触发子组件重新挂载
      docFingerprint: null,
    };
  },
  watch: {
    autoPlayEnabled(val) {
      this.autoPlay = !!val;
    },
    currentPage(newPageNumber, oldPageNumber) {
      if (isValidPageNumber(newPageNumber)) {
        this.gotoPageInput = newPageNumber;
        this.$emit("page-changed", { newPageNumber, oldPageNumber });
      }
    },
    storeError(err) {
      if (err) {
        this.$emit("error", err);
        if (err.type === ERROR_TYPES.LOAD_ERROR) {
          this.docFingerprint = `error:${Date.now()}`;
        }
      }
    },
    isLoading(val) {
      if (val) {
        this.$emit("loading-start", {
          message: this.loadingMessage,
        });
      } else {
        this.$emit("loading-stop");
      }
    },
  },
  computed: {
    ...mapState("pdfReaderCore", { storeError: "error" }),
    ...mapGetters("pdfReaderCore", ["navigationState", "zoomState", "isLoading", "loadingMessage"]),
    currentPage() {
      return this.navigationState?.currentPage || 1;
    },
    totalPages() {
      return this.navigationState?.totalPages || 0;
    },
    pageFieldDisplay() {
      return `${this.currentPage}/${this.totalPages}`;
    },
    pdfDocKey() {
      const s = this.src || "";
      const f = this.docFingerprint || "";
      return `${s}|${f}`;
    },
  },
  methods: {
    ...mapMutations("pdfReaderCore", ["SET_ERROR"]),
    ...mapActions("pdfReaderCore", {
      goToPageAction: "goToPage",
      nextPageAction: "nextPage",
      prevPageAction: "prevPage",
      setScale: "setScale",
      runWithLoadPending: "runWithLoadPending",
    }),
    async goToPage(pageNumber) {
      if (!isValidPageNumber(pageNumber)) return;
      if (pageNumber === this.currentPage) return;
      await this.runWithLoadPending({
        message: "跳转页面",
        run: () => this.goToPageAction(pageNumber),
      });
    },
    async nextPage() {
      const next = (this.currentPage || 0) + 1;
      if (!isValidPageNumber(next)) return;
      await this.runWithLoadPending({
        message: "下一页",
        run: () => this.nextPageAction(),
      });
    },
    async prevPage() {
      const prev = (this.currentPage || 0) - 1;
      if (!isValidPageNumber(prev)) return;
      await this.runWithLoadPending({
        message: "上一页",
        run: () => this.prevPageAction(),
      });
    },
    handleClickThumbnail() {
      this.isShowThumbnailDrawer = true;
    },
    handleClickOutline() {
      this.isShowOutlineDrawer = true;
    },
    // Desktop：缩略图浮层打开时，由 Wrapper 触发，转发给内容组件
    onThumbnailOpened() {
      this.$refs.thumbPanel?.onParentOpened?.();
    },
    onOutlineOpened() {
      this.$refs.outlinePanel?.onParentOpened?.();
    },
    closeOutlineDrawer() {
      this.isShowOutlineDrawer = false;
    },
    closeThumbnailDrawer() {
      this.isShowThumbnailDrawer = false;
    },
    onOutlineDrawerClosed() {
      this.isShowOutlineDrawer = false;
      this.$refs.outlinePanel?.onParentClosed();
    },
    // Desktop：缩略图浮层关闭时，由 Wrapper 触发，转发给内容组件
    onThumbnailDrawerClosed() {
      this.$refs.thumbPanel?.onParentClosed?.();
    },
    goToPageByInput() {
      const pageNumber = Number(this.gotoPageInput);
      if (isValidPageNumber(pageNumber)) {
        this.goToPage(pageNumber);
      }
    },
    handleZoomIn() {
      this.lastScaleBeforeZoom = this.zoomState?.scale || this.lastScaleBeforeZoom || 1;
      this.setScale(this.zoomTarget);
    },
    handleResetZoom() {
      const target = this.lastScaleBeforeZoom;
      if (typeof target === "number") this.setScale(target);
      this.lastScaleBeforeZoom = null;
    },
    // 容器尺寸变化时，由子组件重新适配整页，此时认为手动放大状态应被还原
    handleViewportResized() {
      this.handleResetZoom();
    },
    handleToggleAutoPlay() {
      this.autoPlay = !this.autoPlay;
      this.$emit("update:autoPlayEnabled", this.autoPlay);
    },
    onAutoPlayEnded() {
      this.autoPlay = false;
      this.$emit("update:autoPlayEnabled", false);
    },
    getOutline() {
      return this.pdfReaderRef?.getOutline();
    },
    renderThumbnail(pageNumber, canvasEl, options) {
      return this.pdfReaderRef?.renderThumbnail(pageNumber, canvasEl, options);
    },
    startEditPage() {
      this.gotoPageInput = this.currentPage;
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
      this.gotoPageInput = this.currentPage;
      this.docFingerprint = e?.info?.fingerprint || String(Date.now());
      this.$emit("document-loaded", e);
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
    background-color: rgba(256, 256, 256, 0.7);

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

      .toolbar-section {
        display: flex;
        align-items: center;
      }

      .toolbar-section--left {
        gap: 1.5rem;
      }

      .toolbar-section--center {
        flex: 1;
        justify-content: center;

        .page-nav {
          display: flex;
          align-items: center;

          .nav-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;

            .nav-row-item {
              width: 0.7rem;
              height: 1.3rem;

              &.first-page,
              &.last-page {
                width: 0.9rem;
                height: 1.2rem;
              }
            }

            .page-input {
              width: 7rem;
              height: 2rem;

              .el-input__inner {
                display: flex;
                text-align: center;
                padding: 0;
                height: 100%;
                line-height: initial;
                border: 0.07rem solid rgba(241, 234, 250, 1);
                border-radius: 3.21rem;

                font-size: 0.86rem;
                color: #000000;
                letter-spacing: 0;
                font-weight: 400;
              }
            }
          }
        }
      }

      .toolbar-section--right {
        gap: 1.5rem;
      }

      .thumbnail-tool-item {
        width: 1.7rem;
        height: 1.56rem;
      }

      .outline-tool-item {
        width: 1.43rem;
        height: 1.29rem;
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
