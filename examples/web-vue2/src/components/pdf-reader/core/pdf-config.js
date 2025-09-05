// 仅保留移动端配置：全局只需要移动端逻辑，去掉桌面端相关配置
// 注意：此文件导出 initializePdfJs 与 MOBILE_CONFIG 即可，避免不必要的配置项。

export async function initializePdfJs() {
  // 如果已初始化，直接返回
  if (typeof globalThis !== "undefined" && globalThis.pdfjsLib) {
    return globalThis.pdfjsLib;
  }

  const pdfjsLib = await import("pdfjs-dist/webpack.mjs");

  // 确保 globalThis.pdfjsLib 可用，供 pdf_viewer.mjs 使用
  if (typeof globalThis !== "undefined") {
    globalThis.pdfjsLib = pdfjsLib;
  }

  return pdfjsLib;
}

// 默认阅读器配置（仅保留功能必需项）：文本层、注释层、禁用脚本。
// 其它项均采用 PDF.js 默认值，便于维护与升级。
export const READER_CONFIG = {
  textLayerMode: 1, // 启用文本层（支持搜索/选中）
  annotationMode: 1, // 启用表单注释
  enableScripting: false, // 禁用 PDF 内嵌脚本
};
