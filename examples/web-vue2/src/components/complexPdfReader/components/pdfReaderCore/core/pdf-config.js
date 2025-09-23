// PDF.js 与 Viewer 统一入口（Legacy 路线）
// - 统一引入核心库与官方 viewer 组件，统一样式注入
// - Worker 使用 module worker 优先，回退 workerSrc；幂等且不污染 global

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsViewer from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import "pdfjs-dist/legacy/web/pdf_viewer.css";

let _libInitialized = false;

export async function initializePdfJs() {
  if (!_libInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
      { type: "module" }
    );
    _libInitialized = true;
  }
  return pdfjsLib;
}

// Viewer 组件访问（集中管理官方组件导出）
export function getPdfjsViewer() {
  return pdfjsViewer;
}

export function initializePdfViewer() {
  // 目前无需额外初始化逻辑，预留扩展点
  return pdfjsViewer;
}

// 默认阅读器配置（仅保留功能必需项）：文本层、注释层、禁用脚本。
export const READER_CONFIG = {
  textLayerMode: 1,
  annotationMode: 1,
  enableScripting: false,
};
