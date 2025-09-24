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

// 默认阅读器配置（最小化保留项）
export const READER_CONFIG = {
  enableScripting: false,
};


// 缩放相关常量与工具函数（仅数值模式，合并自 scale.js）
export const DEFAULT_SCALE = 1.0;
export const DEFAULT_SCALE_DELTA = 1.1; // 乘法步进
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10.0;

// 限制在 MIN_SCALE, MAX_SCALE 的范围内
export function clampScale(value) {
  const v = Number(value);
  if (!isFinite(v)) return DEFAULT_SCALE;
  return Math.min(Math.max(v, MIN_SCALE), MAX_SCALE);
}

// 四舍五入到小数点后两位
export function round2(value) {
  return Math.round(value * 100) / 100;
}


/**
 * Headless 文档加载器（已从 pdf-loader.js 合并至此）
 * - 独立于 Vue 组件，仅负责真实加载与进度回调
 * - 按需与 pdf-config 同步初始化，保持幂等
 *
 * @param {Object} params
 * @param {string} params.src 文档地址
 * @param {(progress:{loaded:number,total:number,percentage:number})=>void} [params.onProgress]
 * @param {AbortSignal} [params.signal]
 * @param {Object} [params.getDocumentOptions] 其它传给 getDocument 的参数（headers、withCredentials 等）
 */
export async function loadPdfDocument({
  src,
  onProgress,
  signal,
  ...getDocumentOptions
} = {}) {
  if (!src) throw new Error("loadPdfDocument 需要 src");

  const pdfjsLib = await initializePdfJs();

  // 合并默认阅读器配置，保持与应用层一致
  const params = { url: src, ...READER_CONFIG, ...getDocumentOptions };
  const loadingTask = pdfjsLib.getDocument(params);

  // 进度回调
  if (typeof onProgress === "function") {
    loadingTask.onProgress = ({ loaded = 0, total = 0 }) => {
      const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
      onProgress({ loaded, total, percentage });
    };
  }

  let aborted = false;
  let destroyPromise = null;

  // 取消支持（确保在抛出前等待 destroy 完成）
  const onAbort = () => {
    aborted = true;
    try {
      const p = loadingTask.destroy();
      destroyPromise = p && typeof p.then === "function" ? p : Promise.resolve();
    } catch (_) {
      destroyPromise = Promise.resolve();
    }
  };
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const pdfDocument = await loadingTask.promise;

    // 仅返回 pdfDocument；元信息读取上移到调用方（如 Vuex store）
    return { pdfDocument };
  } catch (err) {
    if (aborted) {
      try {
        await destroyPromise;
      } catch (_) {}
      // 标准化为 AbortError
      const abortError = new DOMException("Aborted", "AbortError");
      throw abortError;
    }
    throw err;
  } finally {
    if (signal) {
      try {
        signal.removeEventListener("abort", onAbort);
      } catch (_) {}
    }
  }
}
