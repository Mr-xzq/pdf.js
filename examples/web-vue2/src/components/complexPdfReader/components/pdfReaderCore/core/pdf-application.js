import { initializePdfJs, getPdfjsViewer } from "./pdf-config.js";

/**
 * PDF 应用控制器
 * 基于 PDF.js 官方组件系统设计，封装核心功能
 */
export class PdfApplication {
  constructor(options = {}) {
    this.pdfDocument = null;
    this.eventBus = null;
    this.linkService = null;
    this.findController = null;
    this.options = { ...options };

    // 缓存从 headless 加载得到的文档信息，避免重复读取 metadata
    this.lastInfo = null;
    this.lastMetadata = null;

    // 初始化状态
    this.initialized = false;
    this.loading = false;
  }

  /**
   * 初始化 PDF.js 组件系统
   */
  async initialize() {
    if (this.initialized) {
      return this.getServices();
    }

    try {
      // 初始化 PDF.js 核心库（幂等）
      await initializePdfJs();

      // 使用官方 viewer 组件，统一事件与链接服务
      const viewer = getPdfjsViewer();
      this.eventBus = new viewer.EventBus();
      this.linkService = new viewer.PDFLinkService({ eventBus: this.eventBus });
      this.findController = null; // MVP 未用到，保留占位

      this.initialized = true;
      console.log("PDF.js 应用控制器初始化完成");

      return this.getServices();
    } catch (error) {
      console.error("PDF.js 应用控制器初始化失败:", error);
      throw error;
    }
  }

  /**
   * 获取服务实例
   */
  getServices() {
    return {
      eventBus: this.eventBus,
      linkService: this.linkService,
      findController: this.findController,
    };
  }

  /**
   * 获取文档信息
   */
  async getDocumentInfo() {
    if (!this.pdfDocument) {
      throw new Error("文档未加载");
    }

    // 优先返回缓存信息
    if (this.lastInfo || this.lastMetadata) {
      return {
        numPages: this.pdfDocument.numPages,
        fingerprint: this.pdfDocument.fingerprint,
        info: this.lastInfo,
        metadata: this.lastMetadata,
      };
    }

    try {
      const metadataResult = await this.pdfDocument.getMetadata();
      return {
        numPages: this.pdfDocument.numPages,
        fingerprint: this.pdfDocument.fingerprint,
        info: metadataResult.info,
        metadata: metadataResult.metadata,
      };
    } catch (error) {
      console.error("获取文档信息失败:", error);
      return {
        numPages: this.pdfDocument.numPages,
        fingerprint: this.pdfDocument.fingerprint,
        info: null,
        metadata: null,
      };
    }
  }

  /**
   * 获取页面对象
   */
  async getPage(pageNumber) {
    if (!this.pdfDocument) {
      throw new Error("文档未加载");
    }

    if (pageNumber < 1 || pageNumber > this.pdfDocument.numPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    return await this.pdfDocument.getPage(pageNumber);
  }

  /**
   * 获取文档大纲
   */
  async getOutline() {
    if (!this.pdfDocument) {
      throw new Error("文档未加载");
    }

    try {
      return await this.pdfDocument.getOutline();
    } catch (error) {
      console.error("获取文档大纲失败:", error);
      return null;
    }
  }

  /**
   * 销毁应用
   */
  destroy() {
    if (this.pdfDocument) {
      this.pdfDocument.destroy();
      this.pdfDocument = null;
    }

    if (this.findController) {
      this.findController = null;
    }

    if (this.linkService) {
      this.linkService = null;
    }

    if (this.eventBus) {
      this.eventBus = null;
    }

    this.initialized = false;
    this.loading = false;

    console.log("PDF 应用控制器已销毁");
  }

  /**
   * 外部接管：附加已加载的文档
   * 供上层（如 Vuex action 完成真实加载后）注入 pdfDocument
   *
   * @param {Object} pdfDocument - 必填，PDF.js 的 PDFDocumentProxy
   * @param {Object} [options] - 可选，元信息缓存
   * @param {Object} [options.info] - 文档 info（从 pdfDocument.getMetadata() 获取的 info）
   * @param {Object} [options.metadata] - 文档 metadata（从 pdfDocument.getMetadata() 获取的 metadata）
   */
  attachDocument(pdfDocument, options = {}) {
    if (!pdfDocument) {
      throw new Error("attachDocument 需要有效的 pdfDocument");
    }
    this.pdfDocument = pdfDocument;

    // 缓存外部提供的元信息，避免后续重复读取
    const { info = null, metadata = null } = options || {};
    this.lastInfo = info;
    this.lastMetadata = metadata;

    if (this.linkService) {
      this.linkService.setDocument(this.pdfDocument);
    }
    console.log(`PDF 文档已附加，共 ${this.pdfDocument.numPages} 页`);
  }

  /**
   * 检查是否已加载文档
   */
  get isDocumentLoaded() {
    return !!this.pdfDocument;
  }

  /**
   * 获取总页数
   */
  get totalPages() {
    return this.pdfDocument ? this.pdfDocument.numPages : 0;
  }

  /**
   * 检查是否正在加载
   */
  get isLoading() {
    return this.loading;
  }
}

// 创建单例实例
let applicationInstance = null;

/**
 * 获取应用实例（单例模式）
 */
export function getPdfApplication(options = {}) {
  if (!applicationInstance) {
    applicationInstance = new PdfApplication(options);
  }
  return applicationInstance;
}

/**
 * 重置应用实例
 */
export function resetPdfApplication() {
  if (applicationInstance) {
    applicationInstance.destroy();
    applicationInstance = null;
  }
}
