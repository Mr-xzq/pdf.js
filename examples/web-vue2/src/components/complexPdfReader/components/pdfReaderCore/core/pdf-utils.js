/**
 * 解析 PDF 目的地为 1-based 页码
 * @param {Object} pdfDocument - PDFDocumentProxy
 * @param {string|Array} dest - 命名目的地字符串或 explicitDest 数组
 * @returns {Promise<number|null>} 成功返回 1-based 页码，否则返回 null
 */
export async function resolveDestToPage(pdfDocument, dest) {
  if (!pdfDocument) return null;
  try {
    let explicitDest = dest;
    if (typeof explicitDest === "string") {
      explicitDest = await pdfDocument.getDestination(explicitDest);
    }
    if (!Array.isArray(explicitDest)) return null;

    const destRef = explicitDest[0];
    if (destRef && typeof destRef === "object") {
      // 通过引用解析页码
      return (await pdfDocument.getPageIndex(destRef)) + 1;
    }
    if (Number.isInteger(destRef)) {
      return destRef + 1; // convert 0-based to 1-based
    }
    return null;
  } catch (e) {
    console.warn("resolveDestToPage 失败:", e);
    return null;
  }
}

/**
 * 根据 viewport 与设备像素比计算 Canvas 尺寸参数
 * 返回：{ canvasWidth, canvasHeight, cssWidth, cssHeight, outputScale }
 */
export function computeCanvasSizing(viewport, devicePixelRatio = 1) {
  const dpr = Number(devicePixelRatio) || 1;
  const outputScale = { sx: dpr, sy: dpr, scaled: dpr !== 1 };
  const canvasWidth = Math.floor(viewport.width * dpr);
  const canvasHeight = Math.floor(viewport.height * dpr);
  const cssWidth = `${viewport.width}px`;
  const cssHeight = `${viewport.height}px`;
  return { canvasWidth, canvasHeight, cssWidth, cssHeight, outputScale };
}

/**
 * 取消指定页的在途渲染任务
 */
export function cancelRenderTask(tasks, pageNumber) {
  if (!tasks) return;
  const task = tasks[pageNumber];
  if (task) {
    try {
      task.cancel?.();
    } catch (_) {}
    delete tasks[pageNumber];
  }
}

export function cancelAllRenderTasks(tasks) {
  if (!tasks) return;
  for (const key of Object.keys(tasks)) {
    try {
      tasks[key]?.cancel?.();
    } catch (_) {}
    delete tasks[key];
  }
}

/**
 * 渲染页面到 Canvas
 * 返回: { canvas, viewport, pageNumber, outputScale }
 */
export async function renderPageToCanvasCore(
  pdfServices,
  tasks,
  pageNumber,
  canvas,
  options = {}
) {
  cancelRenderTask(tasks, pageNumber);

  const page = await pdfServices.getPage(pageNumber);
  const scale = options.scale || 1.0;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const baseViewport = page.getViewport({ scale });
  const { canvasWidth, canvasHeight, cssWidth, cssHeight, outputScale } =
    computeCanvasSizing(baseViewport, devicePixelRatio);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = cssWidth;
  canvas.style.height = cssHeight;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const renderContext = {
    canvasContext: context,
    viewport: baseViewport,
    intent: "display",
    ...options,
  };

  if (outputScale.scaled) {
    context.save();
    context.scale(outputScale.sx, outputScale.sy);
  }

  const renderTask = page.render(renderContext);
  tasks[pageNumber] = renderTask;

  try {
    await renderTask.promise;
  } catch (error) {
    if (
      error &&
      (error.name === "RenderingCancelledException" ||
        /cancel/i.test(String(error.message || "")))
    ) {
      throw Object.assign(new Error("render-cancelled"), {
        code: "RENDER_CANCELLED",
      });
    }
    throw error;
  } finally {
    if (tasks[pageNumber] === renderTask) {
      delete tasks[pageNumber];
    }
  }

  if (outputScale.scaled) {
    context.restore();
  }

  return { canvas, viewport: baseViewport, pageNumber, outputScale };
}
