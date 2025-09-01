// TextLayerBuilder（简版）：当前阶段以占位文本层为主，后续替换为逐 item 定位
import { BaseLayerBuilder } from "./BaseLayerBuilder";

export class TextLayerBuilder extends BaseLayerBuilder {
  constructor(ctx) {
    super(ctx);
  }

  async render() {
    if (!this.initialized || this.cancelled) return;

    // 清空
    this.layer.innerHTML = "";

    try {
      // 获取文本内容（简版：拼接为单段文本）
      const pageText = await this.pdfServices.application
        ?.getPage(this.pageNumber)
        .then(page => page.getTextContent())
        .then(tc => tc.items.map(it => it.str).join(" "));

      const div = document.createElement("div");
      div.textContent = pageText || "";
      div.style.cssText = `
        position: absolute;
        left: 0; top: 0; right: 0; bottom: 0;
        overflow: hidden; opacity: 0.2; line-height: 1.0;
        white-space: pre-wrap; pointer-events: none;`;

      this.layer.appendChild(div);

      // 尺寸同步
      if (this.viewport) {
        this.layer.style.width = `${this.viewport.width}px`;
        this.layer.style.height = `${this.viewport.height}px`;
      }
    } catch (e) {
      // 降级：忽略文本层失败
      // eslint-disable-next-line no-console
      console.warn("TextLayerBuilder 渲染失败（忽略）:", e);
    }
  }
}
