import { cloneDeep } from "lodash";
import {
  loadPdfDocument,
  DEFAULT_SCALE_DELTA,
  MIN_SCALE,
  MAX_SCALE,
  round2,
  ZOOM_EPS,
  ERROR_TYPES,
} from "../utils/pdf-config.js";
import { resolveDestToPage, isValidPageNumber } from "../utils/pdf-utils.js";

const initState = {
  // --- document ---
  pdfDocument: null,
  documentInfo: { numPages: 0, fingerprint: null },
  metadata: null,
  error: null,

  // --- viewer ---
  currentPage: 1,
  scale: 1.0,
  baselineScale: null,

  // --- loading queue ---
  pendingQueue: [],
};

const state = cloneDeep(initState);

const mutations = {
  // --- document ---
  SET_DOCUMENT(state, document) {
    state.pdfDocument = document;
    if (document) {
      state.documentInfo.numPages = document.numPages || 0;
      state.documentInfo.fingerprint = document.fingerprints?.[0] || document.fingerprint || null;
    }
  },
  SET_METADATA(state, metadata) {
    state.metadata = metadata;
  },
  SET_ERROR(state, { type, message } = {}) {
    state.error = { type, message };
  },
  CLEAR_ERROR(state) {
    state.error = null;
  },

  // --- viewer ---
  SET_CURRENT_PAGE(state, pageNumber) {
    if (isValidPageNumber(pageNumber)) {
      state.currentPage = pageNumber;
    }
  },
  SET_SCALE(state, scale) {
    if (scale >= MIN_SCALE && scale <= MAX_SCALE) {
      state.scale = scale;
    }
  },
  SET_BASELINE_SCALE(state, scale) {
    if (typeof scale === "number" && scale > 0) {
      state.baselineScale = scale;
    }
  },

  // --- loading queue ---
  PENDING_ADD(state, { id, message }) {
    const msg = message || "加载中";
    state.pendingQueue.push({ id, message: msg });
  },
  PENDING_REMOVE(state, { id }) {
    const idx = state.pendingQueue.findIndex((queueItem) => queueItem && queueItem.id === id);
    if (idx !== -1) {
      state.pendingQueue.splice(idx, 1);
    }
  },

  // payload.excludeFields: 指定不需要重置的字段，例如 { excludeFields: ["pendingQueue"] }
  // 默认是还原全部的 initState
  RESET_STATE(state, payload = {}) {
    const { excludeFields = [] } = payload || {};
    for (const [key, initValue] of Object.entries(cloneDeep(initState))) {
      if (excludeFields.includes(key)) continue;
      state[key] = initValue;
    }
  },
};

