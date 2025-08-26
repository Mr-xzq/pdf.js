import { PdfApplication, getPdfApplication } from './pdf-application.js';
import { EventBridge, PDF_EVENTS, VUE_EVENTS } from './pdf-events.js';

/**
 * PDF 服务层封装
 * 提供统一的服务接口，简化组件使用
 */
export class PdfServices {
  constructor(vueComponent, options = {}) {
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

      // 创建事件桥接器
      this.eventBridge = new EventBridge(services.eventBus, this.vueComponent);
      this.eventBridge.register();

      this.initialized = true;
      console.log('PDF 服务层初始化完成');

      return services;
    } catch (error) {
      console.error('PDF 服务层初始化失败:', error);
      throw error;
    }
  }

  /**
   * 预初始化：确保 PDF.js 核心库可用
   */
  async preInitialize() {
    try {
      // 导入并设置 globalThis.pdfjsLib
      const pdfjsLib = await import('pdfjs-dist/webpack.mjs');

      if (typeof globalThis !== 'undefined') {
        globalThis.pdfjsLib = pdfjsLib;
      }

      console.log('PDF.js 核心库预初始化完成');
    } catch (error) {
      console.error('PDF.js 核心库预初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载文档
   */
  async loadDocument(src, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 发送加载开始事件
      this.vueComponent.$emit('load-start', { src });

      // 设置进度回调
      const loadOptions = {
        ...options,
        onProgress: (progressData) => {
          const progressEvent = {
            loaded: progressData.loaded,
            total: progressData.total,
            percentage: progressData.total > 0 ?
              Math.round((progressData.loaded / progressData.total) * 100) : 0
          };

          // 直接调用组件的方法，避免事件循环
          if (this.vueComponent.onLoadProgress) {
            this.vueComponent.onLoadProgress(progressEvent);
          }
        },
        onPassword: (callback, reason) => {
          const passwordEvent = {
            callback,
            reason,
            isIncorrect: reason === 'INCORRECT_PASSWORD'
          };

          // 直接调用组件方法，避免事件循环
          if (this.vueComponent.onPasswordRequired) {
            this.vueComponent.onPasswordRequired(passwordEvent);
          }
        }
      };

      const document = await this.application.loadDocument(src, loadOptions);
      
      // 获取文档信息
      const documentInfo = await this.application.getDocumentInfo();
      
      // 直接调用组件方法，避免事件循环
      const loadedEvent = {
        document,
        ...documentInfo
      };

      if (this.vueComponent.onDocumentLoaded) {
        this.vueComponent.onDocumentLoaded(loadedEvent);
      }

      return document;
    } catch (error) {
      // 直接调用组件方法，避免事件循环
      const errorEvent = {
        error: error.message,
        src
      };

      if (this.vueComponent.onDocumentError) {
        this.vueComponent.onDocumentError(errorEvent);
      }
      throw error;
    }
  }

  /**
   * 获取页面
   */
  async getPage(pageNumber) {
    if (!this.application || !this.application.isDocumentLoaded) {
      throw new Error('文档未加载');
    }

    return await this.application.getPage(pageNumber);
  }

  /**
   * 获取文档大纲
   */
  async getOutline() {
    if (!this.application || !this.application.isDocumentLoaded) {
      throw new Error('文档未加载');
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
    
    console.log('PDF 服务层已销毁');
  }

  /**
   * 获取文档状态
   */
  get documentState() {
    if (!this.application) {
      return {
        loaded: false,
        loading: false,
        totalPages: 0
      };
    }

    return {
      loaded: this.application.isDocumentLoaded,
      loading: this.application.isLoading,
      totalPages: this.application.totalPages
    };
  }
}

/**
 * 页面渲染服务
 * 专门处理页面渲染相关功能
 */
export class PageRenderService {
  constructor(pdfServices) {
    this.pdfServices = pdfServices;
    this.renderCache = new Map();
  }

  /**
   * 渲染页面到 Canvas
   */
  async renderPageToCanvas(pageNumber, canvas, options = {}) {
    try {
      const page = await this.pdfServices.getPage(pageNumber);

      const scale = options.scale || 1.0;

      // 获取设备像素比，提高渲染质量
      const devicePixelRatio = window.devicePixelRatio || 1;
      const outputScale = {
        sx: devicePixelRatio,
        sy: devicePixelRatio,
        scaled: devicePixelRatio !== 1
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
        viewportSize: `${baseViewport.width}x${baseViewport.height}`
      });

      const context = canvas.getContext('2d');

      // 优化Canvas渲染质量
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      // 渲染参数
      const renderContext = {
        canvasContext: context,
        viewport: baseViewport, // 使用基础viewport，让PDF.js处理缩放
        intent: 'display', // 明确指定为显示意图
        ...options
      };

      // 如果是高分辨率，手动缩放context
      if (outputScale.scaled) {
        context.save();
        context.scale(outputScale.sx, outputScale.sy);
      }

      // 执行渲染
      const renderTask = page.render(renderContext);
      await renderTask.promise;

      // 恢复context状态
      if (outputScale.scaled) {
        context.restore();
      }

      return {
        canvas,
        viewport: baseViewport, // 返回基础viewport用于布局计算
        pageNumber,
        outputScale
      };
    } catch (error) {
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
      
      return textContent.items.map(item => item.str).join(' ');
    } catch (error) {
      console.error(`获取页面 ${pageNumber} 文本失败:`, error);
      return '';
    }
  }

  /**
   * 获取页面注释
   */
  async getPageAnnotations(pageNumber) {
    try {
      const page = await this.pdfServices.getPage(pageNumber);
      return await page.getAnnotations();
    } catch (error) {
      console.error(`获取页面 ${pageNumber} 注释失败:`, error);
      return [];
    }
  }

  /**
   * 清理渲染缓存
   */
  clearCache() {
    this.renderCache.clear();
  }
}

/**
 * 导航服务
 * 处理页面导航相关功能
 */
export class NavigationService {
  constructor(pdfServices) {
    this.pdfServices = pdfServices;
    this.currentPage = 1;
    this.currentScale = 1.0;
  }

  /**
   * 跳转到指定页面
   */
  goToPage(pageNumber) {
    const state = this.pdfServices.documentState;
    if (!state.loaded) {
      throw new Error('文档未加载');
    }

    if (pageNumber < 1 || pageNumber > state.totalPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    const previous = this.currentPage;
    this.currentPage = pageNumber;

    // 直接调用组件方法，避免事件循环
    const pageChangedEvent = {
      pageNumber,
      previous
    };

    if (this.pdfServices.vueComponent.onPageChanged) {
      this.pdfServices.vueComponent.onPageChanged(pageChangedEvent);
    }

    return pageNumber;
  }

  /**
   * 下一页
   */
  nextPage() {
    const state = this.pdfServices.documentState;
    if (this.currentPage < state.totalPages) {
      return this.goToPage(this.currentPage + 1);
    }
    return this.currentPage;
  }

  /**
   * 上一页
   */
  prevPage() {
    if (this.currentPage > 1) {
      return this.goToPage(this.currentPage - 1);
    }
    return this.currentPage;
  }

  /**
   * 设置缩放
   */
  setScale(scale) {
    if (scale <= 0 || scale > 10) {
      throw new Error(`缩放比例超出范围: ${scale}`);
    }

    const previous = this.currentScale;
    this.currentScale = scale;

    // 直接调用组件方法，避免事件循环
    const scaleChangedEvent = {
      scale,
      previous
    };

    if (this.pdfServices.vueComponent.onScaleChanged) {
      this.pdfServices.vueComponent.onScaleChanged(scaleChangedEvent);
    }

    return scale;
  }

  /**
   * 放大
   */
  zoomIn(step = 0.25) {
    const newScale = Math.min(this.currentScale + step, 10);
    return this.setScale(newScale);
  }

  /**
   * 缩小
   */
  zoomOut(step = 0.25) {
    const newScale = Math.max(this.currentScale - step, 0.1);
    return this.setScale(newScale);
  }

  /**
   * 获取当前状态
   */
  get state() {
    return {
      currentPage: this.currentPage,
      currentScale: this.currentScale,
      canGoNext: this.currentPage < this.pdfServices.documentState.totalPages,
      canGoPrev: this.currentPage > 1
    };
  }
}
