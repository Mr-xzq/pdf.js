import {
  DEFAULT_SCALE_DELTA,
  MIN_SCALE,
  MAX_SCALE,
  round2,
} from "../../utils/pdf-config.js";
import { resolveDestToPage } from "../../utils/pdf-utils.js";

const ZOOM_EPS = 0.005;

const state = {
  // 当前页面
  currentPage: 1,

  // 缩放相关（仅数值）
  scale: 1.0,
  minScale: 0.1,
  maxScale: 10.0,

  // 基础缩放：用于判定 pdf 是否处于放大状态
  baselineScale: null,
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

  // 设置基础缩放
  SET_BASELINE_SCALE(state, scale) {
    if (typeof scale === 'number' && scale > 0) {
      state.baselineScale = scale;
    }
  },

  // 重置查看器状态
  RESET_VIEWER(state) {
    state.currentPage = 1;
    state.scale = 1.0;
    state.baselineScale = null;
  },
};

const actions = {
  // 跳转到指定页面
  goToPage({ commit, rootGetters }, pageNumber) {
    const totalPages = rootGetters["complexPdfReader/document/totalPages"];
    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }

    commit("SET_CURRENT_PAGE", pageNumber);
    return pageNumber;
  },

  // 下一页
  nextPage({ state, dispatch, rootGetters }) {
    const totalPages = rootGetters["complexPdfReader/document/totalPages"];
    if (state.currentPage < totalPages) {
      return dispatch("goToPage", state.currentPage + 1);
    }
    return state.currentPage;
  },

  // 上一页
  prevPage({ state, dispatch }) {
    if (state.currentPage > 1) {
      return dispatch("goToPage", state.currentPage - 1);
    }
    return state.currentPage;
  },

  // 设置缩放
  setScale({ commit }, scale) {
    commit(
      "SET_SCALE",
      round2(Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE))
    );
    return scale;
  },

  // 设置基础缩放（用于判定 pdf 是否处于放大状态）
  setBaselineScale({ commit }, scale) {
    if (typeof scale === 'number' && scale > 0) {
      commit("SET_BASELINE_SCALE", scale);
    }
    return scale;
  },

  // 放大（乘法步进）
  zoomIn({ state, dispatch }) {
    const next = Math.min(state.scale * DEFAULT_SCALE_DELTA, state.maxScale);
    return dispatch("setScale", round2(next));
  },

  // 缩小（乘法步进）
  zoomOut({ state, dispatch }) {
    const next = Math.max(state.scale / DEFAULT_SCALE_DELTA, state.minScale);
    return dispatch("setScale", round2(next));
  },

  // PDF 内部跳转
  async goToDestination({ dispatch, rootState }, dest) {
    const doc = rootState.complexPdfReader?.document?.pdfDocument;
    if (!doc) {
      throw new Error("PDF 文档未加载");
    }
    const pageNumber = await resolveDestToPage({ pdfDocument: doc, dest });
    if (!pageNumber) {
      throw new Error("无法解析目的地页码");
    }
    return await dispatch("goToPage", pageNumber);
  },

  async resolveDestinationToPage({ rootState }, dest) {
    const doc = rootState.complexPdfReader?.document?.pdfDocument;
    try {
      return await resolveDestToPage({ pdfDocument: doc, dest });
    } catch (error) {
      return null;
    }
  },
};

const getters = {
  // 导航状态
  navigationState: (state, _getters, _rootState, rootGetters) => {
    const totalPages = rootGetters["complexPdfReader/document/totalPages"];
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
    canZoomIn: state.scale < state.maxScale,
    canZoomOut: state.scale > state.minScale,
    minScale: state.minScale,
    maxScale: state.maxScale,
    baselineScale: state.baselineScale,
    isZoomed: (typeof state.baselineScale === 'number') && (state.scale - state.baselineScale > ZOOM_EPS),
  }),
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
