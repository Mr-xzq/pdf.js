// BaseLayerBuilder: 提供统一生命周期接口与默认实现
// 注意：保持简洁，便于后续替换/扩展

export class BaseLayerBuilder {
  constructor({ container, pdfServices, getServices }) {
    this.container = container; // DOM element
    this.layer = null; // DOM element for this layer
    this.pdfServices = pdfServices; // PdfServices 实例
    // 延迟获取 application services（linkService/l10n/...）
    this.getServices = getServices || (() => null);

    this.viewport = null;
    this.pageNumber = 1;
    this.initialized = false;
    this.cancelled = false;
  }

  setup({ pageNumber, viewport }) {
    this.pageNumber = pageNumber;
    this.viewport = viewport;

    if (!this.layer) {
      this.layer = document.createElement("div");
      this.layer.style.position = "absolute";
      this.layer.style.left = "0";
      this.layer.style.top = "0";
      this.layer.style.right = "0";
      this.layer.style.bottom = "0";
      // 确保该包装层不拦截事件（让空白区域的拖拽/滚动透传到底层）
      this.layer.style.pointerEvents = "none";
      this.container.appendChild(this.layer);
    }

    this.initialized = true;
    this.cancelled = false;
  }

  async render(_options = {}) {
    // 子类实现
  }

  async update({ viewport }) {
    this.viewport = viewport;
    if (this.layer) {
      this.layer.style.width = `${viewport.width}px`;
      this.layer.style.height = `${viewport.height}px`;
    }
  }

  cancel() {
    this.cancelled = true;
  }

  destroy() {
    this.cancel();
    if (this.layer && this.layer.parentNode) {
      this.layer.parentNode.removeChild(this.layer);
    }
    this.layer = null;
    this.initialized = false;
  }
}
