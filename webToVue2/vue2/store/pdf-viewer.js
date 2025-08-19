/**
 * PDF 查看器 Vuex 状态管理模块
 * 基于 PDF.js 事件系统的状态管理
 */

import { createNamespacedHelpers } from 'vuex';

// 状态模块
const state = {
  // 文档状态
  pdfDocument: null,
  isDocumentLoaded: false,
  loading: false,
  loadProgress: { loaded: 0, total: 0 },
  
  // 页面状态
  currentPage: 1,
  totalPages: 0,
  
  // 缩放状态
  scale: 1.0,
  minScale: 0.25,
  maxScale: 5.0,
  
  // UI 状态
  showSidebar: false,
  sidebarMode: 'thumbs', // 'thumbs' | 'outline'
  showToolbar: true,
  
  // 文档信息
  documentInfo: {
    title: '',
    author: '',
    subject: '',
    creator: '',
    producer: '',
    creationDate: null,
    modificationDate: null
  },
  
  // 目录
  outline: null,
  
  // 错误状态
  error: null,
  passwordRequired: false
};

// 计算属性
const getters = {
  // 是否已加载文档
  isDocumentLoaded: (state) => state.isDocumentLoaded && !!state.pdfDocument,
  
  // 是否正在加载
  isLoading: (state) => state.loading,
  
  // 是否可以前进
  canGoNext: (state) => state.currentPage < state.totalPages,
  
  // 是否可以后退
  canGoPrev: (state) => state.currentPage > 1,
  
  // 缩放百分比
  scalePercent: (state) => Math.round(state.scale * 100),
  
  // 是否可以放大
  canZoomIn: (state) => state.scale < state.maxScale,
  
  // 是否可以缩小
  canZoomOut: (state) => state.scale > state.minScale,
  
  // 加载进度百分比
  loadProgressPercent: (state) => {
    if (state.loadProgress.total === 0) return 0;
    return Math.round((state.loadProgress.loaded / state.loadProgress.total) * 100);
  },
  
  // 侧边栏是否显示
  isSidebarVisible: (state) => state.showSidebar,
  
  // 是否显示缩略图
  isThumbsVisible: (state) => state.showSidebar && state.sidebarMode === 'thumbs',
  
  // 是否显示目录
  isOutlineVisible: (state) => state.showSidebar && state.sidebarMode === 'outline',
  
  // 是否有目录
  hasOutline: (state) => state.outline && state.outline.length > 0,
  
  // 当前页面信息
  currentPageInfo: (state) => ({
    current: state.currentPage,
    total: state.totalPages,
    percent: state.totalPages > 0 ? Math.round((state.currentPage / state.totalPages) * 100) : 0
  })
};

// 同步状态变更
const mutations = {
  // 设置加载状态
  SET_LOADING(state, loading) {
    state.loading = loading;
    if (!loading) {
      state.loadProgress = { loaded: 0, total: 0 };
    }
  },
  
  // 设置加载进度
  SET_LOAD_PROGRESS(state, progress) {
    state.loadProgress = {
      loaded: progress.loaded || 0,
      total: progress.total || 0
    };
  },
  
  // 设置 PDF 文档
  SET_PDF_DOCUMENT(state, document) {
    state.pdfDocument = document;
    state.isDocumentLoaded = !!document;
    state.totalPages = document?.numPages || 0;
    state.error = null;
    
    // 重置页面状态
    if (!document) {
      state.currentPage = 1;
      state.totalPages = 0;
      state.outline = null;
      state.documentInfo = {
        title: '',
        author: '',
        subject: '',
        creator: '',
        producer: '',
        creationDate: null,
        modificationDate: null
      };
    }
  },
  
  // 设置当前页码
  SET_CURRENT_PAGE(state, page) {
    if (page >= 1 && page <= state.totalPages) {
      state.currentPage = page;
    }
  },
  
  // 设置缩放比例
  SET_SCALE(state, scale) {
    const newScale = Math.max(state.minScale, Math.min(state.maxScale, scale));
    state.scale = newScale;
  },
  
  // 设置缩放范围
  SET_SCALE_RANGE(state, { min, max }) {
    if (min !== undefined) state.minScale = min;
    if (max !== undefined) state.maxScale = max;
  },
  
  // 切换侧边栏
  TOGGLE_SIDEBAR(state, mode) {
    if (state.sidebarMode === mode && state.showSidebar) {
      state.showSidebar = false;
    } else {
      state.showSidebar = true;
      state.sidebarMode = mode;
    }
  },
  
  // 设置侧边栏显示状态
  SET_SIDEBAR_VISIBLE(state, visible) {
    state.showSidebar = visible;
  },
  
  // 设置侧边栏模式
  SET_SIDEBAR_MODE(state, mode) {
    state.sidebarMode = mode;
  },
  
  // 设置工具栏显示状态
  SET_TOOLBAR_VISIBLE(state, visible) {
    state.showToolbar = visible;
  },
  
  // 设置文档信息
  SET_DOCUMENT_INFO(state, info) {
    state.documentInfo = {
      title: info.title || '',
      author: info.author || '',
      subject: info.subject || '',
      creator: info.creator || '',
      producer: info.producer || '',
      creationDate: info.creationDate || null,
      modificationDate: info.modificationDate || null,
      ...info
    };
  },
  
  // 设置目录
  SET_OUTLINE(state, outline) {
    state.outline = outline;
  },
  
  // 设置错误状态
  SET_ERROR(state, error) {
    state.error = error;
    state.loading = false;
  },
  
  // 清除错误
  CLEAR_ERROR(state) {
    state.error = null;
  },
  
  // 设置密码需求状态
  SET_PASSWORD_REQUIRED(state, required) {
    state.passwordRequired = required;
  },
  
  // 重置状态
  RESET_STATE(state) {
    // 保留配置相关的状态
    const { showToolbar, minScale, maxScale } = state;
    
    // 重置其他状态
    Object.assign(state, {
      pdfDocument: null,
      isDocumentLoaded: false,
      loading: false,
      loadProgress: { loaded: 0, total: 0 },
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      showSidebar: false,
      sidebarMode: 'thumbs',
      documentInfo: {
        title: '',
        author: '',
        subject: '',
        creator: '',
        producer: '',
        creationDate: null,
        modificationDate: null
      },
      outline: null,
      error: null,
      passwordRequired: false,
      // 保留的配置
      showToolbar,
      minScale,
      maxScale
    });
  }
};

