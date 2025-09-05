/**
 * PDF 事件定义和处理
 * 基于 PDF.js EventBus 系统，提供 Vue 友好的事件接口
 */

import store from "@/store/index.js";

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

/**
 * 事件桥接器
 * 将 PDF.js EventBus 事件转换为 Vue 组件事件
 */
export class EventBridge {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.listeners = {};
    this.listenerKeys = []; // 维护键的顺序
  }

  /**
   * 注册事件监听器（精简版）
   * 仅桥接需要同步到 Vuex 的关键事件：pagechanging、scalechanging
   * 不再向组件 $emit，避免多源事件与维护成本。
   */
  register() {
    // 同步页码（PDF.js -> Vuex）
    this.addListener(PDF_EVENTS.PAGE_CHANGING, event => {
      try {
        const current = store.state.pdfReader.viewer.currentPage;
        if (Number.isInteger(event.pageNumber) && event.pageNumber !== current) {
          store.dispatch("pdfReader/viewer/goToPage", event.pageNumber);
        }
      } catch (e) {
        console.warn("EventBridge(pagechanging) 同步失败:", e);
      }
    });

    // 同步缩放（PDF.js -> Vuex）
    this.addListener(PDF_EVENTS.SCALE_CHANGING, event => {
      try {
        const nextScale = typeof event.scale === "number" ? event.scale : Number(event.presetValue);
        const current = store.state.pdfReader.viewer.scale;
        if (typeof nextScale === "number" && !Number.isNaN(nextScale) && nextScale !== current) {
          store.dispatch("pdfReader/viewer/setScale", nextScale);
        }
      } catch (e) {
        console.warn("EventBridge(scalechanging) 同步失败:", e);
      }
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