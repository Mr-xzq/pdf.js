/**
 * PDF 查看器状态管理模块
 * 管理查看器的显示状态、导航、缩放等
 */

const state = {
  // 当前页面
  currentPage: 1,

  // 缩放相关
  scale: 1.0,
  scaleMode: 'auto', // 'auto', 'page-width', 'page-fit', 'custom'
  minScale: 0.1,
  maxScale: 10.0,

  // 旋转角度
  rotation: 0, // 0, 90, 180, 270

  // 渲染状态
  rendering: false,
  renderingPages: [],

  // 页面尺寸信息
  pageInfo: {
    width: 0,
    height: 0,
    aspectRatio: 1
  },

  // 滚动位置
  scrollPosition: {
    x: 0,
    y: 0
  },

  // 基础配置（MVP版本）
  config: {
    textLayerMode: 1, // 0=禁用, 1=启用
    maxCanvasPixels: 0 // 0=CSS缩放
  },

  // 缩略图相关（从navigation模块合并）
  thumbnails: {},
  thumbnailSize: 120,
  thumbnailScale: 0.5,
  loadingThumbnails: [],

  // 导航历史（从navigation模块合并）
  navigationHistory: [],
  historyIndex: -1,
  maxHistorySize: 20 // 减少历史记录大小
};

const mutations = {
  // 设置当前页面
  SET_CURRENT_PAGE(state, pageNumber) {
    if (pageNumber >= 1) {
      state.currentPage = pageNumber;
    }
  },
  
  // 设置缩放
  SET_SCALE(state, scale) {
    if (scale >= state.minScale && scale <= state.maxScale) {
      state.scale = scale;
      state.scaleMode = 'custom';
    }
  },
  
  // 设置缩放模式
  SET_SCALE_MODE(state, mode) {
    state.scaleMode = mode;
  },
  

  
  // 设置旋转角度
  SET_ROTATION(state, rotation) {
    state.rotation = rotation % 360;
  },
  
  // 设置渲染状态
  SET_RENDERING(state, rendering) {
    state.rendering = rendering;
  },
  
  // 添加正在渲染的页面
  ADD_RENDERING_PAGE(state, pageNumber) {
    if (!state.renderingPages.includes(pageNumber)) {
      state.renderingPages.push(pageNumber);
    }
  },

  // 移除正在渲染的页面
  REMOVE_RENDERING_PAGE(state, pageNumber) {
    const index = state.renderingPages.indexOf(pageNumber);
    if (index > -1) {
      state.renderingPages.splice(index, 1);
    }
  },

  // 清除所有渲染状态
  CLEAR_RENDERING_PAGES(state) {
    state.renderingPages = [];
  },
  
  // 设置页面信息
  SET_PAGE_INFO(state, info) {
    state.pageInfo = {
      ...state.pageInfo,
      ...info
    };
  },
  
  // 设置滚动位置
  SET_SCROLL_POSITION(state, { x, y }) {
    state.scrollPosition = { x, y };
  },
  
  // 更新配置
  UPDATE_CONFIG(state, config) {
    state.config = {
      ...state.config,
      ...config
    };
  },

  // 缩略图相关mutations（从navigation模块合并）
  SET_THUMBNAIL(state, { pageNumber, thumbnail }) {
    state.thumbnails = {
      ...state.thumbnails,
      [pageNumber]: thumbnail
    };
  },

  ADD_LOADING_THUMBNAIL(state, pageNumber) {
    if (!state.loadingThumbnails.includes(pageNumber)) {
      state.loadingThumbnails.push(pageNumber);
    }
  },

  REMOVE_LOADING_THUMBNAIL(state, pageNumber) {
    const index = state.loadingThumbnails.indexOf(pageNumber);
    if (index > -1) {
      state.loadingThumbnails.splice(index, 1);
    }
  },

  // 导航历史mutations（从navigation模块合并）
  ADD_NAVIGATION_HISTORY(state, entry) {
    // 移除当前位置之后的历史记录
    state.navigationHistory = state.navigationHistory.slice(0, state.historyIndex + 1);

    // 添加新记录
    state.navigationHistory.push(entry);

    // 限制历史记录大小
    if (state.navigationHistory.length > state.maxHistorySize) {
      state.navigationHistory.shift();
    } else {
      state.historyIndex++;
    }
  },

  SET_HISTORY_INDEX(state, index) {
    state.historyIndex = Math.max(-1, Math.min(index, state.navigationHistory.length - 1));
  },
  
  // 重置查看器状态
  RESET_VIEWER(state) {
    state.currentPage = 1;
    state.scale = 1.0;
    state.scaleMode = 'auto';
    state.rotation = 0;
    state.rendering = false;
    state.renderingPages = [];
    state.pageInfo = {
      width: 0,
      height: 0,
      aspectRatio: 1
    };
    state.scrollPosition = { x: 0, y: 0 };
    state.thumbnails = {};
    state.loadingThumbnails = [];
    state.navigationHistory = [];
    state.historyIndex = -1;
  }
};

