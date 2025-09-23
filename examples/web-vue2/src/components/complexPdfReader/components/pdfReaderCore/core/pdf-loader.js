import { initializePdfJs, READER_CONFIG } from "./pdf-config.js";

/**
 * 纯服务，不依赖 Vue 组件；负责真实加载与进度回调
 *
 * 参数：
 * - src: string 文档地址
 * - onProgress?: (progress) => void 进度回调（含 percentage）
 * - signal?: AbortSignal 取消信号
 * - getDocumentOptions?: 传递给 pdfjsLib.getDocument 的附加参数（headers、withCredentials 等）
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
    loadingTask.onProgress = progressData => {
      const percentage =
        progressData.total > 0
          ? Math.round((progressData.loaded / progressData.total) * 100)
          : 0;
      onProgress({ ...progressData, percentage });
    };
  }

  let aborted = false;
  let destroyPromise = null;

  // 取消支持（确保在抛出前等待 destroy 完成）
  const onAbort = () => {
    aborted = true;
    try {
      const p = loadingTask.destroy();
      destroyPromise =
        p && typeof p.then === "function" ? p : Promise.resolve();
    } catch (_) {
      destroyPromise = Promise.resolve();
    }
  };
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const pdfDocument = await loadingTask.promise;

    // 尝试读取信息（容错）
    let info = null;
    let metadata = null;
    try {
      const meta = await pdfDocument.getMetadata();
      // 现在直接返回完整的 meta 对象，包含 { info, metadata, contentDispositionFilename, contentLength }
      info = meta.info || null;
      metadata = meta || null;
    } catch (_) {}

    return { pdfDocument, info, metadata };
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
