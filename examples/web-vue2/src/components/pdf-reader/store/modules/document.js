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
    title: "",
    author: "",
  },

  // 文档元数据
  metadata: null,

  // 文档大纲
  outline: null,

  // 加载状态
  loading: false,
  loadProgress: 0,
  loadMessage: "",

  // 错误状态
  error: null,
  errorType: null, // 'load', 'render', 'password', 'network'

  // 文档源
  src: "",


  // 加载控制
  loadToken: 0,
  abortController: null,
};

const mutations = {
  // 设置文档实例
  SET_DOCUMENT(state, document) {
    state.pdfDocument = document;
    if (document) {
      state.documentInfo.numPages = document.numPages;
      state.documentInfo.fingerprint = document.fingerprint;
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

  // 设置文档大纲
  SET_OUTLINE(state, outline) {
    state.outline = outline;
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

  // 设置错误
  SET_ERROR(state, { error, type }) {
    state.error = error;
    state.errorType = type || "unknown";
  },

  // 清除错误
  CLEAR_ERROR(state) {
    state.error = null;
    state.errorType = null;
  },

  // 设置文档源
  SET_SRC(state, src) {
    state.src = src;
  },


  // 重置状态
  RESET_DOCUMENT(state) {
    state.pdfDocument = null;
    state.documentInfo = {
      numPages: 0,
      fingerprint: null,
      title: "",
      author: "",
    };
    state.metadata = null;
    state.outline = null;
    state.loading = false;
    state.loadProgress = 0;
    state.loadMessage = "";
    state.error = null;
    state.errorType = null;
    state.src = "";
    // 取消控制
    state.loadToken = 0;
    if (state.abortController) {
      try { state.abortController.abort(); } catch (_) {}
    }
    state.abortController = null;
  },
};

const actions = {
  /**
   * 加载文档（开始）- 仅置状态
   */
  async loadDocument({ commit }, { src }) {
    commit("SET_LOADING", true);
    commit("CLEAR_ERROR");
    commit("SET_SRC", src);
    return { success: true };
  },

  /**
   * 设置文档加载完成
   */
  setDocumentLoaded({ commit, dispatch }, { document, info }) {
    commit("SET_DOCUMENT", document);
    commit("SET_DOCUMENT_INFO", info);
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
   * 真实加载文档（Headless 服务）
   */
  async realLoadDocument({ state, commit, dispatch }, { src }) {
    try {
      // 取消上一轮
      if (state.abortController) {
        try { state.abortController.abort(); } catch (_) {}
      }
      const currentToken = (state.loadToken || 0) + 1;
      state.loadToken = currentToken;
      state.abortController = new AbortController();

      // 置状态（便于直接调用 realLoadDocument）
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      commit("SET_SRC", src);

      // 动态导入 headless loader，避免循环依赖
      const { loadPdfDocument } = await import(
        "../../core/headless-pdf-loader.js"
      );

      let lastProgress = 0;
      const { pdfDocument, info, metadata } = await loadPdfDocument({
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
              message: `正在加载... ${percentage}%`,
            });
          }
        },
      });

      // 若已被新任务取代，直接丢弃
      if (state.loadToken !== currentToken) {
        try { pdfDocument?.destroy?.(); } catch (_) {}
        return null;
      }

      // 提交文档与信息
      commit("SET_DOCUMENT", pdfDocument);
      commit("SET_DOCUMENT_INFO", {
        numPages: pdfDocument?.numPages || 0,
        fingerprint: pdfDocument?.fingerprint || null,
        title: info?.Title || "",
        author: info?.Author || "",
      });
      // 元数据（可选）
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

      return { pdfDocument, info, metadata };
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
   * 获取文档大纲
   */
  async fetchOutline({ commit, state }) {
    if (!state.pdfDocument) {
      throw new Error("文档未加载");
    }

    try {
      const outline = await state.pdfDocument.getOutline();
      commit("SET_OUTLINE", outline);
      return outline;
    } catch (error) {
      console.error("获取文档大纲失败:", error);
      commit("SET_OUTLINE", null);
      return null;
    }
  },

  /**
   * 获取文档元数据
   */
  async fetchMetadata({ commit, state }) {
    if (!state.pdfDocument) {
      throw new Error("文档未加载");
    }

    try {
      const metadata = await state.pdfDocument.getMetadata();
      commit("SET_METADATA", metadata.metadata);

      // 更新文档信息（MVP版本：只保留核心信息）
      if (metadata.info) {
        commit("SET_DOCUMENT_INFO", {
          title: metadata.info.Title || "",
          author: metadata.info.Author || "",
        });
      }

      return metadata;
    } catch (error) {
      console.error("获取文档元数据失败:", error);
      return null;
    }
  },

  /**
   * 设置密码状态
   */

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

  // 文档是否正在加载
  isLoading: state => state.loading,

  // 是否有错误
  hasError: state => !!state.error,

  // 总页数
  totalPages: state => state.documentInfo.numPages,

  // 文档标题
  documentTitle: state => state.documentInfo.title || "未命名文档",

  // 文档作者
  documentAuthor: state => state.documentInfo.author,

  // 是否有大纲（由 outline 推导）
  hasOutline: state => Array.isArray(state.outline) && state.outline.length > 0,

  // 加载进度信息
  loadProgressInfo: state => ({
    progress: state.loadProgress,
    message: state.loadMessage,
    loading: state.loading,
  }),

  // 错误信息
  errorInfo: state => ({
    error: state.error,
    type: state.errorType,
    hasError: !!state.error,
  }),

  // 文档基本信息
  basicInfo: state => ({
    numPages: state.documentInfo.numPages,
    title: state.documentInfo.title,
    author: state.documentInfo.author,
    fingerprint: state.documentInfo.fingerprint,
  }),

  // 文档元数据
  metadata: state => state.metadata,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