const actions = {
  /**
   * 跳转到指定页面
   */
  goToPage({ commit, rootGetters }, pageNumber) {
    const totalPages = rootGetters['pdfReader/document/totalPages'];

    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    // 统一由视图层驱动真实跳转：优先使用 NavigationService
    if (window.pdfViewerInstance && window.pdfViewerInstance.navigationService &&
        typeof window.pdfViewerInstance.navigationService.goToPage === 'function') {
      window.pdfViewerInstance.navigationService.goToPage(pageNumber);
      // 记录导航历史（来源根据调用路径可传参，这里先用 auto）
      commit('ADD_NAVIGATION_HISTORY', { pageNumber: pageNumber, source: 'auto', timestamp: Date.now() });
      console.log(`[viewer.goToPage] via NavigationService -> ${pageNumber}`);
      return pageNumber;
    }

    // 回退：使用组件提供的同步方法（仍会触发 page-changed 事件）
    if (window.pdfViewerInstance && typeof window.pdfViewerInstance.syncPageFromStore === 'function') {
      window.pdfViewerInstance.syncPageFromStore(pageNumber);
      commit('ADD_NAVIGATION_HISTORY', { pageNumber: pageNumber, source: 'auto', timestamp: Date.now() });
      console.log(`[viewer.goToPage] via syncPageFromStore -> ${pageNumber}`);
      return pageNumber;
    }

    // 最后回退：没有视图实例，仅更新 Store（非推荐，仅为容错）
    // 注意：正常情况下应该存在视图实例并通过事件回写状态
    // commit('SET_CURRENT_PAGE', pageNumber);
    console.warn('[viewer.goToPage] No viewer instance found, consider ensuring PdfViewerCore is mounted.');
    return pageNumber;
  },
  
  /**
   * 下一页
   */
  nextPage({ state, dispatch, rootGetters }) {
    const totalPages = rootGetters['pdfReader/document/totalPages'];
    if (state.currentPage < totalPages) {
      return dispatch('goToPage', state.currentPage + 1);
    }
    return state.currentPage;
  },
  
  /**
   * 上一页
   */
  prevPage({ state, dispatch }) {
    if (state.currentPage > 1) {
      return dispatch('goToPage', state.currentPage - 1);
    }
    return state.currentPage;
  },

  /**
   * 确保当前页面在有效范围内
   */
  ensureValidCurrentPage({ state, commit, rootGetters }) {
    const totalPages = rootGetters['pdfReader/document/totalPages'];

    if (totalPages > 0) {
      // 确保当前页面在有效范围内
      if (state.currentPage < 1) {
        commit('SET_CURRENT_PAGE', 1);
      } else if (state.currentPage > totalPages) {
        commit('SET_CURRENT_PAGE', totalPages);
      }

      console.log('确保页面有效性:', {
        currentPage: state.currentPage,
        totalPages,
        isValid: state.currentPage >= 1 && state.currentPage <= totalPages
      });
    }
  },
  
  /**
   * 设置缩放
   */
  setScale({ commit }, scale) {
    commit('SET_SCALE', scale);
    return scale;
  },
  
  /**
   * 放大
   */
  zoomIn({ state, dispatch }, step = 0.25) {
    const newScale = Math.min(state.scale + step, state.maxScale);
    return dispatch('setScale', newScale);
  },
  
  /**
   * 缩小
   */
  zoomOut({ state, dispatch }, step = 0.25) {
    const newScale = Math.max(state.scale - step, state.minScale);
    return dispatch('setScale', newScale);
  },
  
  /**
   * 设置缩放模式
   */
  setScaleMode({ commit }, mode) {
    commit('SET_SCALE_MODE', mode);
    
    // 根据模式计算实际缩放值
    // 这里需要根据页面尺寸和容器尺寸计算
    // 实际实现会在组件中处理
    
    return mode;
  },
  
  /**
   * 旋转页面
   */
  rotatePage({ state, commit }, degrees = 90) {
    const newRotation = (state.rotation + degrees) % 360;
    commit('SET_ROTATION', newRotation);
    return newRotation;
  },
  
  /**
   * 设置页面渲染状态
   */
  setPageRendering({ commit }, { pageNumber, rendering }) {
    if (rendering) {
      commit('ADD_RENDERING_PAGE', pageNumber);
    } else {
      commit('REMOVE_RENDERING_PAGE', pageNumber);
    }
  },
  
  /**
   * 更新页面信息
   */
  updatePageInfo({ commit }, info) {
    commit('SET_PAGE_INFO', info);
  },
  
  /**
   * 更新滚动位置
   */
  updateScrollPosition({ commit }, position) {
    commit('SET_SCROLL_POSITION', position);
  },
  
  /**
   * 更新查看器配置
   */
  updateConfig({ commit }, config) {
    commit('UPDATE_CONFIG', config);
  },

  /**
   * 加载缩略图（从navigation模块合并）
   */
  async loadThumbnail({ state, commit, rootState }, { pageNumber, scale }) {
    const pdfDocument = rootState.pdfReader.document.pdfDocument;
    if (!pdfDocument || state.thumbnails[pageNumber]) {
      return;
    }

    try {
      commit('ADD_LOADING_THUMBNAIL', pageNumber);

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: scale || state.thumbnailScale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      const thumbnail = {
        canvas: canvas,
        width: viewport.width,
        height: viewport.height,
        scale: scale || state.thumbnailScale
      };

      commit('SET_THUMBNAIL', { pageNumber, thumbnail });
      return thumbnail;
    } catch (error) {
      console.error('加载缩略图失败:', error);
      throw error;
    } finally {
      commit('REMOVE_LOADING_THUMBNAIL', pageNumber);
    }
  },

  /**
   * 添加导航历史（从navigation模块合并）
   */
  addNavigationHistory({ commit }, { pageNumber, source, timestamp }) {
    const entry = {
      pageNumber,
      source: source || 'unknown',
      timestamp: timestamp || Date.now()
    };
    commit('ADD_NAVIGATION_HISTORY', entry);
  },

  /**
   * 重置查看器
   */
  resetViewer({ commit }) {
    commit('RESET_VIEWER');
  }
};

