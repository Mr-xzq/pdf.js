import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

let _libInitialized = false;

export function initializePdfJs() {
  if (!_libInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
      { type: "module" }
    );
    _libInitialized = true;
  }
  return pdfjsLib;
}
// 缩放常量与工具（供 viewer 模块使用）
export const DEFAULT_SCALE_DELTA = 1.1; // 乘法步进
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10.0;

// 四舍五入小数点后两位
export function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {Object} params
 * @param {string} params.src 文档地址
 * @param {(progress:{loaded:number,total:number,percentage:number})=>void} [params.onProgress]
 * @param {Object} [params.getDocumentOptions] 其它传给 getDocument 的参数（headers、withCredentials 等）
 */
export async function loadPdfDocument({
  src,
  onProgress,
  ...getDocumentOptions
} = {}) {
  if (!src) throw new Error("loadPdfDocument 需要 src");

  const pdfjsLib = initializePdfJs();

  // 合并默认阅读器配置，保持与应用层一致
  const params = { url: src, ...getDocumentOptions };
  const loadingTask = pdfjsLib.getDocument(params);

  // 进度回调
  if (typeof onProgress === "function") {
    loadingTask.onProgress = ({ loaded = 0, total = 0 }) => {
      const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
      onProgress({ loaded, total, percentage });
    };
  }

  const pdfDocument = await loadingTask.promise;
  return { pdfDocument };
}
