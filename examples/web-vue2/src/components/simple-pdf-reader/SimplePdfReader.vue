<script>
// import * as pdfjsLib from "pdfjs-dist/webpack.mjs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/legacy/build/pdf.worker.mjs",
//   import.meta.url
// ).toString();


// 不支持，可能是因为 new Worker 不允许变量的形式，还是因为别的原因
// const workerPath = new URL(
//   "pdfjs-dist/legacy/build/pdf.worker.mjs",
//   import.meta.url
// );
// pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(workerPath, {
//   type: "module",
// });


pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url
), {
  type: "module",
});

// pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
//   'http://127.0.0.1:5678' + '/pdfjs-dist/legacy/build/pdf.worker.mjs',
//   { type: "module" }
// );

// success
// pdfjsLib.GlobalWorkerOptions.workerSrc =
//   "http://127.0.0.1:5678" + "/libs/pdfjs-dist/legacy/build/pdf.worker.mjs";

// 调试代码
// const workerPath = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
// console.log('workerPath:', workerPath.href);
// console.log('import.meta.url:', import.meta.url);

// // 对比两个 URL 是否相同
// const inlineUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
// console.log('URLs equal:', workerPath.href === inlineUrl.href);

export default {
  name: "SimplePdfReader",
  props: {
    src: { type: String, required: true },
    // 最大 canvas 像素（物理像素）上线：1. 防止 OOM；2. 不同浏览器对 canvas 的最大渲染像素有限制；
    maxCanvasPixels: { type: Number, default: 5 * 1024 * 1024 },
  },
  data() {
    return {
      pdfDocument: null,
      pageVNodeList: [],
      // 首次布局缓存：统一缓存第一页基准尺寸与适配比例，避免重复计算
      layoutCache: null,
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
    /**
     * 计算并缓存首页的基准尺寸与适配比例（仅计算一次）
     * 1. 统一占位与渲染所用的 scale，避免抖动与重复计算
     * 2. 使用容器宽度进行等比适配
     */
    async ensureLayoutCache() {
      // 已有缓存直接返回
      if (this.layoutCache) return this.layoutCache;
      if (!this.pdfDocument) return null;

      // 容器宽度（逻辑像素）
      const root = this.$refs.pagesRoot;
      const containerWidth = root?.clientWidth || window.innerWidth || 375;

      // 仅取第 1 页作为基准视口，避免对每页都调用 getPage 带来额外开销
      const firstPage = await this.pdfDocument.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });

      // 根据容器宽度计算铺满宽度的比例
      const fitScale = containerWidth / baseViewport.width;

      // 占位用 CSS 尺寸（避免首次渲染布局跳动）
      const phW = Math.floor(baseViewport.width * fitScale);
      const phH = Math.floor(baseViewport.height * fitScale);

      this.layoutCache = {
        baseW: baseViewport.width,
        baseH: baseViewport.height,
        fitScale,
        phW,
        phH,
      };
      return this.layoutCache;
    },

    async renderOnePage(pageNumber) {
      if (!this.pdfDocument) return;
      const page = await this.pdfDocument.getPage(pageNumber);

      // 复用缓存的适配比例，避免重复计算与不一致
      const cache = await this.ensureLayoutCache();
      // 根据缓存的比例计算实际的渲染尺寸
      const renderViewport = page.getViewport({ scale: cache?.fitScale || 1 });

      const pageVNode = this.pageVNodeList[pageNumber - 1];

      // vnode.elm --> el
      const canvas = pageVNode.children[0]?.elm;
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

      // 物理像素
      canvas.width = Math.floor(renderViewport.width * renderPixelRatio);
      canvas.height = Math.floor(renderViewport.height * renderPixelRatio);

      // 逻辑像素
      canvas.style.width = `${Math.floor(renderViewport.width)}px`;
      canvas.style.height = `${Math.floor(renderViewport.height)}px`;

      const renderTask = page.render({
        canvasContext: ctx,
        // 根据宽度撑满计算的尺寸信息
        viewport: renderViewport,
        // 根据 DPR 进行缩放
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

      // 开始加载
      this.$emit("loading-start");

      try {
        // 创建 pdf.js 文档加载任务
        const task = pdfjsLib.getDocument({ url: this.src });
        // pdf.js 处理（下载等）进度回调，合并进总进度处理
        // loaded 和 total 都是 contentLength
        task.onProgress = ({ loaded = 0, total = 1 }) => {
          this.downloadProgress = total ? loaded / total : 0;
          this.emitProgress();
        };
        // 等待文档加载完成
        const pdf = await task.promise;

        this.pdfDocument = pdf;
        this.totalPages = pdf.numPages;

        // 使用缓存的占位尺寸，避免重复计算与首次渲染抖动
        const { phW: placeholderWidth, phH: placeholderHeight } =
          await this.ensureLayoutCache();

        for (let i = 0; i < this.totalPages; i++) {
          // 给 page 设置占位尺寸，避免布局跳动
          const pageDataObject = {
            class: "spr-page",
            style: {
              width: `${placeholderWidth}px`,
              height: `${placeholderHeight}px`,
            },
          };

          // 给 canvas 设置占位 CSS 尺寸（属性宽高在渲染时再按 DPR 设置）
          const canvasDataObject = {
            class: "spr-canvas",
            style: {
              width: `${placeholderWidth}px`,
              height: `${placeholderHeight}px`,
            },
          };

          // 初始化页面占位，并提前准备好 canvas
          this.pageVNodeList.push(
            <div {...pageDataObject}>
              <canvas {...canvasDataObject}></canvas>
            </div>
          );
        }

        // 逐页渲染（顺序），并更新渲染进度
        for (let pageNumber = 1; pageNumber <= this.totalPages; pageNumber++) {
          await this.renderOnePage(pageNumber);
          this.renderedPages = pageNumber;
          this.emitProgress();
        }

        this.$emit("loaded", { numPages: this.totalPages });
      } catch (e) {
        console.error("loadDocument error", e);
        this.$emit("error", e?.message ?? String(e));
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
      this.pageVNodeList = [];
      // 初始化进度与渲染计数
      this.downloadProgress = 0;
      this.totalPages = 0;
      this.renderedPages = 0;
      // 清理布局缓存，确保下次加载或容器尺寸变化时能重新计算
      this.layoutCache = null;
      if (this.progressRafId) {
        cancelAnimationFrame(this.progressRafId);
        this.progressRafId = null;
      }
    },
  },
  render() {
    return (
      <div class="spr-container">
        <div class="spr-pages" ref="pagesRoot">
          {this.pageVNodeList}
        </div>
      </div>
    );
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
    }
  }
}
</style>