// 异步操作和复杂逻辑
const actions = {
  // 加载文档
  async loadDocument({ commit }, { src, options = {} }) {
    commit('SET_LOADING', true);
    commit('CLEAR_ERROR');
    
    try {
      // 这里需要传入 PdfViewerCore 实例
      const { pdfViewerCore } = options;
      if (!pdfViewerCore) {
        throw new Error('pdfViewerCore is required');
      }
      
      // 设置进度监听
      const loadOptions = {
        ...options,
        onProgress: (progress) => {
          commit('SET_LOAD_PROGRESS', progress);
        }
      };
      
      const document = await pdfViewerCore.loadDocument(src, loadOptions);
      commit('SET_PDF_DOCUMENT', document);
      
      // 获取文档信息
      const info = await pdfViewerCore.getDocumentInfo();
      if (info) {
        commit('SET_DOCUMENT_INFO', info.info || {});
        commit('SET_OUTLINE', info.outline);
      }
      
      commit('SET_LOADING', false);
      return document;
    } catch (error) {
      commit('SET_ERROR', error);
      
      // 检查是否需要密码
      if (error.name === 'PasswordException') {
        commit('SET_PASSWORD_REQUIRED', true);
      }
      
      throw error;
    }
  },
  
  // 跳转到指定页面
  goToPage({ commit, state }, pageNumber) {
    if (pageNumber >= 1 && pageNumber <= state.totalPages) {
      commit('SET_CURRENT_PAGE', pageNumber);
      return true;
    }
    return false;
  },
  
  // 下一页
  nextPage({ dispatch, getters }) {
    if (getters.canGoNext) {
      return dispatch('goToPage', getters.currentPageInfo.current + 1);
    }
    return false;
  },
  
  // 上一页
  prevPage({ dispatch, getters }) {
    if (getters.canGoPrev) {
      return dispatch('goToPage', getters.currentPageInfo.current - 1);
    }
    return false;
  },
  
  // 设置缩放
  setScale({ commit }, scale) {
    commit('SET_SCALE', scale);
  },
  
  // 放大
  zoomIn({ commit, state }) {
    const newScale = state.scale * 1.2;
    commit('SET_SCALE', newScale);
  },
  
  // 缩小
  zoomOut({ commit, state }) {
    const newScale = state.scale / 1.2;
    commit('SET_SCALE', newScale);
  },
  
  // 重置缩放
  resetScale({ commit }) {
    commit('SET_SCALE', 1.0);
  },
  
  // 适应页面宽度
  fitToWidth({ commit }) {
    // 这个需要根据容器宽度计算，暂时设置为 1.0
    commit('SET_SCALE', 1.0);
  },
  
  // 切换侧边栏
  toggleSidebar({ commit }, mode = 'thumbs') {
    commit('TOGGLE_SIDEBAR', mode);
  },
  
  // 显示缩略图
  showThumbnails({ commit, state }) {
    if (state.sidebarMode === 'thumbs' && state.showSidebar) {
      commit('SET_SIDEBAR_VISIBLE', false);
    } else {
      commit('SET_SIDEBAR_MODE', 'thumbs');
      commit('SET_SIDEBAR_VISIBLE', true);
    }
  },
  
  // 显示目录
  showOutline({ commit, state, getters }) {
    if (!getters.hasOutline) return false;
    
    if (state.sidebarMode === 'outline' && state.showSidebar) {
      commit('SET_SIDEBAR_VISIBLE', false);
    } else {
      commit('SET_SIDEBAR_MODE', 'outline');
      commit('SET_SIDEBAR_VISIBLE', true);
    }
    return true;
  },
  
  // 隐藏侧边栏
  hideSidebar({ commit }) {
    commit('SET_SIDEBAR_VISIBLE', false);
  },
  
  // 切换工具栏
  toggleToolbar({ commit, state }) {
    commit('SET_TOOLBAR_VISIBLE', !state.showToolbar);
  },
  
  // 清理资源
  async cleanup({ commit }) {
    commit('RESET_STATE');
  },
  
  // 清除错误
  clearError({ commit }) {
    commit('CLEAR_ERROR');
    commit('SET_PASSWORD_REQUIRED', false);
  }
};

// Vuex 模块定义
const pdfViewerModule = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};

// 导出命名空间辅助函数
export const pdfViewerHelpers = createNamespacedHelpers('pdfViewer');

export default pdfViewerModule;