const actions = {
  // --- document ---
  async getPage({ state }, pageNumber) {
    const doc = state.pdfDocument;
    if (!doc) {
      throw new Error("文档未加载");
    }
    if (!isValidPageNumber(pageNumber)) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }
    return await doc.getPage(pageNumber);
  },
  async getOutline({ state }) {
    const doc = state.pdfDocument;
    if (!doc) {
      throw new Error("文档未加载");
    }
    try {
      return await doc.getOutline();
    } catch (error) {
      return null;
    }
  },
  // 文档加载核心逻辑：只负责状态与数据，不直接管理 loading 队列
  async _handleLoadDocument({ commit, dispatch }, getDocumentOptions = {}) {
    try {
      // 清空上一次文档与查看器状态，在这里如果 pendingQueue 还原了会导致 loadDocument 的 runWithLoadPending 提前被清空
      // 这样就提前终止 loading 了
      commit("RESET_STATE", { excludeFields: ["pendingQueue"] });

      const { pdfDocument } = await loadPdfDocument({
        getDocumentOptions,
      });

      const metadata = await pdfDocument.getMetadata();
      commit("SET_DOCUMENT", pdfDocument);
      if (metadata) {
        commit("SET_METADATA", metadata);
      }
      commit("CLEAR_ERROR");

      if (pdfDocument?.numPages > 0) {
        await dispatch("goToPage", 1);
      }
      return { pdfDocument };
    } catch (error) {
      // 加载失败时还原文档相关状态，并由统一错误出口上报，保留 pendingQueue
      commit("RESET_STATE", { excludeFields: ["pendingQueue"] });
      commit("SET_ERROR", {
        type: ERROR_TYPES.LOAD_ERROR,
        message: error?.message || String(error),
      });
      throw error;
    }
  },

  // 对外暴露的文档加载入口，并且通过 loading 队列管理加载态
  async loadDocument({ dispatch }, getDocumentOptions = {}) {
    return dispatch("runWithLoadPending", {
      message: "加载文档",
      run: () => dispatch("_handleLoadDocument", getDocumentOptions),
    });
  },

  // --- viewer ---
  goToPage({ commit }, pageNumber) {
    if (!isValidPageNumber(pageNumber)) {
      throw new Error(`页码超出范围: ${pageNumber}`);
    }
    commit("SET_CURRENT_PAGE", pageNumber);
    return pageNumber;
  },

  // --- loading queue ---
  async runWithLoadPending({ commit }, { run, message } = {}) {
    const id = `${Date.now()}-${Math.random()}`;
    commit("PENDING_ADD", { id, message });
    try {
      const runner = typeof run === "function" ? run : () => run;
      return await runner();
    } finally {
      commit("PENDING_REMOVE", { id });
    }
  },

  nextPage({ state, dispatch, getters }) {
    const totalPages = getters.totalPages;
    if (state.currentPage < totalPages) {
      return dispatch("goToPage", state.currentPage + 1);
    }
    return state.currentPage;
  },
  prevPage({ state, dispatch }) {
    if (state.currentPage > 1) {
      return dispatch("goToPage", state.currentPage - 1);
    }
    return state.currentPage;
  },
  setScale({ commit }, scale) {
    commit("SET_SCALE", round2(Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)));
    return scale;
  },
  setBaselineScale({ commit }, scale) {
    if (typeof scale === "number" && scale > 0) {
      commit("SET_BASELINE_SCALE", scale);
    }
    return scale;
  },
  zoomIn({ state, dispatch }) {
    const next = Math.min(state.scale * DEFAULT_SCALE_DELTA, MAX_SCALE);
    return dispatch("setScale", round2(next));
  },
  zoomOut({ state, dispatch }) {
    const next = Math.max(state.scale / DEFAULT_SCALE_DELTA, MIN_SCALE);
    return dispatch("setScale", round2(next));
  },
  async goToDestination({ dispatch, state }, dest) {
    const doc = state.pdfDocument;
    if (!doc) {
      throw new Error("PDF 文档未加载");
    }
    const pageNumber = await resolveDestToPage({ pdfDocument: doc, dest });
    if (!pageNumber) {
      throw new Error("无法解析目的地页码");
    }
    return await dispatch("goToPage", pageNumber);
  },
  async resolveDestinationToPage({ state }, dest) {
    const doc = state.pdfDocument;
    try {
      return await resolveDestToPage({ pdfDocument: doc, dest });
    } catch (error) {
      return null;
    }
  },
};

const getters = {
  isDocumentLoaded: (state) => !!state.pdfDocument,
  totalPages: (state) => state.documentInfo.numPages,
  metadata: (state) => state.metadata,
  loadedEvent: (state) => ({
    document: state.pdfDocument,
    info: {
      numPages: state.documentInfo?.numPages || state.pdfDocument?.numPages || 0,
      fingerprint:
        state.documentInfo?.fingerprint ||
        state.pdfDocument?.fingerprints?.[0] ||
        state.pdfDocument?.fingerprint ||
        null,
      metadata: state.metadata || null,
    },
  }),
  // 统一的加载状态：仅基于 loading 队列是否为空
  isLoading: (state) => !!state.pendingQueue?.length,
  loadingMessage: (state) => {
    const hasPending = !!state.pendingQueue?.length;
    if (hasPending) {
      const last = state.pendingQueue[state.pendingQueue.length - 1];
      return last?.message || "加载中";
    }
    return "加载中";
  },
  navigationState: (state, getters) => {
    const totalPages = getters.totalPages;
    const currentPage = state.currentPage;
    return {
      currentPage,
      totalPages,
      canGoNext: currentPage < totalPages && totalPages > 0,
      canGoPrev: currentPage > 1,
      hasPages: totalPages > 0,
    };
  },
  zoomState: (state) => ({
    scale: state.scale,
    canZoomIn: state.scale < MAX_SCALE,
    canZoomOut: state.scale > MIN_SCALE,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    baselineScale: state.baselineScale,
    isZoomed: typeof state.baselineScale === "number" && state.scale - state.baselineScale > ZOOM_EPS,
  }),
};

export const pdfReaderModule = {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
