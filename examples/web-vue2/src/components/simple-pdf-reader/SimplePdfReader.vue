<template>
  <div class="spr-container" ref="container">
    <div v-if="loading" class="spr-status">
      正在加载 PDF… {{ Math.round(progress * 100) }}%
    </div>
    <div v-else-if="error" class="spr-status">
      <div>加载失败：{{ error }}</div>
      <button class="spr-retry" @click="reload">重试</button>
    </div>
    <div class="spr-pages">
      <div
        v-for="(page, idx) in pages"
        :key="idx"
        class="spr-page"
        :ref="setPageRef(idx)"
        :data-index="idx"
        :style="pageStyleFor(idx)"
      >
        <canvas :ref="setCanvasRef(idx)" class="spr-canvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
import * as pdfjsLib from "pdfjs-dist/webpack.mjs";

export default {
  name: "SimplePdfReader",
  props: {
    src: { type: String, required: true },
    lazy: { type: Boolean, default: true }, // 懒加载开关
    lazyOffset: { type: Number, default: 300 }, // 触发预加载的像素偏移
    recycle: { type: Boolean, default: true }, // 离屏回收
    recycleMargin: { type: Number, default: 600 }, // 离屏回收提前量（相对 rootBounds ）
    preMeasurePages: { type: Number, default: 3 } // 预估页高：预先测量前 N 页
  },
  data() {
    return {
      loading: false,
      progress: 0,
      error: "",
      pages: [],
      pdfDocument: null,
      pageCanvases: [],
      pageContainers: [],
      intersectionObserver: null,
      renderedPageList: [],
      queuedPageList: [],
      pageRenderTasks: [],    // 渲染任务句柄，便于取消
      onScroll: null,
      lastScanTimestamp: 0,
      pageHeightsPx: [],      // 预估/实测页面高度（CSS px）
      estimatedPageHeightPx: 0, // 基于首页的估算高度
      // 统计与进度
      timingStart: 0,
      timingDocReady: 0,
      timingPreMeasureMs: 0,
      timingFirstPageStart: 0,
      timingFirstPageDone: 0,
      progressLoaded: 0,
      progressTotal: 0
    };
  },
  computed: {
    pageHeightsSafe() { return this.pageHeightsPx || []; },
    estimatedHeightSafe() { return this.estimatedPageHeightPx || 0; },
    pageStyleFor() {
      return index => {
        const i = Number(index);
        const arr = this.pageHeightsPx || this.pageHeightsSafe;
        const est = this.estimatedHeightSafe;
        const h = Array.isArray(arr) ? arr[i] : 0;
        if (typeof h === 'number' && h > 0) return { minHeight: h + 'px' };
        if (typeof est === 'number' && est > 0) return { minHeight: est + 'px' };
        return {};
      };
    }
  },
  methods: {
    setCanvasRef(index) {
      // Vue 在挂载/卸载时会多次触发 ref 回调，el 可能为 null
      if (!Array.isArray(this.pageCanvases)) this.pageCanvases = [];
      return el => {
        if (!Array.isArray(this.pageCanvases)) this.pageCanvases = [];
        this.pageCanvases[index] = el || null;
      };
    },
    setPageRef(index) {
      if (!Array.isArray(this.pageContainers)) this.pageContainers = [];
      return el => {
        if (!Array.isArray(this.pageContainers)) this.pageContainers = [];
        this.pageContainers[index] = el || null;
      };
    },
    async renderOnePage(pageNumber) {
      if (!this.pdfDocument) return;
      const page = await this.pdfDocument.getPage(pageNumber);

      // 一般来说 1英寸 = PDF 中的 72点 = CSS 中的 96像素
      // 将 PDF 的尺寸转换为 CSS 像素，需要一个转换系数。这个系数就是 CSS / PDF，也就是 96.0 / 72.0。
      const PDF = 72.0;
      const CSS = 96.0;
      const PDF_TO_CSS_UNITS = CSS / PDF;

      const containerWidth = this.$refs.container?.clientWidth || window.innerWidth || 375;
      const baseViewport = page.getViewport({ scale: PDF_TO_CSS_UNITS });
      const widthFitScale = containerWidth / baseViewport.width;
      const renderViewport = page.getViewport({ scale: widthFitScale * PDF_TO_CSS_UNITS });

      const canvas = this.pageCanvases[pageNumber - 1];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const devicePixelRatio = window.devicePixelRatio || 1;
      const MAX_CANVAS_PIXELS = 8 * 1024 * 1024; // ~8MP
      const viewportPixels = renderViewport.width * renderViewport.height;
      let renderPixelRatio = devicePixelRatio;
      // 记录页面高度（用于稳定滚动条）
      const cssHeight = Math.floor(renderViewport.height);
      this.pageHeightsPx[pageNumber - 1] = cssHeight;
      if (!this.estimatedPageHeightPx && cssHeight > 0) this.estimatedPageHeightPx = cssHeight;
      if (viewportPixels * (devicePixelRatio * devicePixelRatio) > MAX_CANVAS_PIXELS) {
        renderPixelRatio = Math.sqrt(MAX_CANVAS_PIXELS / viewportPixels);
      }

      canvas.width = Math.floor(renderViewport.width * renderPixelRatio);
      canvas.height = Math.floor(renderViewport.height * renderPixelRatio);
      canvas.style.width = '100%';
      canvas.style.height = `${Math.floor(renderViewport.height)}px`;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const t0 = performance.now();
      console.log('[SPR] render start', { page: pageNumber, containerWidth, widthFitScale, viewport: { w: Math.floor(renderViewport.width), h: Math.floor(renderViewport.height) }, dpr: devicePixelRatio, renderPixelRatio });
      if (!this.timingFirstPageStart) this.timingFirstPageStart = performance.now();
      const renderTask = page.render({
        canvasContext: ctx,
        viewport: renderViewport,
        transform: renderPixelRatio !== 1 ? [renderPixelRatio, 0, 0, renderPixelRatio, 0, 0] : null
      });
      await renderTask.promise;
      await renderTask.promise;
      if (!this.timingFirstPageDone) this.timingFirstPageDone = performance.now();
      const t1 = performance.now();
      console.log('[SPR] render done', { page: pageNumber, ms: Math.round(t1 - t0) });
      return renderTask;

    },
    async preMeasureHeights(totalPages) {
      const N = Math.min(Math.max(Number(this.preMeasurePages) || 0, 0), totalPages);
      if (N <= 0 || !this.pdfDocument) return;
      const PDF = 72.0; const CSS = 96.0; const PDF_TO_CSS_UNITS = CSS / PDF;
      const containerWidth = this.$refs.container?.clientWidth || window.innerWidth || 375;
      let sum = 0, count = 0;
      for (let pageNumber = 1; pageNumber <= N; pageNumber++) {
        try {
          const page = await this.pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: PDF_TO_CSS_UNITS });
          const widthFitScale = containerWidth / baseViewport.width;
          const renderViewport = page.getViewport({ scale: widthFitScale * PDF_TO_CSS_UNITS });
          const cssHeight = Math.floor(renderViewport.height);
          if (cssHeight > 0) { sum += cssHeight; count += 1; }
        } catch (e) { /* ignore */ }
      }
      if (count > 0) this.estimatedPageHeightPx = Math.round(sum / count);
    },
    setupLazyObserver(forceRecreate = false) {
      if (this.io && !forceRecreate) return;
      if (this.io) {
        this.teardownLazyObserver();
      }
      if (!Array.isArray(this.renderedArr)) this.renderedArr = [];
      if (!Array.isArray(this.queuedArr)) this.queuedArr = [];
      if (!Array.isArray(this.renderTasks)) this.renderTasks = [];

      // IntersectionObserver：进入视口时渲染
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
          const el = entry.target;
          const pageIndex = Number(el.dataset.index);
          const pageNumber = pageIndex + 1;
          if (!(entry.isIntersecting || entry.intersectionRatio > 0)) return;
          const alreadyRendered = this.renderedPageList.indexOf(pageNumber) !== -1;
          const alreadyQueued = this.queuedPageList.indexOf(pageNumber) !== -1;
          console.log('[SPR] IO enter', { page: pageNumber });
          if (alreadyRendered || alreadyQueued) {
            console.log('[SPR] IO skip', { page: pageNumber, alreadyRendered, alreadyQueued });
            return;
          }

          this.queuedPageList.push(pageNumber);
          try {
            const task = await this.renderOnePage(pageNumber);
            if (!Array.isArray(this.pageRenderTasks)) this.pageRenderTasks = [];
            this.pageRenderTasks[pageNumber - 1] = task || null; // 记录渲染任务
            if (this.renderedPageList.indexOf(pageNumber) === -1) this.renderedPageList.push(pageNumber);
          } finally {
            const q = this.queuedPageList.indexOf(pageNumber);
            if (q !== -1) this.queuedPageList.splice(q, 1);
          }
        });
      }, {
        root: this.$refs.container || null,
        rootMargin: `${this.lazyOffset}px 0px ${this.lazyOffset}px 0px`,
        threshold: [0, 0.01, 0.1]
      });

      // 观察所有页面元素
      this.$nextTick(() => {
        (this.pageContainers || []).forEach((el) => { if (el && this.intersectionObserver) this.intersectionObserver.observe(el); });
      });

      // 滚动驱动的回收扫描（节流 100ms）+ 初始扫描
      const doScan = () => {
        const now = Date.now();
        if (now - this.lastScanTimestamp < 100) return;
        this.lastScanTimestamp = now;
        const root = this.$refs.container || document.documentElement;
        const rootRect = root.getBoundingClientRect();
        const topLimit = rootRect.top - this.recycleMargin;
        const bottomLimit = rootRect.bottom + this.recycleMargin;
        (this.pageContainers || []).forEach((el, index0) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const pageNumber = index0 + 1;
          const canvas = this.pageCanvases[index0];
          const outOfRange = rect.bottom < topLimit || rect.top > bottomLimit;
          if (outOfRange && canvas && (canvas.width > 0 || canvas.height > 0)) {
            const task = this.pageRenderTasks && this.pageRenderTasks[index0];
            try { task && task.cancel && task.cancel(); } catch (e) {}
            if (this.pageRenderTasks) this.pageRenderTasks[index0] = null;
            canvas.width = 0; canvas.height = 0;
            const r = this.renderedPageList.indexOf(pageNumber);
            if (r !== -1) this.renderedPageList.splice(r, 1);
          }
        });
      };
      this.onScroll = () => { if (this.recycle) doScan(); };
      (this.$refs.container || window).addEventListener('scroll', this.onScroll, { passive: true });
      if (this.recycle) doScan();
    },
    teardownLazyObserver() {
      if (this.intersectionObserver && typeof this.intersectionObserver.disconnect === 'function') {
        try { this.intersectionObserver.disconnect(); } catch (e) {}
      }
      if (this.onScroll) {
        (this.$refs.container || window).removeEventListener('scroll', this.onScroll);
        this.onScroll = null;
      }
      this.intersectionObserver = null;
      this.queuedPageList = [];
    },
    async loadDocument() {
      this.timingStart = performance.now();
      this.timingDocReady = 0;
      this.timingPreMeasureMs = 0;
      this.timingFirstPageStart = 0;
      this.timingFirstPageDone = 0;
      this.progressLoaded = 0;
      this.progressTotal = 0;
      console.log('[SPR] loadDocument start', { src: this.src });
      if (!this.src) return;
      this.cleanup();
      this.teardownLazyObserver();
      this.loading = true;
      this.error = '';
      this.pages = [];
      this.pageCanvases = [];
      try {
        const task = pdfjsLib.getDocument({ url: this.src });
        task.onProgress = ({ loaded = 0, total = 1 }) => {
          this.progress = total ? loaded / total : 0;
          this.progressLoaded = loaded; this.progressTotal = total;
          console.log('[SPR] onProgress', { loaded, total, percent: total ? Math.round((loaded / total) * 100) : 0 });
        };
        const pdf = await task.promise;
        this.pdfDocument = pdf;
        const totalPages = pdf.numPages;
        this.timingDocReady = performance.now();
        console.log('[SPR] pdf loaded', { numPages: totalPages });
        const pre0 = performance.now();
        await this.preMeasureHeights(totalPages);
        this.timingPreMeasureMs = Math.round(performance.now() - pre0);
        this.pages = new Array(totalPages).fill(0);
        await this.$nextTick();

        if (this.lazy && 'IntersectionObserver' in window) {
          this.setupLazyObserver(true);
          this.loading = false;
        } else {
          for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) { await this.renderOnePage(pageNumber); }
          this.loading = false;
        }

        const done = performance.now();
        const renderedCount = (this.renderedPageList || []).length || (this.pages || []).length;
        const totalMs = Math.round(done - this.timingStart);
        const avgMs = renderedCount ? Math.round(totalMs / renderedCount) : 0;
        const firstPaintMs = this.timingFirstPageStart ? Math.round(this.timingFirstPageStart - this.timingStart) : 0;
        const firstPageRenderMs = (this.timingFirstPageStart && this.timingFirstPageDone) ? Math.round(this.timingFirstPageDone - this.timingFirstPageStart) : 0;
        const downloadMs = this.timingDocReady ? Math.round(this.timingDocReady - this.timingStart) : 0;
        console.log('[SPR] loadDocument done', { numPages: totalPages, renderedCount, totalMs, avgMs, firstPaintMs, firstPageRenderMs, downloadMs, preMeasureMs: this.timingPreMeasureMs });
        this.$emit('loaded', { numPages: totalPages, totalMs, avgMs, firstPaintMs, firstPageRenderMs, downloadMs, preMeasureMs: this.timingPreMeasureMs });
      } catch (e) {
        const fail = performance.now();
        console.error('[SPR] loadDocument error', { ms: Math.round(fail - this.timingStart), error: e });
        this.error = e && e.message ? e.message : String(e);
        this.$emit('error', e);
        this.loading = false;
      }
    },
    cleanup() {
      this.pdfDocument = null;
      this.pages = [];
      this.pageCanvases = [];
      this.pageContainers = [];
      this.renderedPageList = [];
      this.queuedPageList = [];
      this.progress = 0;
    },
    async reload() {
      await this.loadDocument();
    },
  },
  watch: {
    src: {
      handler: "loadDocument",
    },
    lazy() {
      // 懒加载开关变化时，重新装配
      if (this.pdfDoc) {
        this.$nextTick(() => this.setupLazyObserver(true));
      }
    }
  },
  mounted() {
    this.loadDocument();
  },
  beforeDestroy() {
    this.teardownLazyObserver();
    this.cleanup();
  },
};
</script>

<style scoped>
.spr-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #f5f6f7;
}

.spr-status {
  padding: 16px;
  color: #666;
  font-size: 14px;
}
.spr-retry {
  margin-top: 8px;
  border: 1px solid #ddd;
  padding: 6px 12px;
  background: #fff;
  border-radius: 4px;
}
.spr-pages {
  padding: 12px 8px;
}
.spr-page {
  margin: 12px 0;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}
.spr-canvas {
  display: block;
  width: 100%;
  height: auto;
}
</style>
