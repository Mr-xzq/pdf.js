// Core pdf-utils 实现：渲染与页码相关的公共工具

import store from "@/store/index.js";

/**
 * 解析 PDF 目的地为 1-based 页码
 * @param {Object} params
 * @param {Object} params.pdfDocument - PDFDocumentProxy
 * @param {string|Array} params.dest - 命名目的地字符串或 explicitDest 数组
 * @returns {Promise<number|null>} 成功返回 1-based 页码，否则返回 null
 */
export async function resolveDestToPage({ pdfDocument, dest } = {}) {
  if (!pdfDocument) return null;
  try {
    let explicitDest = dest;
    if (typeof explicitDest === "string") {
      explicitDest = await pdfDocument.getDestination(explicitDest);
    }
    if (!Array.isArray(explicitDest)) return null;

    const destRef = explicitDest[0];
    console.log("explicitDest: ", explicitDest);
    console.log(await pdfDocument.getPageIndex(destRef));
    // 通过引用解析页码
    if (destRef !== null && typeof destRef === "object") {
      return (await pdfDocument.getPageIndex(destRef)) + 1;
    }

    // 我们的页码是从 1 开始，因此要从 0-based 转换为 1-based
    const pageNumber = destRef + 1;
    if (isValidPageNumber(pageNumber)) {
      return pageNumber;
    }

    return null;
  } catch (e) {
    console.warn("resolveDestToPage 失败:", e);
    return null;
  }
}

// 取消指定页的当前正在渲染的任务
function cancelRenderTask({ tasks, pageNumber }) {
  if (!tasks) return;
  console.log(`cancelRenderTask - 取消第 ${pageNumber} 页的渲染任务: `);
  const task = tasks[pageNumber];
  if (task) {
    task.cancel?.();
    delete tasks[pageNumber];
  }
}

export function cancelAllRenderTasks({ tasks }) {
  if (!tasks) return;
  console.log("cancelAllRenderTasks - 取消所有渲染任务: ");
  for (const key of Object.keys(tasks)) {
    tasks[key]?.cancel?.();
    delete tasks[key];
  }
}

// 渲染 pdf page 到 Canvas
export async function renderPageToCanvas({ getPage, tasks, pageNumber, canvas, scale = 1, renderOptions = {} } = {}) {
  // 取消同页已有渲染任务
  cancelRenderTask({ tasks, pageNumber });

  // 获取页面与渲染视口（尺寸信息之类的）
  const page = await getPage(pageNumber);
  const renderViewport = page.getViewport({ scale });

  // 使用 devicePixelRatio 提升清晰度(考虑到多倍屏的情况，物理像素和逻辑像素的像素比)
  const devicePixelRatio = window.devicePixelRatio || 1;
  // 渲染一页 PDF 所需的像素数（CSS 尺寸）
  const viewportPixels = Math.max(1, renderViewport.width * renderViewport.height);
  // 限制最大 canvas 像素数，防止内存溢出（可配）
  const MAX_CANVAS_PIXELS = Number(renderOptions.maxCanvasPixels) || 5 * 1024 * 1024;
  // 实际渲染时的像素比
  let renderPixelRatio = devicePixelRatio;
  // 如果超出最大像素限制，按照 MAX_CANVAS_PIXELS 来降低渲染像素比
  if (viewportPixels * (devicePixelRatio * devicePixelRatio) > MAX_CANVAS_PIXELS) {
    renderPixelRatio = Math.sqrt(MAX_CANVAS_PIXELS / viewportPixels);
  }

  // 物理像素（影响绘制清晰度）
  const pixelWidth = Math.floor(renderViewport.width * renderPixelRatio);
  const pixelHeight = Math.floor(renderViewport.height * renderPixelRatio);
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;

  // 逻辑像素（影响布局与占位）
  const cssWidth = `${Math.floor(renderViewport.width)}px`;
  const cssHeight = `${Math.floor(renderViewport.height)}px`;
  canvas.style.width = cssWidth;
  canvas.style.height = cssHeight;

  const ctx = canvas.getContext("2d");

  // pdfjs 源码中 display/api.js --> PDFPageProxy.render
  const renderContextOptions = renderOptions.renderContextOptions ?? {};
  const renderContext = {
    canvasContext: ctx,
    viewport: renderViewport,
    // 根据 DPR 进行缩放
    // CanvasRenderingContext2D transform(a, b, c, d, e, f)
    // 当 b 和 c 为 0 时，a 和 d 控制上下文的水平和垂直缩放。
    transform: renderPixelRatio !== 1 ? [renderPixelRatio, 0, 0, renderPixelRatio, 0, 0] : null,
    ...renderContextOptions,
  };

  // 发起渲染并记录任务，方便取消
  const renderTask = page.render(renderContext);
  tasks[pageNumber] = renderTask;

  try {
    await renderTask.promise;
  } catch (error) {
    // 转换取消异常，便于上层统一处理
    if (error?.name === "RenderingCancelledException" || /cancel/i.test(String(error.message || ""))) {
      throw Object.assign(new Error("render-cancelled"), {
        code: "RENDER_CANCELLED",
      });
    }
    throw error;
  } finally {
    // 只清理当前任务引用，避免覆盖并发中的新任务
    if (tasks[pageNumber] === renderTask) {
      delete tasks[pageNumber];
    }
  }

  return { canvas, viewport: renderViewport };
}

// 判断页码是否合法：1-totalPages
export function isValidPageNumber(pageNumber) {
  const totalPages = store.getters["pdfReaderCore/totalPages"] || 0;
  const totalPagesRes = Number(totalPages);
  const pageNumberRes = Number(pageNumber);

  // pageNumber >= 1
  if (!Number.isFinite(pageNumberRes) || pageNumberRes <= 0) {
    return false;
  }

  // totalPages >= 1
  if (!Number.isFinite(totalPagesRes) || totalPagesRes <= 0) {
    return false;
  }

  return pageNumberRes <= totalPagesRes;
}
