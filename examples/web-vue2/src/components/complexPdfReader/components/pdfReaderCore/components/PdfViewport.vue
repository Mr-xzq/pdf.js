<template>
  <div class="pdf-viewer-core" ref="viewerContainer">
    <!-- 加载进度改为使用 Vant Toast 显示，这里不再渲染占位内容，以避免“空白界面上叠一个loading” -->
    <template v-if="false"></template>

    <!-- 错误显示（可被插槽覆盖） -->
    <template v-else-if="docError">
      <slot
        name="error"
        :error="docError"
        :message="docErrorMessage"
        :retry="retry"
      >
        <pdf-error-display :message="docErrorMessage" @retry="retry" />
      </slot>
    </template>

    <!-- PDF 内容区域 -->
    <div
      v-else-if="documentLoaded"
      class="pdf-viewer-core__content"
      ref="content"
    >
      <gesture-container
        ref="gesture"
        :scale.sync="currentScale"
        :gestures-enabled="gesturesEnabled"
        :zoom-target="zoomTarget"
        @update:scale="setScale"
        @request-prev-page="prevPage"
        @request-next-page="nextPage"
      >
        <pdf-page
          :page-number="currentPage"
          :scale="currentScale"
          :pdf-services="pdfServices"
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
      <slot name="empty">
        <pdf-empty-state />
      </slot>
    </template>
    <!-- 其他情况（如正在加载、有 src 正在初始化/加载）不渲染任何占位，以免与 Toast 冲突 -->
    <template v-else></template>
  </div>
</template>

<script>
import { PdfServices } from "../core";
import PdfPage from "./PdfPage.vue";
import PdfErrorDisplay from "./PdfErrorDisplay.vue";
import PdfEmptyState from "./PdfEmptyState.vue";
import GestureContainer from "./GestureContainer.vue";

import {
  mapDocumentState,
  mapViewerState,
  mapDocumentActions,
  mapViewerActions,
  mapDocumentGetters,
} from "../store/index.js";

