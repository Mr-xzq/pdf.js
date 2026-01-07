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
import { renderPageToCanvas } from "@/components/pdf/core/pdf-utils.js";
import { ZOOM_EPS, ERROR_TYPES } from "@/components/pdf/core/pdf-config.js";
import { mapState, mapMutations, mapGetters, mapActions } from "vuex";
import { debounce } from "lodash";
import GestureContainer from "./components/GestureContainer.vue";

export default {
  name: "PdfViewport",

  components: {
    GestureContainer,
    PdfPage,
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
    this.initReSizeObservers();
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

    // 初始化 ResizeObserver，用于监听元素尺寸的变化
    initReSizeObservers() {
      const el = this.$refs.viewerContainer;

      if (!el) return;
      if (typeof ResizeObserver === "undefined") return;

      const handleContainerResizeDebounced = debounce(() => {
        if (!this.documentLoaded) return;

        this.fitPageOnce().catch((e) => {
          console.warn("[Desktop PdfViewport] fitPageOnce on container resize failed:", e);
        });
        // 通知父组件：容器尺寸已变化且已重新适配整页，父级可以重置与手动缩放相关的 UI 状态
        this.$emit("container-resized");
      }, 100);

      const resizeObserver = new ResizeObserver(() => {
        handleContainerResizeDebounced();
      });

      resizeObserver.observe(el);

      // 设置清理逻辑
      const cleanup = () => {
        console.log("cleanup - resize observer");

        // 取消监听
        resizeObserver?.disconnect?.();
        // 取消防抖回调，避免销毁后还持有组件引用
        handleContainerResizeDebounced?.cancel?.();
      };

      this.$on("hook:beforeDestroy", cleanup);
    },

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

    // 初始化文档的缩放比例（Desktop：默认适配整页，一屏展示）
    async initializeScaleForDocument(event) {
      try {
        await this.fitPageOnce();
      } catch (e) {
        console.warn("[Desktop PdfViewport] fitPageOnce 计算失败，回退到 initialScale:", e);
        this.setScaleAction(this.initialScale);
        this.setBaselineScaleAction(this.initialScale);
      }

      // 无论如何都跳转到初始页
      this.goToPageAction(this.initialPage);

      console.log(
        `[Desktop PdfViewport] PDF 文档加载完成，共 ${event?.info?.numPages || "unknown"} 页，当前缩放: ${this.scale}`
      );
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

    // 手势翻页（与 mobile 版行为保持一致）
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

    // 按「内容容器高度」适配整页（PC 端一屏一页）
    async fitPageOnce() {
      try {
        if (!this.documentLoaded) {
          this.setBaselineScaleAction(this.scale);
          return;
        }

        const contentEl = this.$refs.content;
        if (!contentEl) {
          this.setBaselineScaleAction(this.scale);
          return;
        }

        // 通过 getBoundingClientRect 计算宽高可以得到元素真实渲染的宽高，不然我们还需要额外处理 padding 等之类的情况
        const rect = contentEl.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
          this.setBaselineScaleAction(this.scale);
          return;
        }

        const style = window.getComputedStyle(contentEl);
        const paddingX = parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0");
        const paddingY = parseFloat(style.paddingTop || "0") + parseFloat(style.paddingBottom || "0");

        // 逻辑上的「上下留白」高度（不写在 CSS 里，只参与缩放计算），单位：px
        const visualPaddingY = 19;

        const availableWidth = rect.width - paddingX;
        const availableHeight = rect.height - paddingY - visualPaddingY;

        if (availableWidth <= 0 || availableHeight <= 0) {
          this.setBaselineScaleAction(this.scale);
          return;
        }

        const page = await this.getPageAction(1);
        const viewport = page.getViewport({ scale: 1 });

        // 只根据容器高度适配：保证「一屏一页」效果，同时预留 visualPaddingY 的上下留白
        const scaleY = availableHeight / viewport.height;
        const computed = scaleY;

        console.log("fitPageOnce (height-only with visual padding):", {
          viewport,
          rect,
          paddingX,
          paddingY,
          visualPaddingY,
          availableWidth,
          availableHeight,
          computed,
          scaleY,
        });

        if (computed > 0 && Math.abs(computed - this.scale) > ZOOM_EPS) {
          this.setScaleAction(computed);
          this.setBaselineScaleAction(computed);
        } else {
          this.setBaselineScaleAction(this.scale);
        }
      } catch (e) {
        console.warn("fitPageOnce 计算失败:", e);
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
