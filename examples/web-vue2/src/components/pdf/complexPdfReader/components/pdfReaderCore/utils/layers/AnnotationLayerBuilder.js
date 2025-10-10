import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * 注释层渲染器，这里我们用来处理点击目录
 * 参考源码：
 * pdfjs/web/annotation_layer_builder.js 对 pdfjs/src/display/annotation_layer.js 的封装
 * pdfjs/web/pdf_page_view.js 对 AnnotationLayerBuilder 的使用
 */
export class AnnotationLayerBuilder {
  constructor({ container, getPage, goToDestination }) {
    this.container = container;
    this.getPage = getPage;
    this.goToDestination = goToDestination;
    // pdfjsLib.AnnotationLayer 实例
    this.annotationLayer = null;
    // 注释层容器 div
    this.div = null;
    this.pageNumber = 1;
    this.viewport = null;
    this.cancelled = false;
    // 标识上一次是否完成过渲染（用于判断能否只走 update）
    this._isRendered = false;
  }

  setup({ pageNumber, viewport }) {
    this.pageNumber = pageNumber;
    this.viewport = viewport;
  }

  async render() {
    console.log("AnnotationLayerBuilder 开始渲染");

    // 重置取消标记，开始新一轮渲染
    this.cancelled = false;

    try {
      const page = await this.getPage?.(this.pageNumber);
      if (!page) return;

      // 统一按官方实现克隆 viewport（dontFlip: true）
      const viewport =
        this.viewport?.clone?.({ dontFlip: true }) || this.viewport;

      // 若已有注释层，优先走 update 流程（避免重建，和 web/annotation_layer_builder.js 一致）
      if (this.annotationLayer && this.div && this._isRendered) {
        this.annotationLayer.update({ viewport });
        // 同步容器尺寸（防止缩放后尺寸不同步）
        if (this.viewport) {
          const w = `${this.viewport.width}px`;
          const h = `${this.viewport.height}px`;
          this.container.style.width = w;
          this.container.style.height = h;
          this.div.style.width = w;
          this.div.style.height = h;
        }
        return;
      }

      // 首次渲染：清空容器并创建 annotationLayer div
      this.container.innerHTML = "";

      // 自定义实现的 goToDestination（闭包捕获）
      const customGoToDestination = this.goToDestination;
      const linkService = {
        // 外部链接：不处理，避免跳出;
        addLinkAttributes(el) {
          el.href = "#";
          el.rel = "noopener";
          el.target = "_self";
        },
        // 内部链接：供注释层生成锚点
        getDestinationHash(dest) {
          if (typeof dest === "string") return "#" + encodeURIComponent(dest);
          if (Array.isArray(dest)) {
            return "#" + encodeURIComponent(JSON.stringify(dest));
          }
          return "#";
        },
        // 内部链接：重写跳转方法
        async goToDestination(dest) {
          if (typeof customGoToDestination !== "function") return;
          await customGoToDestination(dest);
        },
      };

      const annotations = await page.getAnnotations({ intent: "display" });

      // 创建 annotationLayer 容器并附加
      const div = document.createElement("div");
      div.className = "annotationLayer";
      this.container.appendChild(div);
      this.div = div;

      // 创建 AnnotationLayer 实例
      this.annotationLayer = new pdfjsLib.AnnotationLayer({
        div,
        page,
        viewport,
      });

      // 渲染注释层
      await this.annotationLayer.render({
        annotations,
        linkService,
      });
      this._isRendered = true;

      // 同步容器尺寸
      if (this.viewport) {
        const w = `${this.viewport.width}px`;
        const h = `${this.viewport.height}px`;
        this.container.style.width = w;
        this.container.style.height = h;
        div.style.width = w;
        div.style.height = h;
      }
    } catch (e) {
      console.warn("AnnotationLayerBuilder 渲染失败（忽略）:", e);
    }
  }

  cancel() {
    console.log("AnnotationLayerBuilder 取消渲染任务");
    this.cancelled = true;
    this._isRendered = false;
    this.annotationLayer?.cancel?.();
  }

  destroy() {
    this.cancel();
    this.container.innerHTML = "";
    this.annotationLayer = null;
    this.div = null;
    this._isRendered = false;
  }
}
