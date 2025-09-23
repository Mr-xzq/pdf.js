// Layer lifecycle helper utilities
// 说明：对现有的 Builder（如 TextLayerBuilder / AnnotationLayerBuilder）封装常用的
// setup/update/render/cancel/destroy 流程，减少组件内样板代码。

/**
 * 创建并初始化一个 Layer Builder
 * @param {Class} BuilderClass - 构造器（如 TextLayerBuilder）
 * @param {Object} options
 * @param {HTMLElement} options.container - 容器元素
 * @param {Object} options.pdfServices - PdfServices 实例
 * @param {Function} options.getServices - 延迟获取 ApplicationServices 的函数
 * @param {Object} options.setup - 传给 builder.setup 的参数（例如 { pageNumber, viewport }）
 * @returns {Object} builder 实例
 */
export function createLayer(
  BuilderClass,
  { container, pdfServices, getServices, setup }
) {
  const builder = new BuilderClass({ container, pdfServices, getServices });
  if (setup) {
    builder.setup(setup);
  }
  return builder;
}

/**
 * 更新并渲染 Layer
 * @param {Object} builder - builder 实例
 * @param {Object} options
 * @param {number} options.pageNumber - 页码
 * @param {Object} options.viewport - PDFPageViewport
 * @returns {Promise<void>}
 */
export function updateAndRenderLayer(builder, { pageNumber, viewport }) {
  if (!builder) return Promise.resolve();
  builder.cancelled = false;
  builder.pageNumber = pageNumber;
  builder.update({ viewport });
  return builder.render();
}

/**
 * 取消进行中的 Layer 渲染
 */
export function cancelLayer(builder) {
  if (builder && typeof builder.cancel === "function") {
    builder.cancel();
  }
}

/**
 * 销毁 Layer 资源
 */
export function destroyLayer(builder) {
  if (builder && typeof builder.destroy === "function") {
    builder.destroy();
  }
}
