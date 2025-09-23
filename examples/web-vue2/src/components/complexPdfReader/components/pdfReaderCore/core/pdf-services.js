import { getPdfApplication } from "./pdf-application.js";
import { EventBridge } from "./pdf-events.js";
import { DEFAULT_SCALE_DELTA, MIN_SCALE, MAX_SCALE } from "./scale.js";
import { initializePdfJs } from "./pdf-config.js";
import store from "@/store/index.js";

/**
 * PDF 服务层封装
 * 提供统一的服务接口，简化组件使用
 */
export class PdfServices {
  constructor(vueComponent, options = {}) {
    // 为保持向后兼容保留构造签名，但不再使用 vueComponent 直接回调
    this.vueComponent = vueComponent;
    this.options = options;

    // 核心服务
    this.application = null;
    this.eventBridge = null;

    // 服务状态
    this.initialized = false;
  }

  /**
   * 初始化服务
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 预初始化：确保 PDF.js 核心库可用
      await this.preInitialize();

      // 获取应用实例
      this.application = getPdfApplication(this.options);

      // 初始化应用
      const services = await this.application.initialize();

      // 创建事件桥接器（仅依赖 EventBus，全局 store 同步）
      this.eventBridge = new EventBridge(services.eventBus);
      this.eventBridge.register();

      this.initialized = true;
      console.log("PDF 服务层初始化完成");

      return services;
    } catch (error) {
      console.error("PDF 服务层初始化失败:", error);
      throw error;
    }
  }

  /**
   * 预初始化：确保 PDF.js 核心库可用
   */
  async preInitialize() {
    try {
      // 统一入口：幂等初始化
      await initializePdfJs();
      console.log("PDF.js 核心库预初始化完成");
    } catch (error) {
      console.error("PDF.js 核心库预初始化失败:", error);
      throw error;
    }
  }

  /**
   * 加载文档（旧路径，逐步淘汰）
   * 仍保留以兼容旧代码；新方案建议改由 Vuex action 执行真实加载，随后调用 attachDocument。
   */

  /**
   * 附加外部已加载的文档（新路径配套）
   * 可选传入 { info, metadata } 用于缓存至应用层，避免重复读取
   */
  attachDocument(pdfDocument, options = {}) {
    if (!this.application) {
      throw new Error("PdfServices 未初始化");
    }
    this.application.attachDocument(pdfDocument, options);
  }

  /**
   * 获取页面
   */
  async getPage(pageNumber) {
    if (!this.application || !this.application.isDocumentLoaded) {
      throw new Error("文档未加载");
    }

    return await this.application.getPage(pageNumber);
  }

  /**
   * 获取文档大纲
   */
  async getOutline() {
    if (!this.application || !this.application.isDocumentLoaded) {
      throw new Error("文档未加载");
    }
    return await this.application.getOutline();
  }

  /**
   * 获取应用服务
   */
  getApplicationServices() {
    if (!this.application || !this.application.initialized) {
      return null;
    }

    return this.application.getServices();
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.eventBridge) {
      this.eventBridge.destroy();
      this.eventBridge = null;
    }

    // 注意：不销毁 application，因为它是单例
    this.application = null;
    this.initialized = false;

    console.log("PDF 服务层已销毁");
  }

  /**
   * 获取文档状态
   */
  get documentState() {
    if (!this.application) {
      return {
        loaded: false,
        loading: false,
        totalPages: 0,
      };
    }

    return {
      loaded: this.application.isDocumentLoaded,
      loading: this.application.isLoading,
      totalPages: this.application.totalPages,
    };
  }

  /**
   * 跳转到 PDF 内部目标（统一入口）
   * 支持传入字符串名称或 explicitDest 数组；
   * 会解析为页码并统一走 Vuex 动作，以驱动当前实现的 UI 跳转。
   */
  async goToDestination(dest) {
    // 文档必须已加载
    const app = this.application;
    if (!app || !app.pdfDocument) {
      throw new Error("PDF 文档未加载");
    }

    try {
      let explicitDest = dest;
      if (typeof explicitDest === "string") {
        explicitDest = await app.pdfDocument.getDestination(explicitDest);
      }

      if (!Array.isArray(explicitDest)) {
        throw new Error("无效的目的地格式");
      }

      const destRef = explicitDest[0];
      let pageNumber = null;

      if (destRef && typeof destRef === "object") {
        // 通过引用解析页码
        pageNumber = (await app.pdfDocument.getPageIndex(destRef)) + 1;
      } else if (Number.isInteger(destRef)) {
        pageNumber = destRef + 1;
      }

      if (!pageNumber) {
        throw new Error("无法解析目的地页码");
      }

      // 统一走 Vuex viewer 动作，保持状态一致（不再调用组件实例）
      if (store && typeof store.dispatch === "function") {
        await store.dispatch("pdfReader/viewer/goToPage", pageNumber);
      } else {
        throw new Error("Vuex store 未就绪，无法跳转页面");
      }

      return pageNumber;
    } catch (error) {
      console.error("goToDestination 失败:", error);
      throw error;
    }
  }

  /**
   * 解析 PDF 目录目的地为页码（不进行跳转）
   * @param {string|Array} dest
   * @returns {Promise<number|null>} 解析成功返回 1-based 页码，否则返回 null
   */
  async resolveDestinationToPage(dest) {
    const app = this.application;
    try {
      if (!app || !app.pdfDocument) {
        throw new Error("PDF 文档未加载");
      }
      let explicitDest = dest;
      if (typeof explicitDest === "string") {
        explicitDest = await app.pdfDocument.getDestination(explicitDest);
      }
      if (!Array.isArray(explicitDest)) return null;
      const destRef = explicitDest[0];
      if (destRef && typeof destRef === "object") {
        // 使用 getPageIndex 解析引用对应的页码
        return (await app.pdfDocument.getPageIndex(destRef)) + 1;
      }
      if (Number.isInteger(destRef)) return destRef + 1;
      return null;
    } catch (e) {
      console.warn("resolveDestinationToPage 失败:", e);
      return null;
    }
  }

}

