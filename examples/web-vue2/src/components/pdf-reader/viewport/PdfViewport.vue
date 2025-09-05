<template>
  <div class="pdf-viewer-core" ref="viewerContainer">
    <!-- 加载进度 -->
    <pdf-loading-progress
      v-if="loading"
      :progress="loadProgress"
      :message="loadMessage"
    />

    <!-- 错误显示 -->
    <div v-else-if="error" class="pdf-viewer-core__error">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ error }}</div>
      <button @click="retry" class="error-retry">重试</button>
    </div>

    <!-- PDF 内容区域 -->
    <div v-else-if="documentLoaded" class="pdf-viewer-core__content">
      <pdf-page
        :page-number="currentPage"
        :scale="currentScale"
        :pdf-services="pdfServices"
        :text-layer-enabled="true"
        :annotations-enabled="true"
        @page-rendered="onPageRendered"
        @render-error="onRenderError"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="pdf-viewer-core__empty">
      <div class="empty-icon">📄</div>
      <div class="empty-message">请选择 PDF 文件</div>
    </div>
  </div>
</template>

<script>
import { PdfServices, NavigationService } from "../core/pdf-services.js";
import PdfPage from "./PdfPage.vue";
import PdfLoadingProgress from "../ui/PdfLoadingProgress.vue";

export default {
  name: "PdfViewport",

  components: {
    PdfPage,
    PdfLoadingProgress,
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
    maxCanvasPixels: {
      type: Number,
      default: 0,
    },
    textLayerMode: {
      type: Number,
      default: 1,
    },
  },

  data() {
    return {
      // 服务实例
      pdfServices: null,
      navigationService: null,

      // 状态
      loading: false,
      error: null,
      documentLoaded: false,

      // 加载进度
      loadProgress: 0,
      loadMessage: "正在加载...",

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

  watch: {
    src: {
      handler: "onSrcChange",
      immediate: false,
    },

    // 监听Vuex状态变化
    "$store.state.pdfReader.viewer.currentPage": {
      handler(newPage, oldPage) {
        if (newPage !== oldPage && newPage !== this.currentPage) {
          // 避免循环调用，只有当Vuex状态与组件状态不同步时才更新
          this.syncPageFromStore(newPage);
        }
      },
      immediate: false,
    },

    // 监听全局缩放数值变化（数值模式时），由 Store 驱动 Core 应用
    "$store.state.pdfReader.viewer.scale": {
      handler(newScale, oldScale) {
        if (typeof newScale === "number" && newScale !== oldScale && newScale !== this.currentScale) {
          this.setScale(newScale);
        }
      },
      immediate: false,
    },
  },

  methods: {
    /**
     * 初始化服务
     */
    async initializeServices() {
      try {
        // 创建 PDF 服务
        this.pdfServices = new PdfServices(this, {
          isMobile: true,
          maxCanvasPixels: this.maxCanvasPixels,
          textLayerMode: this.textLayerMode,
        });

        // 创建导航服务
        this.navigationService = new NavigationService(this.pdfServices);

        console.log("PDF 查看器核心服务初始化完成");
      } catch (error) {
        console.error("PDF 查看器核心服务初始化失败:", error);
        this.error = "初始化失败: " + error.message;
      }
    },

    /**
     * 加载文档
     */
    async loadDocument() {
      if (!this.src || !this.pdfServices) {
        return;
      }

      try {
        this.loading = true;
        this.error = null;
        this.documentLoaded = false;
        this.loadProgress = 0;
        this.loadMessage = "正在加载 PDF...";

        await this.pdfServices.loadDocument(this.src);
      } catch (error) {
        console.error("PDF 文档加载失败:", error);
        this.error = error.message;
        this.loading = false;
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

      this.navigationService = null;
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
      this.loading = false;
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
          title: event.info?.Title || "",
          author: event.info?.Author || "",
          fingerprint: event.fingerprint,
        },
      });
    },

    /**
     * 处理文档加载错误
     */
    onDocumentError(event) {
      this.loading = false;
      this.error = event.error;
      this.$emit("document-error", event);
    },

    /**
     * 处理加载进度
     * 注意：这个方法现在通过 pdf-services 直接调用，不再作为事件监听器
     */
    onLoadProgress(event) {
      this.loadProgress = event.percentage;
      this.loadMessage = `正在加载... ${event.percentage}%`;
      // 只向父组件传递事件，不要再次发出给自己
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
      this.$emit("page-rendered", event);
    },

    /**
     * 处理页面渲染错误
     */
    onRenderError(event) {
      console.error("页面渲染错误:", event);
      this.$emit("render-error", event);
    },

    // 公共方法

    /**
     * 跳转到指定页面（统一入口：优先通过 Vuex action；无 store 时回退 NavigationService）
     */
    goToPage(pageNumber) {
      if (this.$store) {
        return this.$store.dispatch("pdfReader/viewer/goToPage", pageNumber);
      }
      if (this.navigationService) {
        return this.navigationService.goToPage(pageNumber);
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
        if (this.navigationService) {
          this.navigationService.currentPage = pageNumber;
        }

        // 触发页面变化事件，但不更新Vuex状态
        const pageChangedEvent = {
          pageNumber,
          previous: previousPage,
        };
        this.$emit("page-changed", pageChangedEvent);

        console.log(`页面跳转: ${previousPage} -> ${pageNumber}`);
      }
    },

    /**
     * 下一页（统一从 Vuex action 派发；无 store 回退）
     */
    nextPage() {
      if (this.$store) {
        return this.$store.dispatch("pdfReader/viewer/nextPage");
      }
      if (this.navigationService) {
        return this.navigationService.nextPage();
      }
    },

    /**
     * 上一页（统一从 Vuex action 派发；无 store 回退）
     */
    prevPage() {
      if (this.$store) {
        return this.$store.dispatch("pdfReader/viewer/prevPage");
      }
      if (this.navigationService) {
        return this.navigationService.prevPage();
      }
    },





    setScale(scale) {
      if (this.navigationService) {
        return this.navigationService.setScale(scale);
      }
    },

    /**
     * 放大
     */
    zoomIn() {
      if (this.navigationService) {
        return this.navigationService.zoomIn();
      }
    },

    /**
     * 缩小
     */
    zoomOut() {
      if (this.navigationService) {
        return this.navigationService.zoomOut();
      }
    },

    /**
     * 初始化文档的缩放比例
     */
    initializeScaleForDocument(event) {
      // 设置初始页面
      this.navigationService.currentPage = this.initialPage;
      this.currentPage = this.initialPage;

      // 使用初始缩放
      this.navigationService.currentScale = this.initialScale;
      this.currentScale = this.initialScale;

      // 同步到 Vuex 状态
      if (this.$store) {
        this.$store.dispatch("pdfReader/viewer/setScale", this.initialScale);
        this.$store.dispatch("pdfReader/viewer/goToPage", this.initialPage);
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
      this.navigationService.currentScale = scale;
      this.currentScale = scale;

      // 同步到 Vuex 状态
      if (this.$store) {
        this.$store.dispatch("pdfReader/viewer/setScale", scale);
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
  background: #f5f5f5;

  &__content {
    flex: 1;
    overflow: auto; // 允许滚动
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 12px 12px 100px 12px; // 移动端控制条更高，默认给足空间
    min-height: 0; // 确保flex子元素能够正确缩放
  }

  &__error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;

    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .error-message {
      font-size: 16px;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .error-retry {
      padding: 8px 16px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &:hover {
        background: #40a9ff;
      }

      &:active {
        background: #096dd9;
      }
    }
  }

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-message {
      font-size: 16px;
      color: #999;
    }
  }
}


</style>

