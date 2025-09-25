// TextLayerBuilder（官方构建器封装版）：提供文本选中/搜索基础能力
import { BaseLayerBuilder } from "./BaseLayerBuilder";
import { TextLayerBuilder as PdfjsTextLayerBuilder } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";

export class TextLayerBuilder extends BaseLayerBuilder {
  constructor(ctx) {
    super(ctx);
    this._builder = null; // pdfjsViewer.TextLayerBuilder 实例
  }

  async render() {
    if (!this.initialized || this.cancelled) return;

    // 清空容器
    this.layer.innerHTML = "";

    try {
      const page = await this.pdfServices?.getPage?.(this.pageNumber);
      if (!page) return;

      // 创建官方 TextLayerBuilder，并把其内部 div 挂载到我们的容器下
      this._builder = new PdfjsTextLayerBuilder({
        pdfPage: page,
        onAppend: div => {
          // div.className === 'textLayer'
          this.layer.appendChild(div);
        },
      });

      // 渲染文本层（使用当前 viewport）
      await this._builder.render(this.viewport);

      // 尺寸同步
      if (this.viewport) {
        this.layer.style.width = `${this.viewport.width}px`;
        this.layer.style.height = `${this.viewport.height}px`;
      }
    } catch (e) {
      console.warn("TextLayerBuilder 渲染失败（忽略）:", e);
    }
  }

  cancel() {
    super.cancel();
    try {
      this._builder?.cancel();
    } catch (_) {}
  }

  destroy() {
    this.cancel();
    this._builder = null;
    super.destroy();
  }
}