const getters = {
  // 当前页码
  currentPage: state => state.currentPage,
  
  // 当前缩放
  currentScale: state => state.scale,
  
  // 缩放百分比
  scalePercent: state => Math.round(state.scale * 100),
  
  // 当前旋转角度
  currentRotation: state => state.rotation,
  
  // 是否正在渲染
  isRendering: state => state.rendering || state.renderingPages.length > 0,

  // 特定页面是否正在渲染
  isPageRendering: state => pageNumber => state.renderingPages.includes(pageNumber),
  
  // 导航状态
  navigationState: (state, _getters, _rootState, rootGetters) => {
    const totalPages = rootGetters['pdfReader/document/totalPages'];
    const currentPage = state.currentPage;

    return {
      currentPage,
      totalPages,
      canGoNext: currentPage < totalPages && totalPages > 0,
      canGoPrev: currentPage > 1,
      hasPages: totalPages > 0
    };
  },
  
  // 缩放状态
  zoomState: state => ({
    scale: state.scale,
    scaleMode: state.scaleMode,
    scalePercent: Math.round(state.scale * 100),
    canZoomIn: state.scale < state.maxScale,
    canZoomOut: state.scale > state.minScale,
    minScale: state.minScale,
    maxScale: state.maxScale
  }),
  
  // 页面信息
  pageInfo: state => state.pageInfo,
  
  // 查看器配置
  viewerConfig: state => state.config,

  // 当前视图状态
  viewState: state => ({
    currentPage: state.currentPage,
    scale: state.scale,
    scaleMode: state.scaleMode,
    rotation: state.rotation,
    rendering: state.rendering
  }),

  // 缩略图相关getters（从navigation模块合并）
  thumbnailCount: state => Object.keys(state.thumbnails).length,
  isLoadingThumbnail: state => pageNumber => state.loadingThumbnails.includes(pageNumber),
  getThumbnail: state => pageNumber => state.thumbnails[pageNumber],

  // 导航历史getters（从navigation模块合并）
  canGoBack: state => state.historyIndex > 0,
  canGoForward: state => state.historyIndex < state.navigationHistory.length - 1,
  currentHistoryEntry: state => {
    if (state.historyIndex >= 0 && state.historyIndex < state.navigationHistory.length) {
      return state.navigationHistory[state.historyIndex];
    }
    return null;
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
