// PDF.js 基础配置
export const PDF_CONFIG = {
  // 高质量渲染配置
  maxCanvasPixels: 16777216,    // 16M像素限制 (4096x4096)，支持高分辨率渲染
  maxImageSize: 1024 * 1024,    // 1M像素限制
  textLayerMode: 1,             // 启用文本层
  enableScripting: false,       // 禁用 PDF JavaScript
  annotationMode: 1,            // 仅启用表单注释
  useSystemFonts: true,         // 使用系统字体提高渲染质量
  disableFontFace: false        // 启用字体渲染
};

// Worker 配置（使用本地 PDF.js 库 + webpack alias）
export async function initializePdfJs() {
  // 使用 webpack alias 'pdfjs-dist' 指向本地库
  const pdfjsLib = await import('pdfjs-dist/webpack.mjs');

  // 确保 globalThis.pdfjsLib 可用，供 pdf_viewer.mjs 使用
  if (typeof globalThis !== 'undefined') {
    globalThis.pdfjsLib = pdfjsLib;
  }

  return pdfjsLib;
}

// 移动端专用配置
export const MOBILE_CONFIG = {
  ...PDF_CONFIG,
  // 移动端特殊优化 - 保持高质量渲染但限制像素数
  maxCanvasPixels: 8388608,     // 8M像素限制 (2896x2896)，平衡性能和质量
  disableAutoFetch: false,
  disableStream: false,
  disableRange: false
};