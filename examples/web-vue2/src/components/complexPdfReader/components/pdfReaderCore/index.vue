<template>
  <div class="pdf-viewer-core" ref="viewerContainer">
    <!-- 错误显示 -->
    <template v-if="docError">
      <slot
        name="error"
        :error="docError"
        :message="docErrorMessage"
        :retry="retry"
      ></slot>
    </template>

    <!-- PDF 内容区域 -->
    <div
      v-else-if="documentReady"
      class="pdf-viewer-core__content"
      ref="content"
    >
      <gesture-container
        ref="gesture"
        :scale.sync="scale"
        :gestures-enabled="gesturesEnabled"
        :zoom-target="zoomTarget"
        @update:scale="setScaleAction"
        @request-prev-page="prevPageAction"
        @request-next-page="nextPageAction"
      >
        <pdf-page
          :page-number="page"
          :scale="scale"
          :text-layer-enabled="true"
          :annotations-enabled="true"
          @page-rendered="onPageRendered"
          @render-error="onRenderError"
          @canvas-click="onCanvasClick"
        />
      </gesture-container>
    </div>

    <!-- 空状态：仅在“无 src 且不在加载中”时显示；加载过程不显示 empty 占位 -->
    <template v-else-if="!src && !docLoading">
      <slot name="empty"></slot>
    </template>
  </div>
</template>

<script>
// 引入组件
import PdfPage from "./components/PdfPage.vue";
import GestureContainer from "./components/GestureContainer.vue";

// 引入自己项目里的工具函数
import { renderPageToCanvasCore } from "./utils/pdf-utils.js";

