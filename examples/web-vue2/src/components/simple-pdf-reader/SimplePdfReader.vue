<template>
  <div class="spr-container" ref="container">
    <div class="spr-pages">
      <div v-for="n in pages.length" :key="n" class="spr-page">
        <canvas :ref="setCanvasRef(n - 1)" class="spr-canvas"></canvas>
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
    // 最大 canvas 像素（物理像素）上限，防止 OOM；
    maxCanvasPixels: { type: Number, default: 5 * 1024 * 1024 },
  },
  data() {
    return {
      error: "",
      pdfDocument: null,
      pages: [],
      pageCanvases: [],
      // pdf.js 下载处理进度
      downloadProgress: 0,
      // 渲染进度 renderedPages / totalPages
      totalPages: 0,
      renderedPages: 0,
      progressRafId: null,
    };
  },
  watch: {
    src: { handler: "loadDocument" },
  },
  mounted() {
    this.loadDocument();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    setCanvasRef(index) {
      return el => {
        if (!Array.isArray(this.pageCanvases)) this.pageCanvases = [];
        // 确保 ref 和 canvas 的对应关系
        this.pageCanvases[index] = el || null;
      };
    },
    async renderOnePage(pageNumber) {
      if (!this.pdfDocument) return;
      const page = await this.pdfDocument.getPage(pageNumber);

      // 按容器宽度进行 宽度适配 缩放
      const containerWidth =
        this.$refs.container?.clientWidth || window.innerWidth || 375;
      // 获取 PDF 页面的原始尺寸信息
      const baseViewport = page.getViewport({ scale: 1 });
      // 计算 宽度适配 的缩放比例
      const widthFitScale = containerWidth / baseViewport.width;
      // 使用该缩放比例获取渲染视口（尺寸信息）
      const renderViewport = page.getViewport({ scale: widthFitScale });

      const canvas = this.pageCanvases[pageNumber - 1];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // 使用 devicePixelRatio 提升清晰度(考虑到多倍屏的情况，物理像素和逻辑像素的像素比)
      const devicePixelRatio = window.devicePixelRatio || 1;
      // 限制最大 canvas 像素数，防止内存溢出（可配）
      const MAX_CANVAS_PIXELS = this.maxCanvasPixels;
      // 渲染一页 PDF 所需的像素数（CSS 尺寸）
      const viewportPixels = renderViewport.width * renderViewport.height;

      // 实际渲染时的像素比
      let renderPixelRatio = devicePixelRatio;
      // 如果超出最大像素限制，按照 MAX_CANVAS_PIXELS 来降低渲染像素比
      if (
        viewportPixels * (devicePixelRatio * devicePixelRatio) >
        MAX_CANVAS_PIXELS
      ) {
        renderPixelRatio = Math.sqrt(MAX_CANVAS_PIXELS / viewportPixels);
      }

      canvas.width = Math.floor(renderViewport.width * renderPixelRatio);
      canvas.height = Math.floor(renderViewport.height * renderPixelRatio);
      canvas.style.width = `${Math.floor(renderViewport.width)}px`;
      canvas.style.height = `${Math.floor(renderViewport.height)}px`;

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: renderViewport,
        // CanvasRenderingContext2D transform(a, b, c, d, e, f)
        // 当 b 和 c 为 0 时，a 和 d 控制上下文的水平和垂直缩放。
        transform:
          renderPixelRatio !== 1
            ? [renderPixelRatio, 0, 0, renderPixelRatio, 0, 0]
            : null,
      });

      await renderTask.promise;
      return renderTask;
    },
    async loadDocument() {
      if (!this.src) return;

      // 清理上一次状态
      this.cleanup();
      this.error = "";

      // 初始化进度与渲染计数
      this.downloadProgress = 0;
      this.totalPages = 0;
      this.renderedPages = 0;
      if (this.progressRafId) {
        cancelAnimationFrame(this.progressRafId);
        this.progressRafId = null;
      }

      // 开始加载
      this.$emit("loading-start");

      try {
        // 创建 pdf.js 文档加载任务
        const task = pdfjsLib.getDocument({ url: this.src });
        // pdf.js 处理（下载等）进度回调（0-1），合并进总进度处理
        task.onProgress = ({ loaded = 0, total = 1 }) => {
          this.downloadProgress = total ? loaded / total : 0;
          this.emitProgress();
        };
        // 等待文档加载完成
        const pdf = await task.promise;
        this.pdfDocument = pdf;

        // 初始化页面占位并等待 DOM 准备好 canvas
        this.totalPages = pdf.numPages;
        this.pages = new Array(this.totalPages).fill(0);
        await this.$nextTick();

        // 逐页渲染（顺序），并更新渲染进度
        for (let pageNumber = 1; pageNumber <= this.totalPages; pageNumber++) {
          await this.renderOnePage(pageNumber);
          this.renderedPages = pageNumber;
          this.emitProgress();
        }

        this.$emit("loaded", { numPages: this.totalPages }); // 通知外部：加载完成
      } catch (e) {
        console.error("[SPR] loadDocument error", e);
        this.error = e && e.message ? e.message : String(e);
        this.$emit("error", e); // 通知外部：出现错误
      }
    },
    emitProgress() {
      // 在浏览器下一帧渲染之前 emit progress，提高流畅度并减少卡顿
      if (this.progressRafId) cancelAnimationFrame(this.progressRafId);
      this.progressRafId = requestAnimationFrame(() => {
        const render =
          this.totalPages > 0 ? this.renderedPages / this.totalPages : 0;
        // 总的进度： pdf.js 内部处理阶段权重 30%（比如下载），渲染阶段权重 70%
        const raw = this.downloadProgress * 0.3 + render * 0.7;
        // Math.round 防止精度丢失，Math.min + Math.max 确保 progress 在 0 - 1 之间
        const progress = Math.min(1, Math.max(0, Math.round(raw * 100) / 100));
        this.$emit("progress", { progress });
        this.progressRafId = null;
      });
    },
    cleanup() {
      this.pdfDocument = null;
      this.pages = [];
      this.pageCanvases = [];
      this.downloadProgress = 0;
      this.totalPages = 0;
      this.renderedPages = 0;
      if (this.progressRafId) {
        cancelAnimationFrame(this.progressRafId);
        this.progressRafId = null;
      }
    },
  },
};
</script>

<style lang="less" scoped>
.spr-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;

  .spr-pages {
    .spr-page:first-child {
      margin-top: 0;
    }

    .spr-page {
      margin-top: 0.5rem;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border-radius: 6px;

      .spr-canvas {
        display: block;
        width: 100%;
        height: auto;
      }
    }
  }
}
</style>