/**
 * 页面渲染服务
 * 专门处理页面渲染相关功能
 */
export class PageRenderService {
  constructor(pdfServices) {
    this.pdfServices = pdfServices;
    this.renderCache = {};
    this.cacheKeys = []; // 维护键的顺序

    // 跟踪进行中的渲染任务（按页码）
    this._renderTasks = Object.create(null);
  }

  /**
   * 取消指定页的渲染
   */
  cancelRender(pageNumber) {
    const task = this._renderTasks?.[pageNumber];
    if (task) {
      try {
        task.cancel();
      } catch (_) {}
      delete this._renderTasks[pageNumber];
    }
  }

  /**
   * 取消所有渲染任务
   */
  cancelAll() {
    if (!this._renderTasks) return;
    for (const key of Object.keys(this._renderTasks)) {
      try {
        this._renderTasks[key]?.cancel?.();
      } catch (_) {}
      delete this._renderTasks[key];
    }
  }

  /**
   * 渲染页面到 Canvas
   */
  async renderPageToCanvas(pageNumber, canvas, options = {}) {
    // 开始前取消同页在途渲染，避免重叠
    this.cancelRender(pageNumber);

    try {
      const page = await this.pdfServices.getPage(pageNumber);

      const scale = options.scale || 1.0;

      // 获取设备像素比，提高渲染质量
      const devicePixelRatio = window.devicePixelRatio || 1;
      const outputScale = {
        sx: devicePixelRatio,
        sy: devicePixelRatio,
        scaled: devicePixelRatio !== 1,
      };

      // 首先获取基础viewport（用于显示尺寸）
      const baseViewport = page.getViewport({ scale });

      // 设置 Canvas 实际像素尺寸（高分辨率）
      const canvasWidth = Math.floor(baseViewport.width * devicePixelRatio);
      const canvasHeight = Math.floor(baseViewport.height * devicePixelRatio);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 设置 Canvas 显示尺寸（CSS像素）
      canvas.style.width = `${baseViewport.width}px`;
      canvas.style.height = `${baseViewport.height}px`;

      console.log(`页面 ${pageNumber} 渲染尺寸:`, {
        scale,
        devicePixelRatio,
        canvasSize: `${canvasWidth}x${canvasHeight}`,
        displaySize: `${baseViewport.width}x${baseViewport.height}`,
        viewportSize: `${baseViewport.width}x${baseViewport.height}`,
      });

      const context = canvas.getContext("2d");

      // 优化Canvas渲染质量
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // 渲染参数
      const renderContext = {
        canvasContext: context,
        viewport: baseViewport, // 使用基础viewport，让PDF.js处理缩放
        intent: "display", // 明确指定为显示意图
        ...options,
      };

      // 如果是高分辨率，手动缩放context
      if (outputScale.scaled) {
        context.save();
        context.scale(outputScale.sx, outputScale.sy);
      }

      // 执行渲染并登记任务
      const renderTask = page.render(renderContext);
      this._renderTasks[pageNumber] = renderTask;

      try {
        await renderTask.promise;
      } catch (error) {
        // 忽略因取消导致的异常
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
        // 完成或取消后清理登记
        if (this._renderTasks[pageNumber] === renderTask) {
          delete this._renderTasks[pageNumber];
        }
      }

      // 恢复context状态
      if (outputScale.scaled) {
        context.restore();
      }

      return {
        canvas,
        viewport: baseViewport, // 返回基础viewport用于布局计算
        pageNumber,
        outputScale,
      };
    } catch (error) {
      // 如果是正常的“取消渲染”场景，不输出错误日志，交由上层忽略处理
      if (
        error &&
        (error.code === "RENDER_CANCELLED" ||
          /render-cancelled/i.test(String(error.message || "")))
      ) {
        throw error; // 继续抛出，供上层做并发/状态判断
      }
      console.error(`页面 ${pageNumber} 渲染失败:`, error);
      throw error;
    }
  }

