/**
 * PDF 查看器核心逻辑
 * 封装 PDF.js API，提供 Vue 友好的接口
 */

import * as pdfjsLib from 'pdfjs-dist/webpack.mjs'; // 零配置导入
import { 
  EventBus, 
  PDFLinkService
} from 'pdfjs-dist/web/pdf_viewer';

/**
 * 简化的页面查看器 - 替换复杂的 PDFViewer
 * 专注 MVP 功能，避免依赖庞大的 web 模块
 */
class SimplePDFPageViewer {
  constructor(options = {}) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.linkService = options.linkService;
    
    // 移动端优化配置
    this.maxCanvasPixels = options.maxCanvasPixels || 0;
    this.textLayerMode = options.textLayerMode || 1;
    
    // 状态管理
    this.pdfDocument = null;
    this._currentPageNumber = 1;
    this._currentScale = 1.0;  // 使用私有属性避免触发 setter
    this.pages = [];
    
    this._initializeContainer();
  }
  
  _initializeContainer() {
    if (!this.container) return;

    // 移除可能影响布局的样式设置，让 CSS 控制布局
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
  }
  
  async setDocument(pdfDocument) {
    this.pdfDocument = pdfDocument;
    this._resetPages();
    await this._renderAllPages();

    this.eventBus.dispatch('documentloaded', {
      source: this,
      numPages: pdfDocument.numPages
    });

    // 触发页面初始化事件
    this.eventBus.dispatch('pagesinit', {
      source: this
    });
  }
  
  _resetPages() {
    // 清理现有页面
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.pages = [];
  }
  
  async _renderAllPages() {
    if (!this.pdfDocument) return;

    const numPages = this.pdfDocument.numPages;
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pageContainer = this._createPageContainer(pageNum);
      this.container.appendChild(pageContainer);
      this.pages.push({
        pageNum,
        container: pageContainer,
        rendered: false
      });
    }

    // 渲染前几页和当前页面
    const initialRenderPages = Math.min(3, numPages); // 初始渲染前3页
    for (let pageNum = 1; pageNum <= initialRenderPages; pageNum++) {
      await this._renderPage(pageNum);
    }

    // 异步渲染剩余页面
    this._renderRemainingPages(initialRenderPages + 1, numPages);
  }

  async _renderRemainingPages(startPage, endPage) {
    // 使用 requestIdleCallback 或 setTimeout 来避免阻塞 UI
    const renderNextPage = async (pageNum) => {
      if (pageNum <= endPage) {
        await this._renderPage(pageNum);
        // 使用 setTimeout 来让出控制权
        setTimeout(() => renderNextPage(pageNum + 1), 10);
      }
    };

    if (startPage <= endPage) {
      setTimeout(() => renderNextPage(startPage), 100);
    }
  }
  
  _createPageContainer(pageNum) {
    const container = document.createElement('div');
    container.className = 'page';
    container.dataset.pageNumber = pageNum;
    container.style.margin = '16px auto';
    container.style.background = '#fff';
    container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    container.style.position = 'relative';
    container.style.minHeight = '600px'; // 设置最小高度
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';

    // 添加加载占位符
    const placeholder = document.createElement('div');
    placeholder.className = 'page-placeholder';
    placeholder.style.color = '#999';
    placeholder.style.fontSize = '14px';
    placeholder.textContent = `第 ${pageNum} 页加载中...`;
    container.appendChild(placeholder);

    return container;
  }
  
  async _renderPage(pageNum) {
    if (!this.pages || !Array.isArray(this.pages)) {
      return; // 如果 pages 还没初始化，直接返回
    }

    const pageInfo = this.pages.find(p => p.pageNum === pageNum);
    if (!pageInfo || pageInfo.rendered) return;
    
    try {
      const page = await this.pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.currentScale });

      // 移除占位符
      const placeholder = pageInfo.container.querySelector('.page-placeholder');
      if (placeholder) {
        placeholder.remove();
      }

      // 重置容器样式
      pageInfo.container.style.minHeight = 'auto';
      pageInfo.container.style.display = 'block';
      pageInfo.container.style.alignItems = 'initial';
      pageInfo.container.style.justifyContent = 'initial';

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';

      pageInfo.container.appendChild(canvas);
      
      // 渲染页面
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // 渲染文本层（可选）
      if (this.textLayerMode > 0) {
        await this._renderTextLayer(page, pageInfo.container);
      }
      
      pageInfo.rendered = true;
      
      this.eventBus.dispatch('pagerendered', {
        source: this,
        pageNumber: pageNum
      });
      
    } catch (error) {
      console.error(`Failed to render page ${pageNum}:`, error);
    }
  }
  
  async _renderTextLayer(page, container) {
    try {
      const textContent = await page.getTextContent();
      
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.left = '0';
      textLayerDiv.style.top = '0';
      textLayerDiv.style.right = '0';
      textLayerDiv.style.bottom = '0';
      textLayerDiv.style.overflow = 'hidden';
      textLayerDiv.style.opacity = '0.2';
      textLayerDiv.style.lineHeight = '1.0';
      
      container.appendChild(textLayerDiv);
      
      // 简化的文本层渲染
      textContent.items.forEach((textItem) => {
        const textSpan = document.createElement('span');
        textSpan.textContent = textItem.str;
        textSpan.style.position = 'absolute';
        textSpan.style.color = 'transparent';
        textSpan.style.cursor = 'text';
        textSpan.style.transformOrigin = '0% 0%';
        
        // 简化的位置计算
        textSpan.style.left = textItem.transform[4] + 'px';
        textSpan.style.top = textItem.transform[5] + 'px';
        
        textLayerDiv.appendChild(textSpan);
      });
      
    } catch (error) {
      console.error('Failed to render text layer:', error);
    }
  }
  
  // 页面导航
  set currentPageNumber(pageNum) {
    if (pageNum < 1 || pageNum > this.pdfDocument?.numPages) return;

    const oldPageNum = this._currentPageNumber;
    this._currentPageNumber = pageNum;

    // 滚动到指定页面
    this._scrollToPage(pageNum);

    // 渲染页面（如果还未渲染）
    this._renderPage(pageNum);

    this.eventBus.dispatch('pagechanging', {
      source: this,
      pageNumber: pageNum,
      previous: oldPageNum
    });
  }
  
  get currentPageNumber() {
    return this._currentPageNumber || 1;
  }
  
  set _currentPageNumber(value) {
    this.__currentPageNumber = value;
  }
  
  get _currentPageNumber() {
    return this.__currentPageNumber || 1;
  }
  
  // 缩放控制
  set currentScale(scale) {
    const newScale = Math.max(0.25, Math.min(5.0, scale));
    this._currentScale = newScale;
    
    // 重新渲染所有已渲染的页面
    this._reRenderPages();
    
    this.eventBus.dispatch('scalechanging', {
      source: this,
      scale: newScale,
      presetValue: newScale
    });
  }
  
  get currentScale() {
    return this._currentScale || 1.0;
  }
  
  _scrollToPage(pageNum) {
    if (!this.pages || !Array.isArray(this.pages)) {
      return; // 如果 pages 还没初始化，直接返回
    }

    const pageInfo = this.pages.find(p => p.pageNum === pageNum);
    if (pageInfo && pageInfo.container) {
      pageInfo.container.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
  
  async _reRenderPages() {
    // 标记所有页面为未渲染，重新渲染
    if (!this.pages || !Array.isArray(this.pages)) {
      return; // 如果 pages 还没初始化，直接返回
    }

    this.pages.forEach(page => {
      page.rendered = false;
      page.container.innerHTML = '';
    });
    
    // 重新渲染当前页面
    await this._renderPage(this.currentPageNumber);
  }
  
  cleanup() {
    this.pages = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
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
    
    // 基础配置 - 移动端优化配置移至后期扩展
    this.config = {
      maxCanvasPixels: 0,           // 使用 CSS 缩放
      textLayerMode: 1,             // 启用文本层
      enableScripting: false,       // 禁用 PDF JavaScript
      annotationMode: 1             // 仅启用表单注释
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

    // 创建简化的页面查看器（替换复杂的 PDFViewer）
    this.pdfViewer = new SimplePDFPageViewer({
      container: this.container,
      eventBus: this.eventBus,
      linkService: this.linkService,
      maxCanvasPixels: this.config.maxCanvasPixels,
      textLayerMode: this.config.textLayerMode
    });

    // 链接服务设置查看器
    this.linkService.setViewer(this.pdfViewer);
  }

  /**
   * 加载 PDF 文档
   */
  async loadDocument(src, options = {}) {
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: src,
        isEvalSupported: false,
        verbosity: pdfjsLib.VerbosityLevel.ERRORS,
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
   * 获取缩略图数据 - 供 Vue 组件使用
   */
  async getThumbnailData(pageNumber, options = {}) {
    if (!this.pdfDocument) return null;
    
    try {
      const page = await this.pdfDocument.getPage(pageNumber);
      const scale = options.scale || 0.3;
      const viewport = page.getViewport({ scale });
      
      // 创建 Canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // 渲染页面到 Canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      return {
        canvas,
        width: viewport.width,
        height: viewport.height,
        pageNumber
      };
    } catch (error) {
      console.error(`Failed to generate thumbnail for page ${pageNumber}:`, error);
      return null;
    }
  }

  /**
   * 获取文档目录数据 - 供 Vue 组件使用
   */
  async getOutlineData() {
    if (!this.pdfDocument) return null;
    
    try {
      const outline = await this.pdfDocument.getOutline();
      
      if (!outline || outline.length === 0) {
        return null;
      }
      
      // 递归处理目录项，添加页码信息
      const processOutlineItems = async (items) => {
        const processedItems = [];
        
        for (const item of items) {
          const processedItem = {
            title: item.title,
            bold: item.bold,
            italic: item.italic,
            color: item.color,
            dest: item.dest,
            url: item.url,
            page: null,
            items: []
          };
          
          // 获取目标页码
          if (item.dest) {
            try {
              const pageRef = await this.pdfDocument.getPageIndex(item.dest[0]);
              processedItem.page = pageRef + 1; // PDF.js 页码从 0 开始，UI 从 1 开始
            } catch (error) {
              console.warn('Failed to get page for outline item:', error);
            }
          }
          
          // 递归处理子项
          if (item.items && item.items.length > 0) {
            processedItem.items = await processOutlineItems(item.items);
          }
          
          processedItems.push(processedItem);
        }
        
        return processedItems;
      };
      
      return await processOutlineItems(outline);
    } catch (error) {
      console.error('Failed to get outline:', error);
      return null;
    }
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