<template>
  <div class="complex-pdf-reader">
    <div class="content-area-wrapper">
      <div class="content-area" :style="contentAreaStyle">
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

      <!-- 上一页 / 下一页按钮 -->
      <TouchIconButton
        v-show="canPrevPage"
        :src="sidePagePreviousIconUrl"
        :class="['side-page-nav', 'side-page-nav-left']"
        img-class="side-page-nav-icon"
        @click="prevPage"
      />
      <TouchIconButton
        v-show="canNextPage"
        :src="sidePageNextIconUrl"
        :class="['side-page-nav', 'side-page-nav-right']"
        img-class="side-page-nav-icon"
        @click="nextPage"
      />
    </div>
    <div class="bottom-toolbar">
      <div class="bottom-toolbar-tool-list">
        <div class="toolbar-section toolbar-section-left">
          <TouchIconButton :src="thumbnailIconUrl" img-class="thumbnail-tool-item" @click="handleClickThumbnail" />
          <TouchIconButton :src="outlineIconUrl" img-class="outline-tool-item" @click="handleClickOutline" />
        </div>

        <div class="toolbar-section toolbar-section-center">
          <div class="page-nav">
            <div class="nav-row">
              <TouchIconButton
                :src="firstPageIconUrl"
                img-class="nav-row-item first-page"
                :min-size="40"
                @click="goToPage(1)"
              />

              <TouchIconButton :src="previousPageIconUrl" img-class="nav-row-item" :min-size="40" @click="prevPage" />

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

              <TouchIconButton :src="nextPageIconUrl" img-class="nav-row-item" :min-size="40" @click="nextPage" />

              <TouchIconButton
                :src="lastPageIconUrl"
                img-class="nav-row-item last-page"
                :min-size="40"
                @click="goToPage(totalPages)"
              />
            </div>
          </div>
        </div>

        <div class="toolbar-section toolbar-section-right">
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

    <outline-wrapper :is-show.sync="isShowOutline" title="目录" @closed="onOutlineClosed" @opened="onOutlineOpened">
      <outline-content
        :key="pdfDocKey"
        ref="outlinePanel"
        :current-page="currentPage"
        :get-outline="getOutline"
        :navigate-to-destination="navigateToDestination"
        :resolve-dest-to-page-number="resolveDestToPageNumber"
      />
    </outline-wrapper>

    <!-- 缩略图 -->
    <thumbnail-wrapper :is-show.sync="isShowThumbnail" @closed="onThumbnailClosed" @opened="onThumbnailOpened">
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
import PdfViewport from "./components/pdfReaderCore/index.vue";
import OutlineWrapper from "./components/Outline/OutlineWrapper.vue";
import OutlineContent from "./components/Outline/OutlineContent.vue";
import ThumbnailWrapper from "./components/Thumbnail/ThumbnailWrapper.vue";
import ThumbnailContent from "./components/Thumbnail/ThumbnailContent.vue";
import TouchIconButton from "./components/TouchIconButton.vue";
import { isValidPageNumber } from "@/components/pdf/core/pdf-utils.js";
import { ERROR_TYPES } from "@/components/pdf/core/pdf-config.js";
import { mapActions, mapMutations, mapGetters, mapState } from "vuex";

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
import sidePagePreviousIconUrl from "@/assets/images/complexPdfReader/side-page-previous-2x.png";
import sidePageNextIconUrl from "@/assets/images/complexPdfReader/side-page-next-2x.png";

