<template>
  <pdf-viewport
    :src="src"
    :initial-page="initialPage"
    :initial-scale="initialScale"
    :zoom-target="zoomTarget"
    @document-loaded="onDocumentLoaded"
    @document-error="onDocumentError"
    @load-progress="onLoadProgress"
    @page-changed="onPageChanged"
    @scale-changed="onScaleChanged"
    @page-rendered="onPageRendered"
    @loading-start="onLoadingStart"
    @loading-stop="onLoadingStop"
    ref="viewerCore"
  />
</template>

<script>
import PdfViewport from "./components/PdfViewport.vue";
import { PageRenderService } from "./core";
import {
  mapDocumentState,
  mapViewerState,
  mapDocumentGetters,
  mapViewerGetters,
  mapDocumentActions,
  mapViewerActions,
} from "./store/index.js";

export default {
  name: "PdfReader",

  components: {
    PdfViewport,
  },

  props: {
    src: {
      type: String,
      required: true,
    },
    initialPage: {
      type: Number,
      default: 1,
    },
    initialScale: {
      type: Number,
      default: 1.0,
    },

    // 外层通过 props 控制自动播放
    autoPlayEnabled: {
      type: Boolean,
      default: false,
    },
    autoPlayIntervalMs: {
      type: Number,
      default: 3000,
    },
    // 双击放大目标（透传到 PdfViewport）
    zoomTarget: {
      type: Number,
      default: null,
    },
  },

  data() {
    return {
      // UI状态下沉到组件本地
      searchActive: false,

      // 自动播放（由 props 控制启停）
      autoPlaying: false,
      autoPlayTimer: null,
    };
  },

  computed: {
    // 映射 Vuex 状态
    ...mapDocumentState(["pdfDocument", "loading", "error"]),
    ...mapViewerState(["currentPage", "scale"]),

    // 映射Vuex getters
    ...mapDocumentGetters(["isDocumentLoaded"]),
    ...mapViewerGetters(["navigationState", "zoomState"]),

    // 导航状态 - 从Vuex getters获取
    canGoPrev() {
      return this.navigationState.canGoPrev;
    },

    canGoNext() {
      return this.navigationState.canGoNext;
    },

    totalPages() {
      return this.navigationState.totalPages;
    },

    // 缩放状态 - 从Vuex getters获取
    scalePercent() {
      return this.zoomState.scalePercent;
    },

    canZoomIn() {
      return this.zoomState.canZoomIn;
    },

    canZoomOut() {
      return this.zoomState.canZoomOut;
    },

  },

  watch: {
    autoPlayEnabled(val) {
      if (val) {
        // 若文档已加载则立即启动
        if (this.isDocumentLoaded) this.startAutoPlay();
      } else {
        this.stopAutoPlay(true);
      }
    },
    // 当 Vuex 中的缩放数值变化时，向外抛出统一的 scale-changed 事件
    scale(val) {
      if (typeof val === "number") {
        this.$emit("scale-changed", { scale: val });
      }
    },
  },

  beforeDestroy() {
    // 停止自动播放
    this.stopAutoPlay && this.stopAutoPlay(true);
  },

  methods: {
    // 映射 Vuex actions
    ...mapDocumentActions(["setDocumentLoaded", "setDocumentError"]),
    ...mapViewerActions(["goToPage", "nextPage", "prevPage", "setScale"]),

    // 统一获取核心 viewer 与服务（方法而非 computed，避免缓存 $refs）
    core() { return this.$refs.viewerCore || null; },
    services() { return this.core()?.pdfServices || null; },

    // 事件处理 - 更新为使用Vuex actions
    onDocumentLoaded(event) {
      // 通过Vuex action更新状态
      this.setDocumentLoaded(event);

      console.log("PDF 文档加载完成:", event);
      console.log(
        "文档总页数:",
        event.document?.numPages || event.info?.numPages
      );

      if (this.autoPlayEnabled) {
        this.startAutoPlay();
      }

      this.$emit("document-loaded", event);
    },

    onDocumentError(event) {
      // 通过Vuex action更新错误状态
      this.setDocumentError(event);

      console.error("PDF 文档加载错误:", event);
      this.$emit("document-error", event);
    },

    onLoadProgress(event) {
      this.$emit("load-progress", event);
    },

    onLoadingStart(event) {
      this.$emit("loading-start", event);
    },
    onLoadingStop(event) {
      this.$emit("loading-stop", event);
    },

    onPageChanged(event) {
      // 只更新Vuex状态，不要再次调用goToPage避免循环
      // 使用映射 action，避免手动 commit
      this.goToPage(event.pageNumber);
      this.$emit("page-changed", event);
    },

    onScaleChanged(event) {
      // 通过Vuex action更新缩放；事件向外抛出交由 watcher(scale) 统一处理，避免重复
      this.setScale(event.scale);
    },

    onPageRendered(event) {
      this.$emit("page-rendered", event);
    },

    onFitWidthOnce() {
      // 直接调用子组件核心 viewer 执行一次适配
      this.core()?.fitWidthOnce?.();
    },

    // ===== 对外 API：目录与缩略图 =====
    async getOutline() {
      try {
        return (await this.services()?.getOutline?.()) ?? [];
      } catch (e) {
        console.warn("getOutline 调用失败:", e);
        return [];
      }
    },

    async renderThumbnail(pageNumber, canvasEl, options = {}) {
      try {
        const isCanvas =
          canvasEl &&
          ((typeof HTMLCanvasElement !== "undefined" &&
            canvasEl instanceof HTMLCanvasElement) ||
            (canvasEl.tagName &&
              String(canvasEl.tagName).toLowerCase() === "canvas"));
        if (!isCanvas) {
          console.warn(
            "renderThumbnail: 非法的 canvas 元素，已跳过",
            pageNumber,
            canvasEl
          );
          return;
        }
        const services = this.services();
        if (!services) throw new Error("pdfServices 不可用");
        const renderer = new PageRenderService(services);
        const opts = { scale: options.scale || 0.2, ...options };
        await renderer.renderPageToCanvas(pageNumber, canvasEl, opts);
      } catch (e) {
        console.warn("renderThumbnail 失败:", e);
      }
    },

    getTotalPages() {
      return this.totalPages || 0;
    },

    async navigateToDestination(dest) {
      try {
        if (this.services()) {
          await this.services().goToDestination(dest);
        }
      } catch (e) {
        console.warn("navigateToDestination 失败:", e);
      }
    },
    async resolveDestToPageNumber(dest) {
      try {
        if (!this.services()) {
          throw new Error("pdfServices 不可用");
        }
        return await this.services().resolveDestinationToPage(dest);
      } catch (e) {
        console.warn("resolveDestToPageNumber 失败:", e);
        return null;
      }
    },

    startAutoPlay() {
      if (this.autoPlaying || !this.isDocumentLoaded) return;
      this.autoPlaying = true;
      if (this.canGoNext) this.nextPage();
      this.autoPlayTimer = setInterval(() => {
        if (!this.canGoNext) {
          this.stopAutoPlay(true);
          return;
        }
        this.nextPage();
      }, this.autoPlayIntervalMs);
    },

    stopAutoPlay(silent = false) {
      if (this.autoPlayTimer) {
        clearInterval(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
      this.autoPlaying = false;
      if (!silent) {
        // this.$emit("auto-play-stopped");
      }
    },

    getBaselineScale() {
      const val = this.core()?.getBaselineScale?.();
      return typeof val === "number" ? val : (typeof this.scale === "number" ? this.scale : 1);
    },
  },
};
</script>
