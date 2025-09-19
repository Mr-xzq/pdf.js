<template>
  <div class="pdf-viewer-core" ref="viewerContainer">
    <!-- 加载进度（来源：Store） -->
    <pdf-loading-progress
      v-if="docLoading && !documentLoaded"
      :progress="docProgress"
      :message="docMessage"
    />

    <!-- 错误显示（来源：Store，兼容本地） -->
    <div v-else-if="docError" class="pdf-viewer-core__error">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ docErrorMessage }}</div>
      <button @click="retry" class="error-retry">重试</button>
    </div>

    <!-- PDF 内容区域 -->
    <div v-else-if="documentLoaded" class="pdf-viewer-core__content" ref="content"
         @mousedown="onPanStart" @mousemove="onPanMove" @mouseup="onPanEnd" @mouseleave="onPanEnd"
         @touchstart="onPanStart" @touchmove="onPanMove" @touchend="onPanEnd">
      <div class="pdf-viewer-core__pan" :style="panStyle()">
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
      </div>
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
import { MIN_SCALE, MAX_SCALE } from "../core/scale";
import { mapDocumentState, mapViewerState, mapDocumentActions, mapViewerActions, mapDocumentGetters } from "../store/index.js";

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
    // 手势开关（默认启用）
    gesturesEnabled: { type: Boolean, default: true },
    // 双击放大目标（优先使用外部传入；未传则使用 baseline*1.5）
    zoomTarget: { type: Number, default: null },
  },

  data() {
    return {
      // 服务实例
      pdfServices: null,
      navigationService: null,

      // 状态（文档级由 Store 管理）
      documentLoaded: false,

      // 当前状态
      currentPage: this.initialPage,
      currentScale: this.initialScale,
      totalPages: 0,

      // 文档信息
      documentInfo: null,

      // 平移与边界
      panX: 0,
      panY: 0,
      panStartX: 0,
      panStartY: 0,
      panAtStartX: 0,
      panAtStartY: 0,
      isPanning: false,
      contentWidth: 0,
      contentHeight: 0,
      containerWidth: 0,
      containerHeight: 0,

      // Pinch 缩放状态
      isPinching: false,
      pinchStartDistance: 0,
      pinchStartScale: 1,
      pinchCenterX: 0,
      pinchCenterY: 0,
      pinchStartContentWidth: 0,
      pinchStartContentHeight: 0,

      // 双击检测
      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,

      // 初次适配的基线缩放（用于“缩小”恢复）
      initialFitScale: 0,
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
    ...mapDocumentState([
      "loading",
      "loadProgress",
      "loadMessage",
      "error",
    ]),
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
      return this.loadMessage || "正在加载...";
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
  },

  methods: {

    panStyle() {
      return {
        transform: `translate(${this.panX}px, ${this.panY}px)`,
        willChange: 'transform',
        cursor: this.currentScale > 1 ? (this.isPanning ? 'grabbing' : 'grab') : 'default',
      };
    },

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
          maxCanvasPixels: this.maxCanvasPixels,
          textLayerMode: this.textLayerMode,
        });

        // 预初始化（幂等）：确保 application/eventBridge 等就绪
        await this.pdfServices.initialize();

        // 创建导航服务
        this.navigationService = new NavigationService(this.pdfServices);

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
        // 本地 UI 状态尽量从 Store 读取，这里不再手动置本地 loading/进度
        this.documentLoaded = false;

        // 统一由 Store 执行真实加载，并在完成后由组件接管文档
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
              fingerprint: infoState.fingerprint || pdfDocument?.fingerprint || null,
              Title: infoState.title || "",
              Author: infoState.author || "",
            },
            metadata,
          });
        }

        // 获取文档信息用于组件后续初始化（从映射的 computed 读取一次）
        const loadedEvent = {
          document: pdfDocument,
          // 兼容旧结构：顶层也提供 numPages/fingerprint
          numPages: infoState.numPages || pdfDocument?.numPages || 0,
          fingerprint: infoState.fingerprint || pdfDocument?.fingerprint,
          info: {
            numPages: infoState.numPages || pdfDocument?.numPages || 0,
            title: infoState.title || "",
            author: infoState.author || "",
            fingerprint: infoState.fingerprint || pdfDocument?.fingerprint,
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
          message: `正在加载... ${event.percentage}%`,
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
      // 更新内容尺寸并约束平移边界
      const vp = event && event.viewport;
      if (vp) {
        this.contentWidth = vp.width;
        this.contentHeight = vp.height;
      }
      this.$nextTick(() => {
        this.updateContainerSize();
        this.clampPan();
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
     * 画布点击：左右翻页
     * 左半边 -> 上一页；右半边 -> 下一页
     */
    onCanvasClick(payload) {
      try {
        const { x, event } = payload || {};
        const target = event?.target;
        const width = target?.clientWidth || 0;
        if (!width) return;

        const now = Date.now();
        const dt = now - this.lastTapTime;
        const dx = Math.abs((x || 0) - (this.lastTapX || 0));
        const isDoubleTap = dt < 300 && dx < 24;
        this.lastTapTime = now;
        this.lastTapX = x || 0;
        this.lastTapY = 0;

        if (this.gesturesEnabled && isDoubleTap) {
          // 双击：基线 <-> 目标倍数 切换（优先使用外部 zoomTarget；否则 baseline*1.5），并以点击位置为锚点
          const baseline = this.getBaselineScale();
          const oldScale = this.currentScale || 1;
          const targetZoom = (typeof this.zoomTarget === 'number' && this.zoomTarget > 0)
            ? this.zoomTarget
            : baseline * 1.5;
          const newScale = oldScale <= baseline + 0.01
            ? Math.min(targetZoom, MAX_SCALE)
            : baseline;

          // 计算点击点在容器内的坐标
          const container = this.$refs.content || this.$refs.viewerContainer || target?.parentElement;
          const rect = container?.getBoundingClientRect?.();
          if (rect) {
            const Cx = event.clientX - rect.left;
            const Cy = event.clientY - rect.top;
            const k = newScale / (oldScale || 1);
            // o' = o + (1 - k) * (C - o)
            this.panX = this.panX + (1 - k) * (Cx - this.panX);
            this.panY = this.panY + (1 - k) * (Cy - this.panY);
            // 更新临时内容尺寸用于边界裁剪
            const startW = this.contentWidth || 0;
            const startH = this.contentHeight || 0;
            this.contentWidth = startW * k;
            this.contentHeight = startH * k;
            this.$nextTick(() => this.clampPan());
          }

          this.currentScale = newScale;
          this.setScale(newScale);
          return; // 阻止翻页
        }

        // 单击：左右翻页
        if (x < width / 2) {
          this.prevPage();
        } else {
          this.nextPage();
        }
      } catch (e) {
        // 兜底不抛出，避免影响正常渲染
        console.warn("onCanvasClick 处理失败:", e);
      }
    },

    // 公共方法

    /**
     * 跳转到指定页面（统一入口：优先通过 Vuex action；无 store 时回退 NavigationService）
     */
    goToPage(pageNumber) {
      if (this.$store && this.goToPageAction) {
        return this.goToPageAction(pageNumber);
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
      if (this.navigationService) {
        return this.navigationService.nextPage();
      }
    },

    /**
     * 上一页（统一从 Vuex action 派发；无 store 回退）
     */
    prevPage() {
      if (this.$store && this.prevPageAction) {
        return this.prevPageAction();
      }
      if (this.navigationService) {
        return this.navigationService.prevPage();
      }
    },

    setScale(scale) {
      if (this.$store && this.setScaleAction) {
        return this.setScaleAction(scale);
      }
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
          this.initialFitScale = computed;
          this.setScale(computed);
        }
      } catch (e) {

        console.warn("fitWidthOnce 计算失败:", e);
      }
    },

    /**
     * 工具：容器尺寸、基线缩放、边界裁剪
     */
    updateContainerSize() {
      const el = this.$refs.content || this.$refs.viewerContainer;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      this.containerWidth = rect.width || 0;
      this.containerHeight = rect.height || 0;
    },

    // 获取基线缩放（优先取首次适配的宽度比例）
    getBaselineScale() {
      return this.initialFitScale || this.initialScale || 1.0;
    },

    // 约束平移边界（横向以居中为原点，纵向以顶部对齐为原点）
    clampPan() {
      const cw = this.containerWidth || 0;
      const ch = this.containerHeight || 0;
      const pw = this.contentWidth || 0;
      const ph = this.contentHeight || 0;

      // X 轴：内容居中 -> 允许范围 [-((pw-cw)/2), +((pw-cw)/2)]
      let minX = 0, maxX = 0;
      if (pw > cw) {
        const cx = (pw - cw) / 2;
        minX = -cx; maxX = cx;
      }

      // Y 轴：内容顶部对齐 -> 允许范围 [-(ph-ch), 0]
      let minY = 0, maxY = 0;
      if (ph > ch) {
        minY = -(ph - ch);
        maxY = 0;
      }

      if (this.panX < minX) this.panX = minX;
      if (this.panX > maxX) this.panX = maxX;
      if (this.panY < minY) this.panY = minY;
      if (this.panY > maxY) this.panY = maxY;
    },

    /**
     * 简单双指/鼠标拖拽平移
     */
    onPanStart(e) {
      if (!this.gesturesEnabled) return;
      const touches = e.touches ? e.touches : null;

      // 触摸点击注释层链接时，放行原生点击（尤其是移动端）
      if (touches) {
        const tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('.annotationLayer a, .annotationLayer .linkAnnotation, .pdf-page-container__annotation-layer a')) {
          this.isPanning = false;
          this.isPinching = false;
          return;
        }
      }

      if (touches && touches.length >= 2) {
        // 开始捏合
        this.isPinching = true;
        const [t1, t2] = touches;
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        this.pinchStartDistance = Math.hypot(dx, dy) || 1;
        this.pinchStartScale = this.currentScale;
        // 手势中心（相对容器）
        const rect = (this.$refs.content || this.$refs.viewerContainer).getBoundingClientRect();
        this.pinchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
        this.pinchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
        // 记录开始时的内容尺寸
        this.pinchStartContentWidth = this.contentWidth || 0;
        this.pinchStartContentHeight = this.contentHeight || 0;
        // 计算该中心点在内容中的相对位置（用于保持中心）
        this.panStartX = this.pinchCenterX; // 复用字段
        this.panStartY = this.pinchCenterY;
        this.panAtStartX = this.panX;
        this.panAtStartY = this.panY;
        if (e && e.cancelable) e.preventDefault();
        return;
      }

      // 单指拖拽
      const point = touches ? touches[0] : e;
      this.isPanning = this.currentScale > (this.getBaselineScale() + 0.001);
      this.panStartX = point.clientX;
      this.panStartY = point.clientY;
      this.panAtStartX = this.panX;
      this.panAtStartY = this.panY;
      if (this.isPanning && e && e.cancelable) e.preventDefault();
    },
    onPanMove(e) {
      if (!this.gesturesEnabled) return;
      const touches = e.touches ? e.touches : null;
      if ((this.isPinching || this.isPanning) && e && e.cancelable) e.preventDefault();
      if (this.isPinching && touches && touches.length >= 2) {
        const [t1, t2] = touches;
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.hypot(dx, dy) || 1;
        const scaleFactor = dist / (this.pinchStartDistance || 1);
        let nextScale = this.pinchStartScale * scaleFactor;
        // 约束缩放范围
        nextScale = Math.min(Math.max(nextScale, MIN_SCALE), MAX_SCALE);
        if (Math.abs(nextScale - this.currentScale) > 0.001) {
          // 以手势中心为锚点保持位置：o' = o + (1 - k) * (C - o)
          const k = (nextScale / (this.pinchStartScale || 1));
          const Cx = this.pinchCenterX;
          const Cy = this.pinchCenterY;
          this.panX = this.panAtStartX + (1 - k) * (Cx - this.panAtStartX);
          this.panY = this.panAtStartY + (1 - k) * (Cy - this.panAtStartY);
          // 临时更新内容尺寸供边界计算
          const startW = this.pinchStartContentWidth || this.contentWidth || 0;
          const startH = this.pinchStartContentHeight || this.contentHeight || 0;
          this.contentWidth = startW * k;
          this.contentHeight = startH * k;
          this.currentScale = nextScale;
          // 同步到 Store 以便外层 UI 更新
          this.setScale(nextScale);
          this.$nextTick(() => this.clampPan());
        }
        return;
      }

      if (!this.isPanning) return;
      const point = touches ? touches[0] : e;
      const dx = point.clientX - this.panStartX;
      const dy = point.clientY - this.panStartY;
      this.panX = this.panAtStartX + dx;
      this.panY = this.panAtStartY + dy;
      this.clampPan();
    },
    onPanEnd() {
      this.isPanning = false;
      this.isPinching = false;
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
