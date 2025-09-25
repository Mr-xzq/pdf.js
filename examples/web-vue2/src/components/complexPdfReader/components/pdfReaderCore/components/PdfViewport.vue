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
import PdfPage from "./PdfPage.vue";
import GestureContainer from "./GestureContainer.vue";

import { renderPageToCanvasCore } from "../utils/pdf-utils.js";
import {
  mapDocumentState,
  mapViewerState,
  mapDocumentActions,
  mapViewerActions,
  mapDocumentGetters,
  mapViewerGetters,
} from "../store/index.js";

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
    await this.initializeServices();

    if (this.src) {
      await this.loadDocument();
    }
  },

  computed: {
    // 来自 Store 的文档级 loading/进度/错误（使用 mapState 统一风格）
    ...mapDocumentState(["loading", "loadProgress", "loadMessage", "error"]),
    // 引入文档模块中的文档实例与信息（用别名避免与 data 冲突）
    ...mapDocumentState({
      storePdfDocument: "pdfDocument",
      storeDocumentInfo: "documentInfo",
    }),
    ...mapDocumentGetters({
      storeMetadata: "metadata",
    }),
    // 将 viewer 的关键状态通过 mapState 引入为别名，避免与本地 data 冲突
    ...mapViewerState({
      storeCurrentPage: "currentPage",
      storeScale: "scale",
    }),
    // 从 viewer getters 引入导航/缩放派生状态（用于自动播放与 UI）
    ...mapViewerGetters(["navigationState", "zoomState"]),
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
    docProgress() {
      return this.loadProgress || 0;
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
    this.stopAutoPlay && this.stopAutoPlay(true);
  },

  methods: {
    ...mapDocumentActions([
      "realLoadDocument",
      "setLoadProgress",
      "setDocumentError",
    ]),
    ...mapViewerActions({
      goToPageAction: "goToPage",
      nextPageAction: "nextPage",
      prevPageAction: "prevPage",
      setScaleAction: "setScale",
      goToDestinationAction: "goToDestination",
    }),

    // 统一封装常用 refs（方法而非 computed，避免缓存 $refs）
    gesture() {
      return this.$refs.gesture || null;
    },
    viewerContainer() {
      return this.$refs.viewerContainer || null;
    },

    // 初始化服务
    async initializeServices() {
      try {
        // 确保 PDF.js 与核心服务（EventBus/LinkService）就绪
        await this.$store.dispatch("pdfReader/document/initializeServices");
        console.log("PDF 查看器核心服务初始化完成");
      } catch (error) {
        console.error("PDF 查看器核心服务初始化失败:", error);
        this.setDocumentError({ error: error.message, type: "init" });
      }
    },

    /**
     * 加载文档
     */
    async loadDocument() {
      if (!this.src) {
        return;
      }

      // 确保服务已初始化（幂等）
      await this.$store.dispatch("pdfReader/document/initializeServices");

      try {
        await this.realLoadDocument({ src: this.src });

        const pdfDocument = this.storePdfDocument;
        const infoState = this.storeDocumentInfo || {};

        // 获取文档信息用于组件后续初始化（从映射的 computed 读取一次）
        const loadedEvent = {
          document: pdfDocument,
          info: {
            numPages: infoState.numPages || pdfDocument?.numPages || 0,
            fingerprint:
              infoState.fingerprint ||
              (pdfDocument?.fingerprints && pdfDocument.fingerprints[0]) ||
              pdfDocument?.fingerprint ||
              null,
            metadata: this.storeMetadata || null,
          },
        };
        this.onDocumentLoaded(loadedEvent);
      } catch (error) {
        console.error("PDF 文档加载失败:", error);
        this.onDocumentError({ error: error.message, type: "load" });
      }
    },

    /**
     * 重试加载
     */
    async retry() {
      await this.loadDocument();
    },

    /**
     * 处理 src 变化
     */
    async onSrcChange(newSrc, oldSrc) {
      if (newSrc !== oldSrc) {
        await this.loadDocument();
      }
    },

    /**
     * 处理文档加载完成
     */
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

    /**
     * 处理文档加载错误
     */
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

    /**
     * 处理页面变化
     */
    onPageChanged(event) {
      this.$emit("page-changed", event);
    },

    /**
     * 处理缩放变化
     */
    onScaleChanged(event) {
      this.$emit("scale-changed", event);
    },

    /**
     * 处理页面渲染完成
     */
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

    /**
     * 处理页面渲染错误
     */
    onRenderError(event) {
      console.error("页面渲染错误:", event);
      this.$emit("render-error", event);
    },

    /**
     * 转发 PdfPage 的 canvas 点击事件给手势容器
     */
    onCanvasClick(payload) {
      this.gesture()?.onCanvasClick?.(payload);
    },

    /**
     * 初始化文档的缩放比例
     */
    initializeScaleForDocument(event) {
      // 通过 Store 初始化页码与缩放（不再维护本地镜像）
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
        return (
          (await this.$store.dispatch("pdfReader/document/getOutline")) ?? []
        );
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
          getPage: n => this.$store.dispatch("pdfReader/document/getPage", n),
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

    getTotalPages() {
      const nav = this.navigationState || {};
      return nav.totalPages || this.storePdfDocument?.numPages || 0;
    },

    async navigateToDestination(dest) {
      try {
        await this.$store.dispatch("pdfReader/viewer/goToDestination", dest);
      } catch (e) {
        console.warn("navigateToDestination 失败:", e);
      }
    },

    async resolveDestToPageNumber(dest) {
      try {
        return await this.$store.dispatch(
          "pdfReader/viewer/resolveDestinationToPage",
          dest
        );
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
          this.stopAutoPlay(true);
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
        // 可按需对外抛出事件
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

    /**
     * 应用缩放比例
     */
    applyScale(scale) {
      this.scale = scale;

      // 触发页面重新渲染（以当前页为准）
      this.onPageChanged({ pageNumber: this.page });

      console.log(`缩放比例更新为: ${scale}`);
    },

    /**
     * 按容器宽度适配一次（无监听、无后续自动调整）
     */
    async fitWidthOnce() {
      try {
        if (!this.documentLoaded) return;
        const container = this.viewerContainer();
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (!rect || rect.width === 0) return;

        const page = await this.$store.dispatch(
          "pdfReader/document/getPage",
          1
        );
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
