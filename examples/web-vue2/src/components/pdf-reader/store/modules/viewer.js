/**
 * PDF 查看器状态管理模块
 * 管理查看器的显示状态、导航、缩放等
 */

import {
  DEFAULT_SCALE_DELTA,
  MIN_SCALE,
  MAX_SCALE,
  round2,
} from "../../core/scale";



const state = {
  // 当前页面
  currentPage: 1,

  // 缩放相关（仅数值）
  scale: 1.0,
  minScale: 0.1,
  maxScale: 10.0,

  // 渲染状态
  rendering: false,
  renderingPages: [],

  // 页面尺寸信息
  pageInfo: {
    width: 0,
    height: 0,
    aspectRatio: 1,
  },

  // 滚动位置
  scrollPosition: {
    x: 0,
    y: 0,
  },






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
    }
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
      ...info,
    };
  },

  // 设置滚动位置
  SET_SCROLL_POSITION(state, { x, y }) {
    state.scrollPosition = { x, y };
  },







  // 重置查看器状态
  RESET_VIEWER(state) {
    state.currentPage = 1;
    state.scale = 1.0;
    state.rendering = false;
    state.renderingPages = [];
    state.pageInfo = {
      width: 0,
      height: 0,
      aspectRatio: 1,
    };
    state.scrollPosition = { x: 0, y: 0 };
  },
};

const actions = {
  /**
   * 跳转到指定页面
   */
  goToPage({ commit, rootGetters }, pageNumber) {
    const totalPages = rootGetters["pdfReader/document/totalPages"];

    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    // 以 Store 为单一数据源：先更新 Store，由视图层通过 watcher 同步到 Core
    commit("SET_CURRENT_PAGE", pageNumber);
    return pageNumber;
  },

  /**
   * 下一页
   */
  nextPage({ state, dispatch, rootGetters }) {
    const totalPages = rootGetters["pdfReader/document/totalPages"];
    if (state.currentPage < totalPages) {
      return dispatch("goToPage", state.currentPage + 1);
    }
    return state.currentPage;
  },

  /**
   * 上一页
   */
  prevPage({ state, dispatch }) {
    if (state.currentPage > 1) {
      return dispatch("goToPage", state.currentPage - 1);
    }
    return state.currentPage;
  },

  /**
   * 确保当前页面在有效范围内
   */
  ensureValidCurrentPage({ state, commit, rootGetters }) {
    const totalPages = rootGetters["pdfReader/document/totalPages"];

    if (totalPages > 0) {
      // 确保当前页面在有效范围内
      if (state.currentPage < 1) {
        commit("SET_CURRENT_PAGE", 1);
      } else if (state.currentPage > totalPages) {
        commit("SET_CURRENT_PAGE", totalPages);
      }

      console.log("确保页面有效性:", {
        currentPage: state.currentPage,
        totalPages,
        isValid: state.currentPage >= 1 && state.currentPage <= totalPages,
      });
    }
  },

  /**
   * 设置缩放
   */
  setScale({ commit }, scale) {
    commit(
      "SET_SCALE",
      round2(Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE))
    );
    return scale;
  },



  /**
   * 放大（乘法步进）
   */
  zoomIn({ state, dispatch }) {
    const next = Math.min(state.scale * DEFAULT_SCALE_DELTA, state.maxScale);
    return dispatch("setScale", round2(next));
  },

  /**
   * 缩小（乘法步进）
   */
  zoomOut({ state, dispatch }) {
    const next = Math.max(state.scale / DEFAULT_SCALE_DELTA, state.minScale);
    return dispatch("setScale", round2(next));
  },



  /**
   * 设置页面渲染状态
   */
  setPageRendering({ commit }, { pageNumber, rendering }) {
    if (rendering) {
      commit("ADD_RENDERING_PAGE", pageNumber);
    } else {
      commit("REMOVE_RENDERING_PAGE", pageNumber);
    }
  },

  /**
   * 更新页面信息
   */
  updatePageInfo({ commit }, info) {
    commit("SET_PAGE_INFO", info);
  },

  /**
   * 更新滚动位置
   */
  updateScrollPosition({ commit }, position) {
    commit("SET_SCROLL_POSITION", position);
  },

  /**
   * 更新查看器配置
   */


  /**
   * 加载缩略图（从navigation模块合并）
   */


  /**
   * 添加导航历史（从navigation模块合并）
   */


  /**
   * 重置查看器
   */
  resetViewer({ commit }) {
    commit("RESET_VIEWER");
  },
};

const getters = {
  // 当前页码
  currentPage: state => state.currentPage,

  // 当前缩放
  currentScale: state => state.scale,

  // 缩放百分比
  scalePercent: state => Math.round(state.scale * 100),

  // 是否正在渲染
  isRendering: state => state.rendering || state.renderingPages.length > 0,

  // 特定页面是否正在渲染
  isPageRendering: state => pageNumber =>
    state.renderingPages.includes(pageNumber),

  // 导航状态
  navigationState: (state, _getters, _rootState, rootGetters) => {
    const totalPages = rootGetters["pdfReader/document/totalPages"];
    const currentPage = state.currentPage;

    return {
      currentPage,
      totalPages,
      canGoNext: currentPage < totalPages && totalPages > 0,
      canGoPrev: currentPage > 1,
      hasPages: totalPages > 0,
    };
  },

  // 缩放状态
  zoomState: state => ({
    scale: state.scale,
    scalePercent: Math.round(state.scale * 100),
    canZoomIn: state.scale < state.maxScale,
    canZoomOut: state.scale > state.minScale,
    minScale: state.minScale,
    maxScale: state.maxScale,
  }),

  // 页面信息
  pageInfo: state => state.pageInfo,



  // 当前视图状态
  viewState: state => ({
    currentPage: state.currentPage,
    scale: state.scale,
    rendering: state.rendering,
  }),


};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
