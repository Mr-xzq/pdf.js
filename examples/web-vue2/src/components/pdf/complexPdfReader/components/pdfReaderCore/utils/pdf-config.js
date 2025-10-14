import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// 缩放常量与工具（供 viewer 模块使用）
export const DEFAULT_SCALE_DELTA = 1.1; // 乘法步进
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10.0;

// 四舍五入小数点后两位
export function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * ZOOM_EPS：用于判断“是否超出基础缩放”的容差阈值（epsilon）
 * 用于过滤浮点/布局抖动
 */
export const ZOOM_EPS = 0.005;

/**
 * @param {Object} params
 * @param {(progress:{loaded:number,total:number,percentage:number})=>void} [params.onProgress]
 * @param {Object} [params.getDocumentOptions] 其它传给 getDocument 的参数（url, data, headers、withCredentials 等）
 */
export async function loadPdfDocument({
  onProgress,
  getDocumentOptions = {},
} = {}) {
  // 合并默认阅读器配置，保持与应用层一致
  const params = { ...getDocumentOptions };
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
