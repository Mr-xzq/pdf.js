import { loadPdfDocument } from "../../utils/pdf-config.js";

const state = {
  // 文档实例
  pdfDocument: null,

  // 文档基本信息
  documentInfo: {
    numPages: 0,
    fingerprint: null,
  },

  // 文档元数据
  metadata: null,

  // 加载状态
  loading: false,
  loadProgress: 0,
  loadMessage: "",

  // 错误状态
  error: null,
};

const mutations = {
  // 设置文档实例
  SET_DOCUMENT(state, document) {
    state.pdfDocument = document;
    if (document) {
      state.documentInfo.numPages = document.numPages || 0;
      state.documentInfo.fingerprint =
        document.fingerprints?.[0] || document.fingerprint || null;
    }
  },

  // 设置文档元数据
  SET_METADATA(state, metadata) {
    state.metadata = metadata;
  },

  // 设置加载状态
  SET_LOADING(state, loading) {
    state.loading = loading;
    if (!loading) {
      state.loadProgress = 0;
      state.loadMessage = "";
    }
  },

  // 设置加载进度
  SET_LOAD_PROGRESS(state, { progress, message }) {
    state.loadProgress = progress || 0;
    state.loadMessage = message || "";
  },

  // 设置错误（精简：不再区分 errorType）
  SET_ERROR(state, { error }) {
    state.error = error;
  },

  // 清除错误
  CLEAR_ERROR(state) {
    state.error = null;
  },

  // 重置状态
  RESET_DOCUMENT(state) {
    state.pdfDocument = null;
    state.documentInfo = {
      numPages: 0,
      fingerprint: null,
    };
    state.metadata = null;
    state.loading = false;
    state.loadProgress = 0;
    state.loadMessage = "";
    state.error = null;
  },
};

const actions = {
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

  // 加载文档
  async loadDocument({ state, commit, dispatch }, { src }) {
    try {
      // 每次开始新加载前，清空上一次文档与查看器状态，避免遗留旧数据
      commit("RESET_DOCUMENT");
      await dispatch("pdfReader/viewer/resetViewer", null, { root: true });

      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");

      let lastProgress = 0;
      const { pdfDocument } = await loadPdfDocument({
        src,
        onProgress: ({ percentage }) => {
          // 避免过于频繁的提交
          if (percentage !== lastProgress) {
            lastProgress = percentage;
            commit("SET_LOAD_PROGRESS", {
              progress: percentage,
              message: "",
            });
          }
        },
      });

      let metadata = null;
      metadata = await pdfDocument.getMetadata();

      commit("SET_DOCUMENT", pdfDocument);

      if (metadata) {
        commit("SET_METADATA", metadata);
      }

      // 加载完成
      commit("SET_LOADING", false);
      commit("CLEAR_ERROR");

      // 初始化到第 1 页
      if (pdfDocument?.numPages > 0) {
        dispatch("pdfReader/viewer/goToPage", 1, { root: true });
      }

      return { pdfDocument };
    } catch (error) {
      // 失败时也要清空文档，避免遗留旧数据
      commit("RESET_DOCUMENT");
      await dispatch("pdfReader/viewer/resetViewer", null, { root: true });

      commit("SET_ERROR", { error: error.message, type: "load" });
      commit("SET_LOADING", false);
      throw error;
    }
  },

  // 设置文档加载进度
  setLoadProgress({ commit }, progressData) {
    commit("SET_LOAD_PROGRESS", progressData);
  },

  // 设置文档加载错误
  setDocumentError({ commit }, { error, type = "load" }) {
    commit("SET_ERROR", { error, type });
    commit("SET_LOADING", false);
  },
};

const getters = {
  // 文档是否已加载
  isDocumentLoaded: state => !!state.pdfDocument,

  // 总页数
  totalPages: state => state.documentInfo.numPages,

  metadata: state => state.metadata,

  // 统一 loadedEvent payload（供组件使用，避免重复拼装）
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
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
