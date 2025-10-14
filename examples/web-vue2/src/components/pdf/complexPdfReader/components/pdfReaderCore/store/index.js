import {
  loadPdfDocument,
  DEFAULT_SCALE_DELTA,
  MIN_SCALE,
  MAX_SCALE,
  round2,
  ZOOM_EPS,
} from "../utils/pdf-config.js";
import { resolveDestToPage } from "../utils/pdf-utils.js";

const state = {
  // --- document ---
  pdfDocument: null,
  documentInfo: { numPages: 0, fingerprint: null },
  metadata: null,
  docLoading: false,
  error: null,

  // --- viewer ---
  currentPage: 1,
  scale: 1.0,
  baselineScale: null,

  // --- loading queue ---
  pendingCount: 0,
  pendingLabels: [],
};

const mutations = {
  // --- document ---
  SET_DOCUMENT(state, document) {
    state.pdfDocument = document;
    if (document) {
      state.documentInfo.numPages = document.numPages || 0;
      state.documentInfo.fingerprint =
        document.fingerprints?.[0] || document.fingerprint || null;
    }
  },
  SET_METADATA(state, metadata) {
    state.metadata = metadata;
  },
  SET_DOC_LOADING(state, loading) {
    state.docLoading = loading;
  },
  SET_ERROR(state, { error }) {
    state.error = error;
  },
  CLEAR_ERROR(state) {
    state.error = null;
  },
  RESET_DOCUMENT(state) {
    state.pdfDocument = null;
    state.documentInfo = { numPages: 0, fingerprint: null };
    state.metadata = null;
    state.docLoading = false;
    state.error = null;
  },

  // --- viewer ---
  SET_CURRENT_PAGE(state, pageNumber) {
    if (pageNumber >= 1) state.currentPage = pageNumber;
  },
  SET_SCALE(state, scale) {
    if (scale >= MIN_SCALE && scale <= MAX_SCALE) state.scale = scale;
  },
  SET_BASELINE_SCALE(state, scale) {
    if (typeof scale === "number" && scale > 0) state.baselineScale = scale;
  },
  RESET_VIEWER(state) {
    state.currentPage = 1;
    state.scale = 1.0;
    state.baselineScale = null;
  },

  // --- loading queue ---
  PENDING_ADD(state, { label } = {}) {
    state.pendingCount += 1;
    if (label) {
      state.pendingLabels.push(label);
    }
  },
  PENDING_REMOVE(state, { label } = {}) {
    if (label) {
      const idx = state.pendingLabels.lastIndexOf(label);
      if (idx !== -1) {
        state.pendingLabels.splice(idx, 1);
      }
    }
    state.pendingCount = Math.max(0, state.pendingCount - 1);
  },
};

const actions = {
  // --- document ---
  async getPage({ state }, pageNumber) {
    const doc = state.pdfDocument;
    if (!doc) throw new Error("文档未加载");
    if (pageNumber < 1 || pageNumber > (doc.numPages || 0))
      throw new Error(`页码超出范围: ${pageNumber}`);
    return await doc.getPage(pageNumber);
  },
  async getOutline({ state }) {
    const doc = state.pdfDocument;
    if (!doc) throw new Error("文档未加载");
    try {
      return await doc.getOutline();
    } catch (error) {
      return null;
    }
  },
  async loadDocument({ commit, dispatch }, getDocumentOptions = {}) {
    try {
      // 清空上一次文档与查看器状态
      dispatch("resetAllState");
      commit("SET_DOC_LOADING", true);
      commit("CLEAR_ERROR");

      const { pdfDocument } = await loadPdfDocument({
        getDocumentOptions,
      });

      const metadata = await pdfDocument.getMetadata();
      commit("SET_DOCUMENT", pdfDocument);
      if (metadata) commit("SET_METADATA", metadata);

      commit("SET_DOC_LOADING", false);
      commit("CLEAR_ERROR");

      if (pdfDocument?.numPages > 0) {
        await dispatch("goToPage", 1);
      }
      return { pdfDocument };
    } catch (error) {
      dispatch("resetAllState");
      commit("SET_ERROR", { error: error.message, type: "load" });
      commit("SET_DOC_LOADING", false);
      throw error;
    }
  },

  setDocError({ commit }, { error, type = "load" }) {
    commit("SET_ERROR", { error, type });
    commit("SET_DOC_LOADING", false);
  },

  // --- viewer ---
  goToPage({ commit, getters }, pageNumber) {
    const totalPages = getters.totalPages;
    if (pageNumber < 1 || pageNumber > totalPages)
      throw new Error(`页码超出范围: ${pageNumber}`);
    commit("SET_CURRENT_PAGE", pageNumber);
    return pageNumber;
  },

  // --- loading queue ---
  async runWithLoadPending({ commit }, { run, label } = {}) {
    commit("PENDING_ADD", { label });
    try {
      const runner = typeof run === "function" ? run : () => run;
      return await runner();
    } finally {
      commit("PENDING_REMOVE", { label });
    }
  },

  nextPage({ state, dispatch, getters }) {
    const totalPages = getters.totalPages;
    if (state.currentPage < totalPages)
      return dispatch("goToPage", state.currentPage + 1);
    return state.currentPage;
  },
  prevPage({ state, dispatch }) {
    if (state.currentPage > 1)
      return dispatch("goToPage", state.currentPage - 1);
    return state.currentPage;
  },
  setScale({ commit }, scale) {
    commit(
      "SET_SCALE",
      round2(Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE))
    );
    return scale;
  },
  setBaselineScale({ commit }, scale) {
    if (typeof scale === "number" && scale > 0)
      commit("SET_BASELINE_SCALE", scale);
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
    if (!doc) throw new Error("PDF 文档未加载");
    const pageNumber = await resolveDestToPage({ pdfDocument: doc, dest });
    if (!pageNumber) throw new Error("无法解析目的地页码");
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

  // --- all ---
  resetAllState({ commit }) {
    commit("RESET_DOCUMENT");
    commit("RESET_VIEWER");
  },
};

const getters = {
  isDocumentLoaded: state => !!state.pdfDocument,
  totalPages: state => state.documentInfo.numPages,
  metadata: state => state.metadata,
  loadedEvent: state => ({
    document: state.pdfDocument,
    info: {
      numPages:
        state.documentInfo?.numPages || state.pdfDocument?.numPages || 0,
      fingerprint:
        state.documentInfo?.fingerprint ||
        state.pdfDocument?.fingerprints?.[0] ||
        state.pdfDocument?.fingerprint ||
        null,
      metadata: state.metadata || null,
    },
  }),
  isLoading: state => state.pendingCount > 0 || state.docLoading,
  loadingMessage: state => {
    const hasPending = state.pendingCount > 0;
    const latest = state.pendingLabels.length
      ? state.pendingLabels[state.pendingLabels.length - 1]
      : "";
    if (hasPending && latest) return latest; // 优先：pending 的 label

    return hasPending ? "处理中..." : "加载中"; // 兜底
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
  zoomState: state => ({
    scale: state.scale,
    canZoomIn: state.scale < MAX_SCALE,
    canZoomOut: state.scale > MIN_SCALE,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    baselineScale: state.baselineScale,
    isZoomed:
      typeof state.baselineScale === "number" &&
      state.scale - state.baselineScale > ZOOM_EPS,
  }),
};

export const pdfReaderModule = {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
