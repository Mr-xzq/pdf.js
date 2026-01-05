<script>
import { mapState, mapGetters, mapActions } from "vuex";
import { renderPageToCanvas, cancelAllRenderTasks } from "@/components/pdf/core/pdf-utils.js";

export default {
  name: "SimplePdfReader",
  props: {
    src: { type: String, required: true },
    // 最大 canvas 像素（物理像素）上线：1. 防止 OOM；2. 不同浏览器对 canvas 的最大渲染像素有限制；
    maxCanvasPixels: { type: Number, default: 5 * 1024 * 1024 },
  },
  data() {
    return {
      pageVNodeList: [],
      // 首次布局缓存：统一缓存第一页基准尺寸与适配比例，避免重复计算
      layoutCache: null,
      // pdf.js 下载处理进度
      downloadProgress: 0,
      // 渲染进度 renderedPages / totalPages
      renderedPages: 0,
      progressRafId: null,
      // 渲染任务表，复用 Core 的渲染取消机制
      renderTasks: {},
    };
  },
  computed: {
    // 复用 Core 中的 pdfDocument 与 totalPages 状态
    ...mapState("pdfReaderCore", {
      pdfDocument: "pdfDocument",
      storeError: "error",
    }),
    ...mapGetters("pdfReaderCore", ["totalPages"]),
  },
  watch: {
    src: { handler: "loadDocument" },
    // 统一监听 Store 错误并对外只派发一个 error 事件
    // storeError(err) {
    //   if (err) {
    //     const msg = err?.message || String(err);
    //     this.$emit("error", msg);
    //   }
    // },
  },
  mounted() {
    this.loadDocument();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    ...mapActions("pdfReaderCore", {
      loadDocumentCore: "loadDocument",
      getPageAction: "getPage",
    }),
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
      const firstPage = await this.getPageAction(1);
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
      // 复用缓存的适配比例，避免重复计算与不一致
      const cache = await this.ensureLayoutCache();
      if (!cache) return;

      const pageVNode = this.pageVNodeList[pageNumber - 1];

      // vnode.elm --> el
      const canvas = pageVNode.children[0]?.elm;
      if (!canvas) return;
      const scale = cache?.fitScale || 1;

      await renderPageToCanvas({
        getPage: this.getPageAction,
        tasks: this.renderTasks,
        pageNumber,
        canvas,
        scale,
        renderOptions: { maxCanvasPixels: this.maxCanvasPixels },
      });
    },
    async loadDocument() {
      // 清理上一次状态
      this.cleanup();

      // 开始加载
      this.$emit("loading-start");

      try {
        // 通过 Core 的 loadDocument 能力加载文档，并透传下载进度
        await this.loadDocumentCore({
          getDocumentOptions: { url: this.src },
          onProgress: ({ loaded = 0, total = 0, percentage }) => {
            let ratio = 0;
            if (typeof percentage === "number") {
              ratio = percentage / 100;
            } else {
              ratio = total ? loaded / total : 0;
            }
            this.downloadProgress = Math.min(1, Math.max(0, ratio));
            this.emitProgress();
          },
        });

        // 使用缓存的占位尺寸，避免重复计算与首次渲染抖动
        const { phW: placeholderWidth, phH: placeholderHeight } = await this.ensureLayoutCache();

        this.pageVNodeList = [];
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
        const msg = e?.message || this.storeError?.message || String(e);
        this.$emit("error", msg);
      }
    },
    emitProgress() {
      // 在浏览器下一帧渲染之前 emit progress，提高流畅度并减少卡顿
      if (this.progressRafId) cancelAnimationFrame(this.progressRafId);
      this.progressRafId = requestAnimationFrame(() => {
        const render = this.totalPages > 0 ? this.renderedPages / this.totalPages : 0;
        // 总的进度： pdf.js 内部处理阶段权重 30%（比如下载），渲染阶段权重 70%
        const raw = this.downloadProgress * 0.3 + render * 0.7;
        // Math.round 防止精度丢失，Math.min + Math.max 确保 progress 在 0 - 1 之间
        const progress = Math.min(1, Math.max(0, Math.round(raw * 100) / 100));
        this.$emit("progress", { progress });
        this.progressRafId = null;
      });
    },
    cleanup() {
      // 清理本地渲染状态（不直接重置 Core Store，以便与其他 Reader 共存）
      this.pageVNodeList = [];
      // 初始化进度与渲染计数
      this.downloadProgress = 0;
      this.renderedPages = 0;
      // 清理布局缓存，确保下次加载或容器尺寸变化时能重新计算
      this.layoutCache = null;
      // 取消所有在途渲染任务
      cancelAllRenderTasks({ tasks: this.renderTasks });
      this.renderTasks = {};
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