export default {
  name: "DesktopComplexPdfReader",
  components: {
    PdfViewport,
    OutlineWrapper,
    OutlineContent,
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
      sidePagePreviousIconUrl,
      sidePageNextIconUrl,
      isShowOutline: false,
      isShowThumbnail: false,
      isEditingPageInput: false,
      // 自动播放相关（由 PdfReader 内部驱动）
      autoPlay: this.autoPlayEnabled,
      gotoPageInput: 1,
      lastScaleBeforeZoom: null,
      // 目录抽屉实际占据的左侧宽度（px），用于动态推开 content 区域
      outlineLeftOffset: 0,

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
    canPrevPage() {
      return this.navigationState?.canGoPrev;
    },
    canNextPage() {
      return this.navigationState?.canGoNext;
    },
    pageFieldDisplay() {
      return `${this.currentPage}/${this.totalPages}`;
    },
    pdfDocKey() {
      const s = this.src || "";
      const f = this.docFingerprint || "";
      return `${s}|${f}`;
    },
    contentAreaStyle() {
      return {
        marginLeft: this.outlineLeftOffset + "px",
      };
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
      if (!this.canNextPage) return;

      await this.runWithLoadPending({
        message: "下一页",
        run: () => this.nextPageAction(),
      });
    },
    async prevPage() {
      if (!this.canPrevPage) return;

      await this.runWithLoadPending({
        message: "上一页",
        run: () => this.prevPageAction(),
      });
    },
    handleClickThumbnail() {
      this.isShowThumbnail = true;
    },
    handleClickOutline() {
      this.isShowOutline = true;
    },
    onThumbnailOpened() {
      this.$refs.thumbPanel?.onParentOpened?.();
    },
    onOutlineOpened() {
      this.$refs.outlinePanel?.onParentOpened?.();
      this.updateOutlineOffset();
    },
    closeOutlineDrawer() {
      this.isShowOutline = false;
    },
    closeThumbnailDrawer() {
      this.isShowThumbnail = false;
    },
    onOutlineClosed() {
      this.$refs.outlinePanel?.onParentClosed();
      this.updateOutlineOffset();
    },
    onThumbnailClosed() {
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
    // 计算目录抽屉实际占用的宽度（相对阅读器容器左侧），用于推开内容区域
    updateOutlineOffset() {
      this.$nextTick(() => {
        const root = this.$el;
        const rootRect = root.getBoundingClientRect();
        const panel = root.querySelector(".drawer-wrapper");
        const panelRect = panel.getBoundingClientRect();
        console.log("updateOutlineOffset: ", {
          panelRect,
          rootRect,
        });
        // 用「抽屉右边缘 - 组件左边缘」得到相对偏移
        this.outlineLeftOffset = Math.max(0, panelRect.right - rootRect.left);
      });
    },
  },
};
</script>

<style lang="less" scoped>
.complex-pdf-reader {
  --top-toolbar-height: 2.73rem;
  --bottom-toolbar-height: 4.14rem;

  // z-index 不同层的渲染
  // 注释层，比如目录点击页
  --z-annot: 2;
  // 底部工具栏
  --z-bottom-toolbar-tool-list: 10;
  // 左右翻页按钮
  --z-side-page-nav: 5;
  // 目录抽屉
  --z-outline-drawer: 20;

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

  .content-area-wrapper::v-deep {
    position: relative;
    height: 100%;

    .content-area {
      height: 100%;
    }

    .side-page-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: var(--z-side-page-nav);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 4.93rem;
      height: 4.93rem;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.3);
      transition: all 0.15s ease;

      &.side-page-nav-left {
        left: 8%;
      }

      &.side-page-nav-right {
        right: 8%;
      }

      &:hover {
        background-color: rgba(255, 255, 255, 1);
        box-shadow: 0 0.29rem 0.57rem rgba(0, 0, 0, 0.16);
        transform: translateY(-50%) scale(1.02);
      }

      &:active {
        transform: translateY(-50%) scale(0.95);
      }

      .side-page-nav-icon {
        width: 1.14rem;
        height: 2.25rem;
      }
    }
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

      .toolbar-section-left {
        gap: 1.5rem;
      }

      .toolbar-section-center {
        flex: 1;
        justify-content: center;

        .page-nav {
          display: flex;
          align-items: center;

          .nav-row {
            display: flex;
            align-items: center;
            justify-content: center;

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
              margin: 0 1rem;

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

      .toolbar-section-right {
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
