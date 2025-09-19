<template>
  <pdf-viewport
    :src="src"
    :initial-page="initialPage"
    :initial-scale="initialScale"
    :max-canvas-pixels="maxCanvasPixels"
    :text-layer-mode="textLayerMode"
    :zoom-target="zoomTarget"
    @document-loaded="onDocumentLoaded"
    @document-error="onDocumentError"
    @load-progress="onLoadProgress"
    @page-changed="onPageChanged"
    @scale-changed="onScaleChanged"
    @page-rendered="onPageRendered"
    ref="viewerCore"
  />
</template>

<script>
import PdfViewport from "./viewport/PdfViewport.vue";
import { PageRenderService } from "./core/pdf-services.js";
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
    maxCanvasPixels: {
      type: Number,
      default: 0,
    },
    textLayerMode: {
      type: Number,
      default: 1,
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

    // 为了兼容现有代码，提供别名
    currentScale() {
      return this.scale;
    },

    // 导航状态 - 从Vuex getters获取
    canGoPrev() {
      return this.navigationState.canGoPrev;
    },

    canGoNext() {
      return this.navigationState.canGoNext;
    },

    // 使用导航 getter 提供的 totalPages，避免依赖 document.totalPages 直接映射
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
  },

  beforeDestroy() {
    // 停止自动播放
    this.stopAutoPlay && this.stopAutoPlay(true);
  },

  methods: {
    // 映射 Vuex actions
    ...mapDocumentActions([
      "loadDocument",
      "setDocumentLoaded",
      "setDocumentError",
    ]),
    ...mapViewerActions([
      "goToPage",
      "nextPage",
      "prevPage",
      "setScale",
      "zoomIn",
      "zoomOut",
    ]),

    // 事件处理 - 更新为使用Vuex actions
    onDocumentLoaded(event) {
      // 通过Vuex action更新状态
      this.setDocumentLoaded(event);

      console.log("PDF 文档加载完成:", event);
      console.log(
        "文档总页数:",
        event.document?.numPages || event.info?.numPages
      );
      console.log("当前导航状态:", this.navigationState);

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

    onPageChanged(event) {
      // 只更新Vuex状态，不要再次调用goToPage避免循环
      // 使用映射 action，避免手动 commit
      this.goToPage(event.pageNumber);
      this.$emit("page-changed", event);
    },

    onScaleChanged(event) {
      // 通过Vuex action更新缩放
      this.setScale(event.scale);
      this.$emit("scale-changed", event);
    },

    onPageRendered(event) {
      this.$emit("page-rendered", event);
    },

    // 搜索相关方法 - UI状态本地管理
    onSearchToggle() {
      this.searchActive = !this.searchActive;
      this.$emit("search-toggle", this.searchActive);
    },

    // 工具栏事件处理 - 直接使用映射的Vuex actions
    onPrevPage() {
      this.prevPage();
    },

    onNextPage() {
      this.nextPage();
    },

    onGoToPage(pageNumber) {
      this.goToPage(pageNumber);
    },

    onZoomIn() {
      // 统一入口：通过 Store 派发，Core 通过 watcher 同步
      this.zoomIn();
    },

    onZoomOut() {
      this.zoomOut();
    },

    onSetScale(scale) {
      // 统一入口：只保留数值缩放
      if (typeof scale === "number") {
        this.setScale(scale);
      }
    },

    onFitWidthOnce() {
      // 直接调用子组件核心 viewer 执行一次适配
      const core = this.$refs.viewerCore;
      if (core && core.fitWidthOnce) {
        core.fitWidthOnce();
      }
    },

    // ===== 对外 API：目录与缩略图 =====
    async getOutline() {
      try {
        const core = this.$refs.viewerCore;
        const services = core && core.pdfServices;
        if (!services || typeof services.getOutline !== "function") {
          throw new Error("pdfServices 不可用或不支持 getOutline");
        }
        return await services.getOutline();
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
        const core = this.$refs.viewerCore;
        const services = core && core.pdfServices;
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
        const core = this.$refs.viewerCore;
        const services = core && core.pdfServices;
        if (services && typeof services.goToDestination === "function") {
          await services.goToDestination(dest);
        }
      } catch (e) {
        console.warn("navigateToDestination 失败:", e);
      }
    },

    // ===== 自动播放（由 props 控制启停） =====
    startAutoPlay() {
      if (this.autoPlaying || !this.isDocumentLoaded) return;
      this.autoPlaying = true;
      // 即刻尝试一次
      if (this.canGoNext && typeof this.nextPage === "function")
        this.nextPage();
      this.autoPlayTimer = setInterval(() => {
        if (!this.canGoNext || typeof this.nextPage !== "function") {
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
        // 可在此处 emit 事件通知外层自动播放已停止
        // this.$emit("auto-play-stopped");
      }
    },

    // 注意：不再定义重复的方法，直接使用映射的Vuex actions
    // prevPage, nextPage, goToPage, zoomIn, zoomOut, setScale, setScaleMode
    // 这些方法已经通过 mapViewerActions 映射，避免无限递归

    getBaselineScale() {
      const core = this.$refs.viewerCore;
      if (core && typeof core.getBaselineScale === "function")
        return core.getBaselineScale();
      return typeof this.currentScale === "number" ? this.currentScale : 1;
    },
  },
};
</script>
