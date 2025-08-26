/**
 * PDF 文档状态管理模块
 * 管理文档加载、信息、元数据等状态
 */

const state = {
  // 文档实例
  pdfDocument: null,
  
  // 文档基本信息
  documentInfo: {
    numPages: 0,
    fingerprint: null,
    title: '',
    author: '',
    subject: '',
    creator: '',
    producer: '',
    creationDate: null,
    modificationDate: null
  },
  
  // 文档元数据
  metadata: null,
  
  // 文档大纲
  outline: null,
  
  // 加载状态
  loading: false,
  loadProgress: 0,
  loadMessage: '',
  
  // 错误状态
  error: null,
  errorType: null, // 'load', 'render', 'password', 'network'
  
  // 文档源
  src: '',
  
  // 密码状态
  passwordRequired: false,
  passwordIncorrect: false,
  
  // 文档特性
  features: {
    hasOutline: false,
    hasAnnotations: false,
    hasJavaScript: false,
    hasAcroForm: false,
    isEncrypted: false,
    isLinearized: false
  }
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
      ...info
    };
  },
  
  // 设置文档元数据
  SET_METADATA(state, metadata) {
    state.metadata = metadata;
  },
  
  // 设置文档大纲
  SET_OUTLINE(state, outline) {
    state.outline = outline;
    state.features.hasOutline = !!outline && outline.length > 0;
  },
  
  // 设置加载状态
  SET_LOADING(state, loading) {
    state.loading = loading;
    if (!loading) {
      state.loadProgress = 0;
      state.loadMessage = '';
    }
  },
  
  // 设置加载进度
  SET_LOAD_PROGRESS(state, { progress, message }) {
    state.loadProgress = progress || 0;
    state.loadMessage = message || '';
  },
  
  // 设置错误
  SET_ERROR(state, { error, type }) {
    state.error = error;
    state.errorType = type || 'unknown';
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
  
  // 设置密码状态
  SET_PASSWORD_REQUIRED(state, required) {
    state.passwordRequired = required;
  },
  
  SET_PASSWORD_INCORRECT(state, incorrect) {
    state.passwordIncorrect = incorrect;
  },
  
  // 设置文档特性
  SET_FEATURES(state, features) {
    state.features = {
      ...state.features,
      ...features
    };
  },
  
  // 重置状态
  RESET_DOCUMENT(state) {
    state.pdfDocument = null;
    state.documentInfo = {
      numPages: 0,
      fingerprint: null,
      title: '',
      author: '',
      subject: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null
    };
    state.metadata = null;
    state.outline = null;
    state.loading = false;
    state.loadProgress = 0;
    state.loadMessage = '';
    state.error = null;
    state.errorType = null;
    state.src = '';
    state.passwordRequired = false;
    state.passwordIncorrect = false;
    state.features = {
      hasOutline: false,
      hasAnnotations: false,
      hasJavaScript: false,
      hasAcroForm: false,
      isEncrypted: false,
      isLinearized: false
    };
  }
};

const actions = {
  /**
   * 加载文档
   */
  async loadDocument({ commit, dispatch }, { src, options = {} }) {
    try {
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      commit('SET_SRC', src);
      
      // 这里实际的加载逻辑会在组件中通过 PdfServices 处理
      // 这个 action 主要用于状态管理和事件协调
      
      return { success: true };
    } catch (error) {
      commit('SET_ERROR', {
        error: error.message,
        type: 'load'
      });
      commit('SET_LOADING', false);
      throw error;
    }
  },
  
  /**
   * 设置文档加载完成
   */
  setDocumentLoaded({ commit }, { document, info }) {
    commit('SET_DOCUMENT', document);
    commit('SET_DOCUMENT_INFO', info);
    commit('SET_LOADING', false);
    commit('CLEAR_ERROR');
  },
  
  /**
   * 设置文档加载进度
   */
  setLoadProgress({ commit }, progressData) {
    commit('SET_LOAD_PROGRESS', progressData);
  },
  
  /**
   * 设置文档加载错误
   */
  setDocumentError({ commit }, { error, type = 'load' }) {
    commit('SET_ERROR', { error, type });
    commit('SET_LOADING', false);
  },
  
  /**
   * 获取文档大纲
   */
  async fetchOutline({ commit, state }) {
    if (!state.pdfDocument) {
      throw new Error('文档未加载');
    }
    
    try {
      const outline = await state.pdfDocument.getOutline();
      commit('SET_OUTLINE', outline);
      return outline;
    } catch (error) {
      console.error('获取文档大纲失败:', error);
      commit('SET_OUTLINE', null);
      return null;
    }
  },
  
  /**
   * 获取文档元数据
   */
  async fetchMetadata({ commit, state }) {
    if (!state.pdfDocument) {
      throw new Error('文档未加载');
    }
    
    try {
      const metadata = await state.pdfDocument.getMetadata();
      commit('SET_METADATA', metadata.metadata);
      
      // 更新文档信息
      if (metadata.info) {
        commit('SET_DOCUMENT_INFO', {
          title: metadata.info.Title || '',
          author: metadata.info.Author || '',
          subject: metadata.info.Subject || '',
          creator: metadata.info.Creator || '',
          producer: metadata.info.Producer || '',
          creationDate: metadata.info.CreationDate || null,
          modificationDate: metadata.info.ModDate || null
        });
      }
      
      return metadata;
    } catch (error) {
      console.error('获取文档元数据失败:', error);
      return null;
    }
  },
  
  /**
   * 设置密码状态
   */
  setPasswordRequired({ commit }, required) {
    commit('SET_PASSWORD_REQUIRED', required);
  },
  
  setPasswordIncorrect({ commit }, incorrect) {
    commit('SET_PASSWORD_INCORRECT', incorrect);
  },
  
  /**
   * 重置文档状态
   */
  resetDocument({ commit }) {
    commit('RESET_DOCUMENT');
  }
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
  documentTitle: state => state.documentInfo.title || '未命名文档',
  
  // 文档作者
  documentAuthor: state => state.documentInfo.author,
  
  // 是否有大纲
  hasOutline: state => state.features.hasOutline,
  
  // 是否需要密码
  needsPassword: state => state.passwordRequired,
  
  // 密码是否错误
  isPasswordIncorrect: state => state.passwordIncorrect,
  
  // 文档特性
  documentFeatures: state => state.features,
  
  // 加载进度信息
  loadProgressInfo: state => ({
    progress: state.loadProgress,
    message: state.loadMessage,
    loading: state.loading
  }),
  
  // 错误信息
  errorInfo: state => ({
    error: state.error,
    type: state.errorType,
    hasError: !!state.error
  }),
  
  // 文档基本信息
  basicInfo: state => ({
    numPages: state.documentInfo.numPages,
    title: state.documentInfo.title,
    author: state.documentInfo.author,
    fingerprint: state.documentInfo.fingerprint
  })
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