// 引入第三方库
import { mapState, mapGetters, mapActions } from "vuex";

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
      default: 1.0,
    },
    // 手势开关（默认启用）
    gesturesEnabled: { type: Boolean, default: true },
    // 双击放大目标（优先使用外部传入；未传则使用 baseline*1.5）
    zoomTarget: { type: Number, default: null },
    // 自动播放控制（从原 index.vue 合并进来）
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
    if (this.src) {
      await this.initializeServicesAction();
      try {
        await this.loadDocumentAction({ src: this.src });
        this.onDocumentLoaded(this.loadedEvent);
      } catch (error) {
        this.onDocumentError({ error: error.message, type: "load" });
      }
    }
  },

  computed: {
    ...mapState("pdfReader/document", [
      "loading",
      "loadProgress",
      "loadMessage",
      "error",
    ]),
    ...mapState("pdfReader/document", {
      storePdfDocument: state => state.pdfDocument,
    }),
    ...mapGetters({
      storeMetadata: "pdfReader/document/metadata",
      loadedEvent: "pdfReader/document/loadedEvent",
    }),
    ...mapState("pdfReader/viewer", {
      storeCurrentPage: state => state.currentPage,
      storeScale: state => state.scale,
    }),
    ...mapGetters("pdfReader/viewer", ["navigationState", "zoomState"]),
    scale: {
      get() {
        return this.storeScale;
      },
      set(v) {
        this.setScaleAction(v);
      },
    },
    page: {
      get() {
        return this.storeCurrentPage;
      },
      set(v) {
        this.goToPageAction(v);
      },
    },

    documentLoaded() {
      return !!this.storePdfDocument;
    },

    documentReady() {
      return this.documentLoaded;
    },

    docLoading() {
      return this.loading;
    },

    docMessage() {
      return this.loadMessage || "加载中";
    },
    docError() {
      return this.error;
    },

    docErrorMessage() {
      const e = this.error;
      return typeof e === "string" ? e : e?.message || e || null;
    },
  },

  watch: {
    src: {
      handler: "onSrcChange",
      immediate: false,
    },

    docLoading(n) {
      if (n) {
        this.$emit("loading-start", {
          source: "core",
          message: this.docMessage,
        });
      } else {
        this.$emit("loading-stop", { source: "core" });
      }
    },

    autoPlayEnabled(val) {
      if (val) {
        if (this.documentLoaded) this.startAutoPlay();
      } else {
        this.stopAutoPlay(true);
      }
    },

    scale(val) {
      if (typeof val === "number") {
        this.$emit("scale-changed", { scale: val });
      }
    },
  },

  beforeDestroy() {
    this.stopAutoPlay(true);
  },

  methods: {
    ...mapActions("pdfReader/document", {
      loadDocumentAction: "loadDocument",
      setLoadProgress: "setLoadProgress",
      setDocumentError: "setDocumentError",
      initializeServicesAction: "initializeServices",
      getOutlineAction: "getOutline",
      getPageAction: "getPage",
    }),
    ...mapActions("pdfReader/viewer", {
      goToPageAction: "goToPage",
      nextPageAction: "nextPage",
      prevPageAction: "prevPage",
      setScaleAction: "setScale",
      goToDestinationAction: "goToDestination",
      resolveDestinationToPageAction: "resolveDestinationToPage",
    }),

    // 统一封装常用 refs（方法而非 computed，避免缓存 $refs）
    gesture() {
      return this.$refs.gesture || null;
    },
    viewerContainer() {
      return this.$refs.viewerContainer || null;
    },

    // 重试加载
    async retry() {
      if (!this.src) {
        return;
      }
      await this.initializeServicesAction();
      try {
        await this.loadDocumentAction({ src: this.src });
        this.onDocumentLoaded(this.loadedEvent);
      } catch (error) {
        this.onDocumentError({ error: error.message, type: "load" });
      }
    },

    // 处理 src 变化
    async onSrcChange(newSrc, oldSrc) {
      if (newSrc !== oldSrc) {
        if (!this.src) {
          return;
        }
        await this.initializeServicesAction();
        try {
          await this.loadDocumentAction({ src: this.src });
          this.onDocumentLoaded(this.loadedEvent);
        } catch (error) {
          this.onDocumentError({ error: error.message, type: "load" });
        }
      }
    },

    // 处理文档加载完成
    onDocumentLoaded(event) {
      // 响应式计算最佳缩放比例（不再维护本地镜像状态）
      this.$nextTick(() => {
        this.initializeScaleForDocument(event);
      });

      // 启动自动播放（若外部开启）
      if (this.autoPlayEnabled) {
        this.startAutoPlay();
      }

      // 传递完整的文档信息给父组件
      // event 结构: { document, info: { numPages, fingerprint, metadata } }
      this.$emit("document-loaded", {
        document: event.document,
        info: event.info,
      });
    },

    // 处理文档加载错误
    onDocumentError(event) {
      // 由 Store 管理错误显示；这里仅转发事件
      this.$emit("document-error", event);
    },

    /**
     * 处理加载进度
     * 注意：这个方法现在通过 pdf-services 直接调用，不再作为事件监听器
     */
    onLoadProgress(event) {
      // 同步到 Vuex 的文档级加载进度
      this.setLoadProgress({
        progress: event.percentage,
        message: "",
      });

      // 只向父组件传递事件
      this.$emit("load-progress", event);
    },

    // 处理页面渲染完成
    onPageRendered(event) {
      const vp = event && event.viewport;
      if (vp) {
        this.gesture()?.setContentSize(vp.width, vp.height);
      }
      this.$nextTick(() => {
        this.gesture()?.updateContainerSize();
        this.gesture()?.clampPan();
      });
      this.$emit("page-rendered", event);
    },

    // 处理页面渲染错误
    onRenderError(event) {
      console.error("页面渲染错误:", event);
      this.$emit("render-error", event);
    },

    // 转发 PdfPage 的 canvas 点击事件给手势容器
    onCanvasClick(payload) {
      this.gesture()?.onCanvasClick?.(payload);
    },

    // 初始化文档的缩放比例
    initializeScaleForDocument(event) {
      // 通过 Store 初始化页码与缩放
      this.setScaleAction(this.initialScale);
      this.goToPageAction(this.initialPage);

      // 初次加载按容器宽度适配一次
      this.$nextTick(() => {
        this.fitWidthOnce && this.fitWidthOnce();
      });

      console.log(
        `PDF 文档加载完成，共 ${
          event?.info?.numPages || "unknown"
        } 页，初始缩放: ${this.initialScale}`
      );
    },

    /**
     * 提供对外 API：Outline/跳转/缩略图/统计
     */
    async getOutline() {
      try {
        return (await this.getOutlineAction()) ?? [];
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
        const opts = { scale: options.scale || 0.2, ...options };
        const services = {
          getPage: n => this.getPageAction(n),
        };
        await renderPageToCanvasCore(
          services,
          this.thumbnailTasks,
          pageNumber,
          canvasEl,
          opts
        );
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

    startAutoPlay() {
      if (this.autoPlaying || !this.documentLoaded) return;
      this.autoPlaying = true;
      const nav = this.navigationState || {};
      if (nav.currentPage < (nav.totalPages || 0)) this.nextPageAction();
      this.autoPlayTimer = setInterval(() => {
        const s = this.navigationState || {};
        const canGoNext = (s.currentPage || 0) < (s.totalPages || 0);
        if (!canGoNext) {
          this.stopAutoPlay(false);
          return;
        }
        this.nextPageAction();
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

    getBaselineScale() {
      const val = this.gesture()?.getBaselineScale?.();
      return typeof val === "number"
        ? val
        : typeof this.scale === "number"
        ? this.scale
        : 1;
    },

    // 按容器宽度适配一次（无监听、无后续自动调整）
    async fitWidthOnce() {
      try {
        if (!this.documentLoaded) return;
        const container = this.viewerContainer();
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (!rect || rect.width === 0) return;

        const page = await this.getPageAction(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const computed = rect.width / viewport.width;
        if (computed > 0 && Math.abs(computed - this.scale) > 0.005) {
          this.gesture()?.setInitialFitScale(computed);
          this.setScaleAction(computed);
        }
      } catch (e) {
        console.warn("fitWidthOnce 计算失败:", e);
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
    overflow: hidden; // 不出现滚动条
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0; // 由外层控制留白
    min-height: 0; // 确保 flex 子元素能够正确缩放
    touch-action: none; // 允许自定义手势（禁用浏览器默认手势）
  }

  &__pan {
    will-change: transform;
  }
}
</style>