  /**
   * 获取页面文本内容
   */
  async getPageTextContent(pageNumber) {
    try {
      const page = await this.pdfServices.getPage(pageNumber);
      const textContent = await page.getTextContent();

      return textContent.items.map(item => item.str).join(" ");
    } catch (error) {
      console.error(`获取页面 ${pageNumber} 文本失败:`, error);
      return "";
    }
  }

  /**
   * 获取页面注释
   */
  async getPageAnnotations(pageNumber) {
    try {
      const page = await this.pdfServices.getPage(pageNumber);
      // 使用 display 意图以获取用于显示的注释（包含链接等）
      return await page.getAnnotations({ intent: "display" });
    } catch (error) {
      console.error(`获取页面 ${pageNumber} 注释失败:`, error);
      return [];
    }
  }

  /**
   * 清理渲染缓存
   */
  clearCache() {
    this.renderCache = {};
    this.cacheKeys = [];
  }

  /**
   * 设置缓存
   */
  setCache(key, value) {
    if (!this.renderCache[key]) {
      this.cacheKeys.push(key);
    }
    this.renderCache[key] = value;
  }

  /**
   * 获取缓存
   */
  getCache(key) {
    return this.renderCache[key];
  }

  /**
   * 检查缓存是否存在
   */
  hasCache(key) {
    return key in this.renderCache;
  }

  /**
   * 删除缓存
   */
  deleteCache(key) {
    if (this.renderCache[key]) {
      delete this.renderCache[key];
      const index = this.cacheKeys.indexOf(key);
      if (index > -1) {
        this.cacheKeys.splice(index, 1);
      }
    }
  }
}

/**
 * 导航服务
 * 处理页面导航相关功能
 */
export class ControlsService {
  constructor(pdfServices) {
    this.pdfServices = pdfServices;
    // 不再维护本地镜像状态，统一以 Vuex 为权威数据源
  }

  /**
   * 跳转到指定页面
   */
  goToPage(pageNumber) {
    const state = this.pdfServices.documentState;
    if (!state.loaded) {
      throw new Error("文档未加载");
    }

    if (pageNumber < 1 || pageNumber > state.totalPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    // 统一走 Vuex，同步页面状态（不直接调用组件实例）
    if (store && typeof store.dispatch === "function") {
      try {
        store.dispatch("pdfReader/viewer/goToPage", pageNumber);
      } catch (e) {
        console.warn("goToPage -> Vuex 同步失败:", e);
      }
    }

    return pageNumber;
  }

  /**
   * 下一页
   */
  nextPage() {
    const state = this.pdfServices.documentState;
    const current = store?.state?.pdfReader?.viewer?.currentPage || 1;
    if (current < state.totalPages) {
      return this.goToPage(current + 1);
    }
    return current;
  }

  /**
   * 上一页
   */
  prevPage() {
    const current = store?.state?.pdfReader?.viewer?.currentPage || 1;
    if (current > 1) {
      return this.goToPage(current - 1);
    }
    return current;
  }

  /**
   * 设置缩放
   */
  setScale(scale) {
    if (scale <= 0 || scale > MAX_SCALE) {
      throw new Error(`缩放比例超出范围: ${scale}`);
    }

    // 同步 Vuex 的数值缩放（不再调用组件实例）
    try {
      if (store && typeof store.dispatch === "function") {
        store.dispatch("pdfReader/viewer/setScale", scale);
      }
    } catch (e) {
      // 忽略：无全局 store 时静默
    }

    return scale;
  }

  /**
   * 放大
   */
  zoomIn() {
    const current = store?.state?.pdfReader?.viewer?.scale || 1.0;
    const newScale = Math.min(current * DEFAULT_SCALE_DELTA, MAX_SCALE);
    return this.setScale(newScale);
  }

  /**
   * 缩小
   */
  zoomOut() {
    const current = store?.state?.pdfReader?.viewer?.scale || 1.0;
    const newScale = Math.max(current / DEFAULT_SCALE_DELTA, MIN_SCALE);
    return this.setScale(newScale);
  }

  /**
   * 获取当前状态
   */
  get state() {
    const totalPages = this.pdfServices.documentState.totalPages;
    const currentPage = store?.state?.pdfReader?.viewer?.currentPage || 1;
    const currentScale = store?.state?.pdfReader?.viewer?.scale || 1.0;
    return {
      currentPage,
      currentScale,
      canGoNext: currentPage < totalPages,
      canGoPrev: currentPage > 1,
    };
  }
}
