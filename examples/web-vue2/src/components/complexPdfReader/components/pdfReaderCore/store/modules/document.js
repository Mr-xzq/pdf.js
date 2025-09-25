/**
 * PDF 文档状态管理模块
 * 管理文档加载、信息、元数据等状态
 */

const state = {
  // 文档实例
  pdfDocument: null,

  // 文档基本信息（MVP版本：只保留核心信息）
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

  // 加载控制
  loadToken: 0,
  abortController: null,

  // 应用服务（集中托管）
  services: {
    eventBus: null,
    linkService: null,
  },
};

const mutations = {
  // 设置文档实例
  SET_DOCUMENT(state, document) {
    state.pdfDocument = document;
    if (document) {
      state.documentInfo.numPages = document.numPages || 0;
      // pdf.js 推荐使用 `fingerprints[0]`；旧版本可能有 `fingerprint`
      state.documentInfo.fingerprint =
        (document.fingerprints && document.fingerprints[0]) ||
        document.fingerprint ||
        null;
    }
  },

  // 设置文档信息
  SET_DOCUMENT_INFO(state, info) {
    state.documentInfo = {
      ...state.documentInfo,
      ...info,
    };
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
    // 取消控制
    state.loadToken = 0;
    if (state.abortController) {
      try {
        state.abortController.abort();
      } catch (_) {}
    }
    state.abortController = null;
  },

  // 应用服务（EventBus/LinkService）
  SET_SERVICES(state, services) {
    const { eventBus = null, linkService = null } = services || {};
    state.services.eventBus = eventBus;
    state.services.linkService = linkService;
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
    } catch (_) {
      return null;
    }
  },
  /**
   * 设置文档加载完成
   */
  setDocumentLoaded({ commit, dispatch }, { document, info }) {
    commit("SET_DOCUMENT", document);
    commit("SET_DOCUMENT_INFO", {
      numPages: document?.numPages || info?.numPages || 0,
      fingerprint:
        info?.fingerprint ||
        (document?.fingerprints && document.fingerprints[0]) ||
        document?.fingerprint ||
        null,
    });
    commit("SET_LOADING", false);
    commit("CLEAR_ERROR");

    // 确保文档信息正确设置
    const totalPages = document?.numPages || info?.numPages || 0;
    console.log("文档加载完成，总页数:", totalPages);

    // 确保当前页面状态正确初始化
    if (totalPages > 0) {
      // 初始化当前页面为第1页（使用绝对命名空间路径）
      dispatch("pdfReader/viewer/goToPage", 1, { root: true });
    }
  },

  /**
   * 初始化 PDF.js 与核心服务（EventBus/LinkService）
   * 幂等：可多次调用
   */
  async initializeServices({ state, commit }) {
    try {
      const { initializePdfJs } = await import("../../utils/pdf-config.js");
      initializePdfJs();
      if (!state.services.eventBus || !state.services.linkService) {
        const { EventBus, PDFLinkService } = await import(
          "pdfjs-dist/legacy/web/pdf_viewer.mjs"
        );
        const eventBus = new EventBus();
        const linkService = new PDFLinkService({ eventBus });
        commit("SET_SERVICES", { eventBus, linkService });
      }
      // 若已有文档，确保 linkService 关联文档
      if (state.pdfDocument && state.services.linkService) {
        try {
          state.services.linkService.setDocument(state.pdfDocument);
        } catch (_) {}
      }
    } catch (e) {
      console.warn("initializeServices 失败:", e);
    }
  },

  /**
   * 真实加载文档
   */
  async realLoadDocument({ state, commit, dispatch }, { src }) {
    try {
      // 取消上一轮
      if (state.abortController) {
        try {
          state.abortController.abort();
        } catch (_) {}
      }
      const currentToken = (state.loadToken || 0) + 1;
      state.loadToken = currentToken;
      state.abortController = new AbortController();

      // 置状态（便于直接调用 realLoadDocument）
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");

      // 确保核心服务就绪
      await dispatch("initializeServices");

      // 动态导入 headless loader，避免循环依赖
      const { loadPdfDocument } = await import("../../utils/pdf-config.js");

      let lastProgress = 0;
      const { pdfDocument } = await loadPdfDocument({
        src,
        signal: state.abortController.signal,
        onProgress: ({ percentage }) => {
          // 陈旧任务丢弃
          if (state.loadToken !== currentToken) return;
          // 去抖：避免过于频繁的提交
          if (percentage !== lastProgress) {
            lastProgress = percentage;
            commit("SET_LOAD_PROGRESS", {
              progress: percentage,
              message: "",
            });
          }
        },
      });

      // 元信息读取上移到调用方
      let metadata = null;
      try {
        metadata = await pdfDocument.getMetadata();
      } catch (_) {}

      // 若已被新任务取代，直接丢弃
      if (state.loadToken !== currentToken) {
        try {
          pdfDocument?.destroy?.();
        } catch (_) {}
        return null;
      }

      // 提交文档与信息
      commit("SET_DOCUMENT", pdfDocument);
      commit("SET_DOCUMENT_INFO", {
        numPages: pdfDocument?.numPages || 0,
        // 优先使用 fingerprints[0]，回退 fingerprint
        fingerprint:
          (pdfDocument?.fingerprints && pdfDocument.fingerprints[0]) ||
          pdfDocument?.fingerprint ||
          null,
      });
      // 元数据（可选）
      if (metadata) {
        commit("SET_METADATA", metadata);
      }

      // 将文档关联到 LinkService
      try {
        state.services.linkService?.setDocument?.(pdfDocument);
      } catch (_) {}

      // 加载完成
      commit("SET_LOADING", false);
      commit("CLEAR_ERROR");

      // 初始化到第 1 页
      if (pdfDocument?.numPages > 0) {
        dispatch("pdfReader/viewer/goToPage", 1, { root: true });
      }

      return { pdfDocument };
    } catch (error) {
      // 忽略因取消导致的错误
      if (error?.name === "AbortError") return null;
      commit("SET_ERROR", { error: error.message, type: "load" });
      commit("SET_LOADING", false);
      throw error;
    }
  },

  /**
   * 设置文档加载进度
   */
  setLoadProgress({ commit }, progressData) {
    commit("SET_LOAD_PROGRESS", progressData);
  },

  /**
   * 设置文档加载错误
   */
  setDocumentError({ commit }, { error, type = "load" }) {
    commit("SET_ERROR", { error, type });
    commit("SET_LOADING", false);
  },

  /**
   * 重置文档状态
   */
  resetDocument({ commit }) {
    commit("RESET_DOCUMENT");
  },
};

const getters = {
  // 文档是否已加载
  isDocumentLoaded: state => !!state.pdfDocument,

  // 总页数（供 viewer 导航计算）
  totalPages: state => state.documentInfo.numPages,

  // 文档元数据

  // 应用服务（EventBus/LinkService）
  services: state => state.services,
  eventBus: state => state.services.eventBus,
  linkService: state => state.services.linkService,

  metadata: state => state.metadata,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
