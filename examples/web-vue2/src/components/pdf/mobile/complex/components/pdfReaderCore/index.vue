<template>
  <div class="pdf-viewer-core" ref="viewerContainer">
    <div v-if="documentLoaded" class="pdf-viewer-core__content" ref="content">
      <gesture-container
        :gestures-enabled="gesturesEnabled"
        :swipe-enabled="!zoomState.isZoomed"
        content-selector=".pdf-page-container"
        @prev-page="onSwipePrev"
        @next-page="onSwipeNext"
      >
        <pdf-page :page-number="page" :scale="scale" :annotations-enabled="true" />
      </gesture-container>
    </div>
  </div>
</template>

<script>
import PdfPage from "./components/PdfPage.vue";
import GestureContainer from "./components/GestureContainer.vue";
import { renderPageToCanvas } from "@/components/pdf/core/pdf-utils.js";
import { ZOOM_EPS, ERROR_TYPES } from "@/components/pdf/core/pdf-config.js";
import { mapState, mapMutations, mapGetters, mapActions } from "vuex";

export default {
  name: "PdfViewport",

  components: {
    PdfPage,
    GestureContainer,
  },

  props: {
    src: {
      type: String,
      default: "",
    },
    initialPage: {
      type: Number,
      default: 1,
    },
    initialScale: {
      type: Number,
      default: 1,
    },
    // 手势开关（默认启用）
    gesturesEnabled: { type: Boolean, default: true },
    // 自动播放控制
    autoPlayEnabled: { type: Boolean, default: false },
    autoPlayIntervalMs: { type: Number, default: 3000 },
  },

  data() {
    return {
      // 自动播放
      autoPlaying: false,
      autoPlayTimer: null,
      // 缩略图渲染任务表，避免并发冲突
      thumbnailTasks: {},
    };
  },

  async mounted() {
    await this.handleLoadDocument();
  },

  computed: {
    ...mapGetters("pdfReaderCore", {
      loadedEvent: "loadedEvent",
      documentLoaded: "isDocumentLoaded",
      navigationState: "navigationState",
      zoomState: "zoomState",
    }),
    // 直接从 Store 读取当前页码和缩放倍数，作为只读计算属性
    ...mapState("pdfReaderCore", {
      page: "currentPage",
      scale: "scale",
    }),
  },

  watch: {
    async src(newSrc, oldSrc) {
      if (newSrc !== oldSrc) {
        await this.handleLoadDocument(newSrc);
      }
    },

    // 加载状态事件由父组件基于 Store 统一派发，此处仅处理局部行为（自动播放等）
    autoPlayEnabled(val) {
      if (val) {
        if (this.documentLoaded) {
          this.startAutoPlay();
        }
      } else {
        this.stopAutoPlay(true);
      }
    },
  },

  beforeDestroy() {
    this.stopAutoPlay(true);
    // 清除 Store 中关于 pdf 的所有状态
    this.RESET_STATE();
  },

  methods: {
    ...mapMutations("pdfReaderCore", ["RESET_STATE", "SET_ERROR"]),
    ...mapActions("pdfReaderCore", {
      // document
      loadDocumentAction: "loadDocument",
      getOutlineAction: "getOutline",
      getPageAction: "getPage",
      runWithLoadPending: "runWithLoadPending",
      // viewer
      goToPageAction: "goToPage",
      nextPageAction: "nextPage",
      prevPageAction: "prevPage",
      setScaleAction: "setScale",
      setBaselineScaleAction: "setBaselineScale",
      goToDestinationAction: "goToDestination",
      resolveDestinationToPageAction: "resolveDestinationToPage",
    }),

    // 模拟异步处理 loadDocumentAction 的参数
    transformFileSource(source, timeout = 3000) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(source);
        }, timeout);
      });
    },

    async handleLoadDocument() {
      let fileSource;

      try {
        fileSource = await this.runWithLoadPending({
          run: () => this.transformFileSource(this.src, 1000),
          message: "转换路径",
        });
      } catch (error) {
        this.SET_ERROR({
          type: ERROR_TYPES.LOAD_ERROR,
          message: error?.message || String(error),
        });
        console.error("[PdfViewport] transformFileSource failed", error);
        return;
      }

      // 真正加载文档
      try {
        await this.loadDocumentAction({ url: fileSource });
        this.onDocumentLoaded(this.loadedEvent);
      } catch (error) {
        // 这里不用 SET_ERROR，避免与 loadDocumentAction --> _handleLoadDocument 的 SET_ERROR 重复
        console.error("[PdfViewport] loadDocument failed", error);
      }
    },

    // 处理文档加载完成
    onDocumentLoaded(event) {
      // 响应式计算最佳缩放比例
      this.$nextTick(() => {
        this.initializeScaleForDocument(event);
      });

      // 启动自动播放（若外部开启）
      if (this.autoPlayEnabled) {
        this.startAutoPlay();
      }

      // 传递完整的文档信息给父组件
      // { document, info: { numPages, fingerprint, metadata } }
      this.$emit("document-loaded", {
        document: event.document,
        info: event.info,
      });
    },

    // 初始化文档的缩放比例
    initializeScaleForDocument(event) {
      // 初始化页码与缩放
      this.setScaleAction(this.initialScale);
      this.goToPageAction(this.initialPage);

      // 初次加载按容器宽度适配一次
      this.$nextTick(() => {
        this.fitWidthOnce();
      });

      console.log(`PDF 文档加载完成，共 ${event?.info?.numPages || "unknown"} 页，初始缩放: ${this.initialScale}`);
    },

    // 对外提供方法，获取目录
    async getOutline() {
      try {
        return (await this.getOutlineAction()) ?? [];
      } catch (e) {
        console.warn("getOutline 调用失败:", e);
        return [];
      }
    },

    // 对外提供方法，渲染缩略图
    async renderThumbnail(pageNumber, canvasEl, options = {}) {
      try {
        const isCanvas =
          canvasEl &&
          ((typeof HTMLCanvasElement !== "undefined" && canvasEl instanceof HTMLCanvasElement) ||
            (canvasEl.tagName && String(canvasEl.tagName).toLowerCase() === "canvas"));
        if (!isCanvas) {
          console.warn("renderThumbnail: 非法的 canvas 元素，已跳过", pageNumber, canvasEl);
          return;
        }
        const opts = { scale: options.scale || 0.2, ...options };
        const { scale, ...rest } = opts;
        await renderPageToCanvas({
          getPage: (n) => this.getPageAction(n),
          tasks: this.thumbnailTasks,
          pageNumber,
          canvas: canvasEl,
          scale,
          renderOptions: rest,
        });
      } catch (e) {
        console.warn("renderThumbnail 失败:", e);
      }
    },

    async navigateToDestination(dest) {
      try {
        await this.goToDestinationAction(dest);
      } catch (e) {
        console.warn("navigateToDestination 失败:", e);
      }
    },

    async resolveDestToPageNumber(dest) {
      try {
        return await this.resolveDestinationToPageAction(dest);
      } catch (e) {
        console.warn("resolveDestToPageNumber 失败:", e);
        return null;
      }
    },

    // 手势翻页
    async onSwipePrev() {
      await this.runWithLoadPending({
        message: "上一页",
        run: () => this.prevPageAction(),
      });
    },
    async onSwipeNext() {
      await this.runWithLoadPending({
        message: "下一页",
        run: () => this.nextPageAction(),
      });
    },

    async startAutoPlay() {
      if (this.autoPlaying || !this.documentLoaded) return;
      this.autoPlaying = true;
      const nav = this.navigationState || {};
      if (nav.currentPage < (nav.totalPages || 0)) {
        await this.runWithLoadPending({
          message: "下一页",
          run: () => this.nextPageAction(),
        });
      }
      this.autoPlayTimer = setInterval(async () => {
        const s = this.navigationState || {};
        const canGoNext = (s.currentPage || 0) < (s.totalPages || 0);
        if (!canGoNext) {
          this.stopAutoPlay(false);
          return;
        }
        await this.runWithLoadPending({
          message: "下一页",
          run: () => this.nextPageAction(),
        });
      }, this.autoPlayIntervalMs);
    },

    stopAutoPlay(silent = false) {
      if (this.autoPlayTimer) {
        clearInterval(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
      this.autoPlaying = false;
      if (!silent) {
        this.$emit("auto-play-ended", { reason: "reached-end" });
      }
    },

    // 按容器宽度适配一次
    async fitWidthOnce() {
      try {
        if (!this.documentLoaded) {
          this.setBaselineScaleAction(this.scale);
          return;
        }
        const rect = this.$refs.viewerContainer?.getBoundingClientRect();
        if (!rect || rect.width === 0) {
          this.setBaselineScaleAction(this.scale);
          return;
        }

        const page = await this.getPageAction(1);
        const viewport = page.getViewport({ scale: 1 });
        const computed = rect.width / viewport.width;

        console.log("fitWidthOnce: ", {
          viewport,
          rect,
          computed,
        });

        if (computed > 0 && Math.abs(computed - this.scale) > ZOOM_EPS) {
          this.setScaleAction(computed);
          this.setBaselineScaleAction(computed);
        } else {
          this.setBaselineScaleAction(this.scale);
        }
      } catch (e) {
        console.warn("fitWidthOnce 计算失败:", e);
        // 失败情况下也尽量回退到当前 scale 作为基础
        this.setBaselineScaleAction(this.scale);
      }
    },
  },
};
</script>

<style lang="less" scoped>
@import url("~pdfjs-dist/web/pdf_viewer.css");

.pdf-viewer-core {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;

  &__content {
    flex: 1;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    // 确保 flex 子元素能够正确缩放
    min-height: 0;
    // 允许自定义手势（禁用浏览器默认手势）
    touch-action: none;
  }
}
</style>
