import { PDF_CONFIG, MOBILE_CONFIG } from "./pdf-config.js";

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
    this.options = {
      isMobile: true,
      ...options,
    };

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
      // 首先导入核心 PDF.js 库，确保 globalThis.pdfjsLib 可用
      const pdfjsLib = await import("pdfjs-dist/webpack.mjs");

      // 确保 globalThis.pdfjsLib 存在
      if (typeof globalThis !== "undefined") {
        globalThis.pdfjsLib = pdfjsLib;
      }

      // 然后导入 PDF.js 查看器组件, pdf_viewer.mjs 内部依赖 globalThis.pdfjsLib
      const pdfjsViewer = await import(
        "pdfjs-dist/legacy/web/pdf_viewer.mjs"
      );

      // 创建事件总线
      this.eventBus = new pdfjsViewer.EventBus();

      // 创建链接服务
      this.linkService = new pdfjsViewer.PDFLinkService({
        eventBus: this.eventBus,
        externalLinkTarget: 2, // 新窗口打开外部链接
        externalLinkRel: "noopener noreferrer nofollow",
      });

      // 创建搜索控制器
      this.findController = new pdfjsViewer.PDFFindController({
        eventBus: this.eventBus,
        linkService: this.linkService,
      });

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
   * 加载 PDF 文档
   */
  async loadDocument(src, options = {}) {
    if (this.loading) {
      throw new Error("文档正在加载中，请稍候");
    }

    try {
      this.loading = true;

      // 使用已经导入的 PDF.js 核心库
      let pdfjsLib;
      if (typeof globalThis !== "undefined" && globalThis.pdfjsLib) {
        pdfjsLib = globalThis.pdfjsLib;
      } else {
        // 如果没有初始化，先导入
        pdfjsLib = await import("pdfjs-dist/webpack.mjs");
      }

      // 合并配置
      const config = this.options.isMobile ? MOBILE_CONFIG : PDF_CONFIG;
      const loadingTask = pdfjsLib.getDocument({
        url: src,
        ...config,
        ...options,
      });

      // 监听加载进度
      if (options.onProgress) {
        loadingTask.onProgress = options.onProgress;
      }

      this.pdfDocument = await loadingTask.promise;

      // 设置链接服务的文档
      if (this.linkService) {
        this.linkService.setDocument(this.pdfDocument);
      }

      this.loading = false;
      console.log(`PDF 文档加载成功，共 ${this.pdfDocument.numPages} 页`);

      return this.pdfDocument;
    } catch (error) {
      this.loading = false;
      console.error("PDF 文档加载失败:", error);
      throw error;
    }
  }

  /**
   * 获取文档信息
   */
  async getDocumentInfo() {
    if (!this.pdfDocument) {
      throw new Error("文档未加载");
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