export default {
  name: "PdfViewport",

  components: {
    PdfPage,
    PdfErrorDisplay,
    PdfEmptyState,
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
  },

  data() {
    return {
      // 服务实例
      pdfServices: null,

      // 状态（文档级由 Store 管理）
      documentLoaded: false,

      // 当前状态
      currentPage: this.initialPage,
      currentScale: this.initialScale,
      totalPages: 0,

      // 文档信息
      documentInfo: null,
    };
  },

  async mounted() {
    await this.initializeServices();

    if (this.src) {
      await this.loadDocument();
    }
  },

  beforeDestroy() {
    this.destroyServices();
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

    // 监听 Vuex（通过 mapState 暴露的别名），避免硬编码路径
    storeCurrentPage: {
      handler(newPage, oldPage) {
        if (newPage !== oldPage && newPage !== this.currentPage) {
          // 避免循环调用，只有当Vuex状态与组件状态不同步时才更新
          this.syncPageFromStore(newPage);
        }
      },
      immediate: false,
    },

    // 监听全局缩放数值变化（数值模式时），由 Store 驱动 Core 应用
    storeScale: {
      handler(newScale, oldScale) {
        if (
          typeof newScale === "number" &&
          newScale !== oldScale &&
          newScale !== this.currentScale
        ) {
          this.syncScaleFromStore(newScale);
        }
      },
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
      zoomInAction: "zoomIn",
      zoomOutAction: "zoomOut",
    }),

    /**
     * 初始化服务
     */
    async initializeServices() {
      try {
        // 创建 PDF 服务
        this.pdfServices = new PdfServices(this, {
          isMobile: true,
        });

        // 预初始化（幂等）：确保 application/eventBridge 等就绪
        await this.pdfServices.initialize();


        console.log("PDF 查看器核心服务初始化完成");
      } catch (error) {
        console.error("PDF 查看器核心服务初始化失败:", error);
        if (this.$store && this.setDocumentError) {
          this.setDocumentError({
            error: error.message,
            type: "init",
          });
        }
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
      if (!this.pdfServices) {
        await this.initializeServices();
      } else if (!this.pdfServices.initialized && this.pdfServices.initialize) {
        await this.pdfServices.initialize();
      }

      try {
        this.documentLoaded = false;

        // 统一由 Store 执行真实加载，并在完成后由组件接管
        await this.realLoadDocument({ src: this.src });

        // 从 Store 取出文档并附加给 Services（使用映射的 computed）
        const pdfDocument = this.storePdfDocument;
        const infoState = this.storeDocumentInfo || {};
        if (pdfDocument && this.pdfServices?.attachDocument) {
          // 通过映射的 computed 读取 metadata，避免直接访问 $store
          const metadata = this.storeMetadata || null;
          this.pdfServices.attachDocument(pdfDocument, {
            info: {
              numPages: infoState.numPages || pdfDocument?.numPages || 0,
              fingerprint:
                infoState.fingerprint ||
                (pdfDocument?.fingerprints && pdfDocument.fingerprints[0]) ||
                pdfDocument?.fingerprint ||
                null,
            },
            metadata,
          });
        }

        // 获取文档信息用于组件后续初始化（从映射的 computed 读取一次）
        const loadedEvent = {
          document: pdfDocument,
          // 兼容旧结构：顶层也提供 numPages/fingerprint
          numPages: infoState.numPages || pdfDocument?.numPages || 0,
          fingerprint:
            infoState.fingerprint ||
            (pdfDocument?.fingerprints && pdfDocument.fingerprints[0]) ||
            pdfDocument?.fingerprint ||
            null,
          info: {
            numPages: infoState.numPages || pdfDocument?.numPages || 0,
            fingerprint:
              infoState.fingerprint ||
              (pdfDocument?.fingerprints && pdfDocument.fingerprints[0]) ||
              pdfDocument?.fingerprint ||
              null,
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
     * 销毁服务
     */
    destroyServices() {
      if (this.pdfServices) {
        this.pdfServices.destroy();
        this.pdfServices = null;
      }

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
      this.documentLoaded = true;
      this.totalPages = event.numPages;
      this.documentInfo = event;

      // 响应式计算最佳缩放比例
      this.$nextTick(() => {
        this.initializeScaleForDocument(event);
      });

      // 传递完整的文档信息给父组件
      // event 结构: { document, numPages, fingerprint, info, metadata }
      this.$emit("document-loaded", {
        document: event.document,
        info: {
          numPages: event.numPages,
          fingerprint: event.fingerprint,
        },
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
      if (this.$store && this.setLoadProgress) {
        this.setLoadProgress({
          progress: event.percentage,
          message: "",
        });
      }

      // 只向父组件传递事件
      this.$emit("load-progress", event);
    },

    /**
     * 处理页面变化
     */
    onPageChanged(event) {
      this.currentPage = event.pageNumber;
      this.$emit("page-changed", event);
    },

    /**
     * 处理缩放变化
     */
    onScaleChanged(event) {
      this.currentScale = event.scale;
      this.$emit("scale-changed", event);
    },

    /**
     * 处理页面渲染完成
     */
    onPageRendered(event) {
      const vp = event && event.viewport;
      if (vp) {
        this.$refs.gesture &&
          this.$refs.gesture.setContentSize(vp.width, vp.height);
      }
      this.$nextTick(() => {
        this.$refs.gesture && this.$refs.gesture.updateContainerSize();
        this.$refs.gesture && this.$refs.gesture.clampPan();
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
      if (this.$refs.gesture && this.$refs.gesture.onCanvasClick) {
        this.$refs.gesture.onCanvasClick(payload);
      }
    },

    // 公共方法

    /**
     * 跳转到指定页面（统一入口：优先通过 Vuex action；无 store 时回退 controlsService）
     */
    goToPage(pageNumber) {
      if (this.$store && this.goToPageAction) {
        return this.goToPageAction(pageNumber);
      }
    },

    /**
     * 从Vuex store同步页面状态
     */
    syncPageFromStore(pageNumber) {
      if (pageNumber !== this.currentPage) {
        const previousPage = this.currentPage;

        // 直接更新组件状态，不触发Vuex更新，避免循环
        this.currentPage = pageNumber;
        // 触发页面变化事件，但不更新Vuex状态
        const pageChangedEvent = {
          pageNumber,
          previous: previousPage,
        };
        this.$emit("page-changed", pageChangedEvent);

        console.log(`页面跳转: ${previousPage} -> ${pageNumber}`);
      }
    },

    // 从Vuex store同步缩放（只做本地与服务层同步，不派发Action）
    syncScaleFromStore(scale) {
      if (typeof scale === "number" && scale !== this.currentScale) {
        this.currentScale = scale;
      }
    },

    /**
     * 下一页（统一从 Vuex action 派发；无 store 回退）
     */
    nextPage() {
      if (this.$store && this.nextPageAction) {
        return this.nextPageAction();
      }
    },

    /**
     * 上一页（统一从 Vuex action 派发；无 store 回退）
     */
    prevPage() {
      if (this.$store && this.prevPageAction) {
        return this.prevPageAction();
      }
    },

    setScale(scale) {
      if (this.$store && this.setScaleAction) {
        return this.setScaleAction(scale);
      }
    },

    /**
     * 放大
     */
    zoomIn() {
      if (this.$store && this.zoomInAction) {
        return this.zoomInAction();
      }
    },

    /**
     * 缩小
     */
    zoomOut() {
      if (this.$store && this.zoomOutAction) {
        return this.zoomOutAction();
      }
    },

    /**
     * 初始化文档的缩放比例
     */
    initializeScaleForDocument(event) {
      // 设置初始页面
      this.currentPage = this.initialPage;

      // 使用初始缩放
      this.currentScale = this.initialScale;

      // 同步到 Vuex 状态
      if (this.$store && this.setScaleAction && this.goToPageAction) {
        this.setScaleAction(this.initialScale);
        this.goToPageAction(this.initialPage);
      }

      // 初次加载按容器宽度适配一次
      this.$nextTick(() => {
        this.fitWidthOnce && this.fitWidthOnce();
      });

      console.log(
        `PDF 文档加载完成，共 ${event?.numPages || "unknown"} 页，初始缩放: ${
          this.initialScale
        }`
      );
    },

    /**
     * 应用缩放比例
     */
    applyScale(scale) {
      this.currentScale = scale;

      // 同步到 Vuex 状态
      if (this.$store && this.setScaleAction) {
        this.setScaleAction(scale);
      }

      // 触发页面重新渲染
      this.onPageChanged({ pageNumber: this.currentPage });

      console.log(`缩放比例更新为: ${scale}`);
    },

    /**
     * 按容器宽度适配一次（无监听、无后续自动调整）
     */
    async fitWidthOnce() {
      try {
        if (!this.documentLoaded || !this.pdfServices) return;
        const container = this.$refs.viewerContainer;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (!rect || rect.width === 0) return;

        const page = await this.pdfServices.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const computed = rect.width / viewport.width;
        if (computed > 0 && Math.abs(computed - this.currentScale) > 0.005) {
          this.$refs.gesture && this.$refs.gesture.setInitialFitScale(computed);
          this.setScale(computed);
        }
      } catch (e) {
        console.warn("fitWidthOnce 计算失败:", e);
      }
    },
  },
};
</script>

<style lang="less" scoped>
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
    min-height: 0; // 确保flex子元素能够正确缩放
    touch-action: none; // 允许自定义手势（禁用浏览器默认手势）
  }

  &__pan {
    will-change: transform;
  }
}
</style>
