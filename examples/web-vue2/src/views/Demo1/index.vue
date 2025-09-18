<template>
  <div class="demo-1">
    <div class="top-toolbar">
      <div class="right-operate-tool">
        <van-image class="search-tool-item" :src="searchIconUrl"></van-image>
        <van-image
          class="fullscreen-tool-item"
          :src="fullscreenIconUrl"
        ></van-image>
      </div>
    </div>
    <div class="content-area">
      <!-- PDF 阅读器，占满容器，隐藏其内置UI，由外层页面控制 -->
      <pdf-reader
        ref="pdfReader"
        :src="pdfSrc"
        :initial-page="1"
        :initial-scale="1"
        :text-layer-mode="1"
        :zoom-target="zoomTarget"
        :show-controls="false"
        :auto-play-enabled="autoPlay"
        :auto-play-interval-ms="autoPlayIntervalMs"
        @document-loaded="onPdfLoaded"
        @document-error="onPdfError"
        @page-changed="onPdfPageChanged"
        @scale-changed="onPdfScaleChanged"
      />
    </div>
    <div class="bottom-toolbar">
      <van-image
        class="thumbnail-tool-item"
        :src="thumbnailIconUrl"
        @click="handleClickThumbnail"
      ></van-image>
      <van-image class="outline-tool-item" :src="outlineIconUrl" @click="handleClickOutline"></van-image>
      <van-image class="page-flip-tool-item" :src="pageFlipIconUrl" @click="togglePageNav"></van-image>
      <van-image
        class="page-flip-audio-tool-item"
        :src="pageFlipAudioIconUrl"
      ></van-image>
      <!-- 缩放：切换按钮（依据是否存在 lastScaleBeforeZoom 来互斥显示） -->
      <van-image v-if="lastScaleBeforeZoom == null" class="zoom-in-tool-item" :src="zoomInIconUrl" @click="handleZoomIn"></van-image>
      <van-image v-else class="zoom-out-tool-item" :src="zoomOutIconUrl" @click="handleResetZoom"></van-image>
      <!-- 自动播放/暂停 -->
      <van-image class="auto-play-tool-item" :src="autoPlay ? pauseIconUrl : autoPlayIconUrl" @click="handleToggleAutoPlay"></van-image>
    </div>
    <div class="page-nav" :class="{ 'is-open': isShowPageNav }">
      <button @click="goFirstPage">首页</button>
      <button @click="goPrevPage">上一页</button>
      <input v-model.number="gotoPageInput" @keyup.enter="goToPageByInput" />
      <span class="page-count">{{ currentPage }}/{{ totalPages }}</span>
      <button @click="goNextPage">下一页</button>
      <button @click="goLastPage">尾页</button>
    </div>


    <drawer :is-show.sync="isShowPopup">
      <outline-panel
        v-if="activeDrawer === 'outline'"
        :get-outline="getOutline"
        :navigate-to-destination="navigateToDestination"
      />
      <thumbnail-panel
        v-else-if="activeDrawer === 'thumbnail'"
        :get-total-pages="getTotalPages"
        :render-thumbnail="renderThumbnail"
        :go-to-page="goToPage"
      />
    </drawer>
  </div>
</template>

<script>
// 组件
import Drawer from "./components/Drawer/Drawer.vue";
import PdfReader from "@/components/pdf-reader/index.vue";
import OutlinePanel from "./components/OutlinePanel/index.vue";
import ThumbnailPanel from "./components/ThumbnailPanel/index.vue";


import fullscreenIconUrl from "@/assets/images/demo1/fullscreen-2x.png";
import searchIconUrl from "@/assets/images/demo1/search-2x.png";
import thumbnailIconUrl from "@/assets/images/demo1/thumbnail-2x.png";
import outlineIconUrl from "@/assets/images/demo1/outline-2x.png";
import pageFlipIconUrl from "@/assets/images/demo1/page-flip-2x.png";
import pageFlipAudioIconUrl from "@/assets/images/demo1/page-flip-audio-2x.png";
import zoomInIconUrl from "@/assets/images/demo1/zoom-in-2x.png";
import zoomOutIconUrl from "@/assets/images/demo1/zoom-out-2x.png";
import autoPlayIconUrl from "@/assets/images/demo1/auto-play-2x.png";
import pauseIconUrl from "@/assets/images/demo1/pause-2x.png";

