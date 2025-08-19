/**
 * PDF 查看器核心逻辑
 * 封装 PDF.js API，提供 Vue 友好的接口
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { 
  EventBus, 
  PDFViewer, 
  PDFLinkService,
  PDFThumbnailViewer,
  PDFOutlineViewer
} from 'pdfjs-dist/web/pdf_viewer';

// 设置 Worker 路径
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

/**
 * 移动端优化的 Canvas 工厂
 */
class MobileCanvasFactory {
  create(width, height) {
    // 移动端 Canvas 尺寸限制
    const maxSize = 1024 * 1024; // 1M像素限制
    if (width * height > maxSize) {
      const scale = Math.sqrt(maxSize / (width * height));
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return {
      canvas,
      context: canvas.getContext('2d')
    };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/**
 * PDF 查看器核心类
 */
export class PdfViewerCore {
  constructor(options = {}) {
    this.container = options.container;
    this.eventBus = new EventBus();
    this.linkService = null;
    this.pdfViewer = null;
    this.pdfDocument = null;
    this.thumbnailViewer = null;
    this.outlineViewer = null;
    
    // 移动端优化配置
    this.mobileConfig = {
      maxCanvasPixels: 0,           // 禁用 Canvas 缩放，使用 CSS 缩放
      maxImageSize: 1024 * 1024,    // 限制图像大小为 1M 像素
      textLayerMode: 1,             // 启用文本层
      enableScripting: false,       // 禁用 PDF JavaScript
      annotationMode: 1,            // 仅启用表单注释
      useOnlyCssZoom: true,         // 仅使用 CSS 缩放
      removePageBorders: true       // 移除页面边框
    };
    
    this._initializeViewer();
  }

  /**
   * 初始化查看器组件
   */
  _initializeViewer() {
    // 创建链接服务
    this.linkService = new PDFLinkService({ 
      eventBus: this.eventBus 
    });

    // 创建主查看器
    this.pdfViewer = new PDFViewer({
      container: this.container,
      eventBus: this.eventBus,
      linkService: this.linkService,
      ...this.mobileConfig
    });

    // 链接服务设置查看器
    this.linkService.setViewer(this.pdfViewer);
  }

  /**
   * 加载 PDF 文档
   */
  async loadDocument(src, options = {}) {
    try {
      const loadingTask = getDocument({
        url: src,
        maxImageSize: this.mobileConfig.maxImageSize,
        isEvalSupported: false,
        ...options
      });

      // 进度监听
      if (options.onProgress) {
        loadingTask.onProgress = options.onProgress;
      }

      this.pdfDocument = await loadingTask.promise;
      
      // 设置文档到查看器
      this.pdfViewer.setDocument(this.pdfDocument);
      this.linkService.setDocument(this.pdfDocument);

      return this.pdfDocument;
    } catch (error) {
      console.error('PDF document loading failed:', error);
      throw error;
    }
  }

  /**
   * 初始化缩略图查看器
   */
  initThumbnailViewer(container) {
    if (!this.thumbnailViewer) {
      this.thumbnailViewer = new PDFThumbnailViewer({
        container,
        eventBus: this.eventBus,
        linkService: this.linkService
      });

      if (this.pdfDocument) {
        this.thumbnailViewer.setDocument(this.pdfDocument);
      }
    }
    return this.thumbnailViewer;
  }

  /**
   * 初始化目录查看器
   */
  initOutlineViewer(container) {
    if (!this.outlineViewer) {
      this.outlineViewer = new PDFOutlineViewer({
        container,
        eventBus: this.eventBus,
        linkService: this.linkService
      });

      if (this.pdfDocument) {
        this.outlineViewer.setDocument(this.pdfDocument);
      }
    }
    return this.outlineViewer;
  }

  /**
   * 获取当前页码
   */
  get currentPageNumber() {
    return this.pdfViewer?.currentPageNumber || 1;
  }

  /**
   * 设置当前页码
   */
  set currentPageNumber(pageNumber) {
    if (this.pdfViewer) {
      this.pdfViewer.currentPageNumber = pageNumber;
    }
  }

  /**
   * 获取当前缩放比例
   */
  get currentScale() {
    return this.pdfViewer?.currentScale || 1.0;
  }

  /**
   * 设置缩放比例
   */
  set currentScale(scale) {
    if (this.pdfViewer) {
      this.pdfViewer.currentScale = Math.max(0.25, Math.min(5.0, scale));
    }
  }

  /**
   * 获取总页数
   */
  get pagesCount() {
    return this.pdfDocument?.numPages || 0;
  }

  /**
   * 获取文档信息
   */
  async getDocumentInfo() {
    if (!this.pdfDocument) return null;

    try {
      const [metadata, outline] = await Promise.all([
        this.pdfDocument.getMetadata(),
        this.pdfDocument.getOutline()
      ]);

      return {
        numPages: this.pdfDocument.numPages,
        info: metadata.info,
        metadata: metadata.metadata,
        outline
      };
    } catch (error) {
      console.error('Failed to get document info:', error);
      return {
        numPages: this.pdfDocument.numPages,
        info: null,
        metadata: null,
        outline: null
      };
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    const tasks = [];

    if (this.pdfDocument) {
      tasks.push(this.pdfDocument.destroy());
    }

    try {
      await Promise.all(tasks);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }

    this.pdfDocument = null;
    this.pdfViewer = null;
    this.linkService = null;
    this.thumbnailViewer = null;
    this.outlineViewer = null;
  }
}

/**
 * 错误处理工具
 */
export const ErrorHandler = {
  handlePdfError(error) {
    switch (error.name) {
      case 'InvalidPDFException':
        return { 
          userMessage: 'PDF 文件格式无效，请检查文件是否损坏', 
          action: 'retry' 
        };
      case 'MissingPDFException':
        return { 
          userMessage: '找不到 PDF 文件，请检查文件路径', 
          action: 'check_url' 
        };
      case 'PasswordException':
        return { 
          userMessage: '该 PDF 文件需要密码才能访问', 
          action: 'request_password' 
        };
      case 'UnexpectedResponseException':
        return { 
          userMessage: '网络请求失败，请检查网络连接', 
          action: 'retry' 
        };
      default:
        return { 
          userMessage: '加载 PDF 文件时出现错误', 
          action: 'report' 
        };
    }
  }
};

export default PdfViewerCore;
