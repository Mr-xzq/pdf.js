/**
 * PDF 事件定义和处理
 * 基于 PDF.js EventBus 系统，提供 Vue 友好的事件接口
 */

// PDF.js 原生事件常量
export const PDF_EVENTS = {
  // 文档相关事件
  DOCUMENT_LOADED: "documentloaded",
  DOCUMENT_INIT: "documentinit",
  DOCUMENT_ERROR: "documenterror",

  // 页面相关事件
  PAGE_CHANGING: "pagechanging",
  PAGE_CHANGED: "pagechanged",
  PAGE_RENDERED: "pagerendered",
  PAGE_RENDER_ERROR: "pagerendererror",

  // 缩放相关事件
  SCALE_CHANGING: "scalechanging",
  SCALE_CHANGED: "scalechanged",

  // 搜索相关事件
  FIND_RESULT: "updatefindmatchescount",
  FIND_HIGHLIGHT: "updatefindcontrolstate",

  // 链接相关事件
  LINK_CLICKED: "linkclicked",

  // 加载进度事件
  LOAD_PROGRESS: "progress",

  // 密码相关事件
  PASSWORD_REQUIRED: "passwordrequired",
  PASSWORD_INCORRECT: "passwordincorrect",
};

// Vue 组件事件常量
export const VUE_EVENTS = {
  // 文档事件
  DOCUMENT_LOADED: "document-loaded",
  DOCUMENT_ERROR: "document-error",
  LOAD_PROGRESS: "load-progress",

  // 页面事件
  PAGE_CHANGED: "page-changed",
  PAGE_RENDERED: "page-rendered",

  // 缩放事件
  SCALE_CHANGED: "scale-changed",

  // 搜索事件
  SEARCH_RESULT: "search-result",

  // 交互事件
  LINK_CLICKED: "link-clicked",

  // 密码事件
  PASSWORD_REQUIRED: "password-required",
};

/**
 * 事件桥接器
 * 将 PDF.js EventBus 事件转换为 Vue 组件事件
 */
export class EventBridge {
  constructor(eventBus, vueComponent) {
    this.eventBus = eventBus;
    this.vueComponent = vueComponent;
    this.listeners = {};
    this.listenerKeys = []; // 维护键的顺序
  }

  /**
   * 注册事件监听器
   */
  register() {
    // 文档加载完成
    this.addListener(PDF_EVENTS.DOCUMENT_LOADED, event => {
      this.vueComponent.$emit(VUE_EVENTS.DOCUMENT_LOADED, {
        numPages: event.source.pagesCount,
        fingerprint: event.source.fingerprint,
      });
    });

    // 页面变化
    this.addListener(PDF_EVENTS.PAGE_CHANGED, event => {
      this.vueComponent.$emit(VUE_EVENTS.PAGE_CHANGED, {
        pageNumber: event.pageNumber,
        previous: event.previous,
      });
    });

    // 缩放变化
    this.addListener(PDF_EVENTS.SCALE_CHANGED, event => {
      this.vueComponent.$emit(VUE_EVENTS.SCALE_CHANGED, {
        scale: event.scale,
        previous: event.presetValue,
      });
    });

    // 页面渲染完成
    this.addListener(PDF_EVENTS.PAGE_RENDERED, event => {
      this.vueComponent.$emit(VUE_EVENTS.PAGE_RENDERED, {
        pageNumber: event.pageNumber,
        cssTransform: event.cssTransform,
      });
    });

    // 搜索结果
    this.addListener(PDF_EVENTS.FIND_RESULT, event => {
      this.vueComponent.$emit(VUE_EVENTS.SEARCH_RESULT, {
        matchesCount: event.matchesCount,
        current: event.current,
        total: event.total,
      });
    });

    // 链接点击
    this.addListener(PDF_EVENTS.LINK_CLICKED, event => {
      this.vueComponent.$emit(VUE_EVENTS.LINK_CLICKED, {
        url: event.url,
        dest: event.dest,
      });
    });

    console.log("PDF 事件桥接器注册完成");
  }

  /**
   * 添加事件监听器
   */
  addListener(eventName, handler) {
    if (eventName in this.listeners) {
      this.removeListener(eventName);
    }

    this.eventBus.on(eventName, handler);

    // 添加到监听器对象和键数组
    if (!this.listeners[eventName]) {
      this.listenerKeys.push(eventName);
    }
    this.listeners[eventName] = handler;
  }

  /**
   * 移除事件监听器
   */
  removeListener(eventName) {
    const handler = this.listeners[eventName];
    if (handler) {
      this.eventBus.off(eventName, handler);
      delete this.listeners[eventName];

      // 从键数组中移除
      const index = this.listenerKeys.indexOf(eventName);
      if (index > -1) {
        this.listenerKeys.splice(index, 1);
      }
    }
  }

  /**
   * 销毁事件桥接器
   */
  destroy() {
    for (const eventName of this.listenerKeys) {
      this.removeListener(eventName);
    }

    // 清理所有数据
    this.listeners = {};
    this.listenerKeys = [];
    console.log("PDF 事件桥接器已销毁");
  }
}

/**
 * 事件工具函数
 */
export const EventUtils = {
  /**
   * 创建页面变化事件数据
   */
  createPageChangeEvent(pageNumber, previous = null) {
    return {
      pageNumber,
      previous,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建缩放变化事件数据
   */
  createScaleChangeEvent(scale, previous = null) {
    return {
      scale,
      previous,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建文档加载事件数据
   */
  createDocumentLoadedEvent(document) {
    return {
      numPages: document.numPages,
      fingerprint: document.fingerprint,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建错误事件数据
   */
  createErrorEvent(error, context = "") {
    return {
      message: error.message,
      name: error.name,
      context,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建加载进度事件数据
   */
  createProgressEvent(loaded, total) {
    return {
      loaded,
      total,
      percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
      timestamp: Date.now(),
    };
  },
};

/**
 * 事件验证器
 */
export const EventValidator = {
  /**
   * 验证页码
   */
  validatePageNumber(pageNumber, totalPages) {
    return (
      Number.isInteger(pageNumber) &&
      pageNumber >= 1 &&
      pageNumber <= totalPages
    );
  },

  /**
   * 验证缩放比例
   */
  validateScale(scale) {
    return typeof scale === "number" && scale > 0 && scale <= 10;
  },

  /**
   * 验证事件数据
   */
  validateEventData(eventData, requiredFields = []) {
    if (!eventData || typeof eventData !== "object") {
      return false;
    }

    return requiredFields.every(
      field => eventData.hasOwnProperty(field) && eventData[field] !== undefined
    );
  },
};