export default {
  name: "Demo1",
  components: {
    Drawer,
    PdfReader,
    OutlinePanel,
    ThumbnailPanel,
  },
  data() {
    return {
      // 全屏
      fullscreenIconUrl,
      // 搜索
      searchIconUrl,
      // 缩略图
      thumbnailIconUrl,
      // 目录
      outlineIconUrl,
      // 翻页
      pageFlipIconUrl,
      // 翻页声音
      pageFlipAudioIconUrl,
      // 放大
      zoomInIconUrl,
      // 缩小
      zoomOutIconUrl,
      // 自动播放
      autoPlayIconUrl,
      // 暂停
      pauseIconUrl,
      isShowPopup: false,
      pdfSrc: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
      // 自动播放相关（由 PdfReader 内部驱动）
      autoPlay: false,
      autoPlayIntervalMs: 1500,
      // Drawer/导航相关
      activeDrawer: null,
      isShowPageNav: false,
      gotoPageInput: 1,
      // 页信息
      currentPage: 1,
      totalPages: 0,
      // 缩放信息（单一目标倍数）
      currentScale: 1,
      zoomTarget: 1.5,
      lastScaleBeforeZoom: null,


    };
  },
  methods: {
    handleClickThumbnail() {
      this.activeDrawer = 'thumbnail';
      this.isShowPopup = true;
    },

    handleClickOutline() {
      this.activeDrawer = 'outline';
      this.isShowPopup = true;
    },

    // 底部翻页导航：开关
    togglePageNav() {
      this.isShowPageNav = !this.isShowPageNav;
    },

    // 翻页能力（通过 PdfReader 暴露的方法）
    goPrevPage() {
      const r = this.$refs.pdfReader;
      if (r && typeof r.prevPage === 'function' && (r.canGoPrev ?? true)) r.prevPage();
    },
    goNextPage() {
      const r = this.$refs.pdfReader;
      if (r && typeof r.nextPage === 'function' && (r.canGoNext ?? true)) r.nextPage();
    },
    goFirstPage() { this.goToPage(1); },
    goLastPage() { const t = this.getTotalPages?.(); if (t && t > 0) this.goToPage(t); },
    goToPageByInput() {
      const n = Number(this.gotoPageInput);
      const t = this.getTotalPages?.() || 0;
      if (Number.isFinite(n) && n >= 1 && n <= t) this.goToPage(n);
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
    // 缩小：恢复到最近一次“放大前”的倍数（B 方案），若没有记录则退回基线倍数
    handleResetZoom() {
      const reader = this.$refs.pdfReader;
      if (reader && typeof reader.setScale === "function") {
        const fallback = (typeof reader.getBaselineScale === 'function') ? reader.getBaselineScale() : 1;
        const target = (typeof this.lastScaleBeforeZoom === 'number') ? this.lastScaleBeforeZoom : fallback;
        reader.setScale(target);
        // 恢复后清除记录
        this.lastScaleBeforeZoom = null;
      }
    },

    // 自动播放：交由 PdfReader 内部实现，这里仅切换 props
    handleToggleAutoPlay() {
      this.autoPlay = !this.autoPlay;
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

    // 以下事件用于和外层 UI 同步
    onPdfLoaded() {
      this.totalPages = this.getTotalPages?.() || 0;
      this.gotoPageInput = this.currentPage;
      // 同步 PdfReader 的当前缩放到本地，用于阈值切换显示缩放按钮
      const r = this.$refs.pdfReader;
      if (r) {
        if (typeof r.currentScale === 'number') this.currentScale = r.currentScale;
        if (!this._unwatchReaderScale && typeof r.$watch === 'function') {
          this._unwatchReaderScale = r.$watch('currentScale', (s) => {
            if (typeof s === 'number') this.currentScale = s;
          });
        }
      }
    },
    onPdfError(e) {
      console.error("PDF 加载失败", e);
    },
    onPdfPageChanged(e) {
      if (e && e.pageNumber) {
        this.currentPage = e.pageNumber;
        this.gotoPageInput = e.pageNumber;
      }
    },
    onPdfScaleChanged(e) {
      const s = (typeof e === 'number') ? e : (e && e.scale);
      if (typeof s === 'number') this.currentScale = s;
    },
  },
};
</script>

<style lang="less" scoped>
.demo-1 {
  @top-toolbar-height: 2.73rem;
  @bottom-toolbar-height: 4.14rem;

  position: relative;

  height: 100vh;
  padding-top: @top-toolbar-height;
  padding-bottom: @bottom-toolbar-height;

  background-image: url("@/assets/images/demo1/full-background-2x.jpg");
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
    left: 0; right: 0;
    bottom: @bottom-toolbar-height;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 3.2rem;
    padding: 0 1rem;
    background: #fff;
    box-shadow: 0 -0.29rem 0.29rem rgba(0,0,0,0.05);
    border-radius: 0.43rem 0.43rem 0 0;
    // 初始收起：下滑隐藏，避免遮挡与点击穿透
    transform: translateY(100%);
    opacity: 0;
    pointer-events: none;
    z-index: 9;
    transition: transform .24s ease, opacity .24s ease;
    &.is-open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
      z-index: 11;
    }
    input { width: 4rem; height: 2rem; border: 1px solid #eee; border-radius: 6px; padding: 0 .5rem; }
    button { height: 2rem; padding: 0 .6rem; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
    .page-count { min-width: 3rem; text-align: center; color: #666; }
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
    box-shadow: 0 -0.29rem 0.29rem 0 rgba(0, 0, 0, 0.05);
    border-radius: 0.43rem 0.43rem 0 0;
    z-index: 10;

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
