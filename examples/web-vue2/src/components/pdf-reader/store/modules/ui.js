/**
 * PDF 阅读器 UI 状态管理模块
 * 管理工具栏显示、侧边栏状态、对话框等 UI 相关状态
 */

const state = {
  // 工具栏状态
  showTopToolbar: true,
  showBottomToolbar: true,
  toolbarAutoHide: false,
  toolbarHideTimeout: 3000, // 3秒后自动隐藏
  
  // 侧边栏状态
  showSidebar: false,
  sidebarMode: 'thumbs', // 'thumbs', 'outline', 'bookmarks', 'search'
  sidebarWidth: 280,
  
  // 搜索状态
  searchActive: false,
  searchQuery: '',
  searchResults: [],
  searchCurrentIndex: 0,
  
  // 对话框状态
  showPasswordDialog: false,
  showErrorDialog: false,
  showSearchDialog: false,
  
  // 加载状态
  showLoadingOverlay: false,
  loadingMessage: '正在加载...',
  
  // 全屏状态
  fullscreen: false,
  
  // 主题设置
  theme: 'light', // 'light', 'dark'
  
  // 移动端特定状态
  isMobile: false,
  orientation: 'portrait', // 'portrait', 'landscape'
  
  // 用户交互状态
  userActive: true,
  lastActivityTime: Date.now(),
  
  // 错误信息
  errorMessage: null,
  errorDetails: null
};

const mutations = {
  // 工具栏控制
  SET_TOP_TOOLBAR_VISIBLE(state, visible) {
    state.showTopToolbar = visible;
  },
  
  SET_BOTTOM_TOOLBAR_VISIBLE(state, visible) {
    state.showBottomToolbar = visible;
  },
  
  SET_TOOLBAR_AUTO_HIDE(state, autoHide) {
    state.toolbarAutoHide = autoHide;
  },
  
  SET_TOOLBAR_HIDE_TIMEOUT(state, timeout) {
    state.toolbarHideTimeout = timeout;
  },
  
  // 侧边栏控制
  SET_SIDEBAR_VISIBLE(state, visible) {
    state.showSidebar = visible;
  },
  
  SET_SIDEBAR_MODE(state, mode) {
    state.sidebarMode = mode;
  },
  
  SET_SIDEBAR_WIDTH(state, width) {
    state.sidebarWidth = width;
  },
  
  // 搜索控制
  SET_SEARCH_ACTIVE(state, active) {
    state.searchActive = active;
  },
  
  SET_SEARCH_QUERY(state, query) {
    state.searchQuery = query;
  },
  
  SET_SEARCH_RESULTS(state, results) {
    state.searchResults = results;
  },
  
  SET_SEARCH_CURRENT_INDEX(state, index) {
    state.searchCurrentIndex = index;
  },
  
  // 对话框控制
  SET_PASSWORD_DIALOG_VISIBLE(state, visible) {
    state.showPasswordDialog = visible;
  },
  
  SET_ERROR_DIALOG_VISIBLE(state, visible) {
    state.showErrorDialog = visible;
  },
  
  SET_SEARCH_DIALOG_VISIBLE(state, visible) {
    state.showSearchDialog = visible;
  },
  
  // 加载状态
  SET_LOADING_OVERLAY(state, { visible, message = '正在加载...' }) {
    state.showLoadingOverlay = visible;
    state.loadingMessage = message;
  },
  
  // 全屏控制
  SET_FULLSCREEN(state, fullscreen) {
    state.fullscreen = fullscreen;
  },
  
  // 主题控制
  SET_THEME(state, theme) {
    state.theme = theme;
  },
  
  // 移动端状态
  SET_MOBILE(state, isMobile) {
    state.isMobile = isMobile;
  },
  
  SET_ORIENTATION(state, orientation) {
    state.orientation = orientation;
  },
  
  // 用户活动
  SET_USER_ACTIVE(state, active) {
    state.userActive = active;
    if (active) {
      state.lastActivityTime = Date.now();
    }
  },
  
  UPDATE_LAST_ACTIVITY(state) {
    state.lastActivityTime = Date.now();
    state.userActive = true;
  },
  
  // 错误信息
  SET_ERROR(state, { message, details = null }) {
    state.errorMessage = message;
    state.errorDetails = details;
  },
  
  CLEAR_ERROR(state) {
    state.errorMessage = null;
    state.errorDetails = null;
  }
};

const actions = {
  // 切换工具栏显示
  toggleTopToolbar({ commit, state }) {
    commit('SET_TOP_TOOLBAR_VISIBLE', !state.showTopToolbar);
  },
  
  toggleBottomToolbar({ commit, state }) {
    commit('SET_BOTTOM_TOOLBAR_VISIBLE', !state.showBottomToolbar);
  },
  
  // 切换侧边栏
  toggleSidebar({ commit, state }, mode = null) {
    if (mode && mode !== state.sidebarMode) {
      // 切换到不同模式
      commit('SET_SIDEBAR_MODE', mode);
      commit('SET_SIDEBAR_VISIBLE', true);
    } else {
      // 切换显示/隐藏
      commit('SET_SIDEBAR_VISIBLE', !state.showSidebar);
    }
  },

  // 设置侧边栏模式
  setSidebarMode({ commit }, mode) {
    commit('SET_SIDEBAR_MODE', mode);
  },

  // 设置侧边栏可见性
  setSidebarVisible({ commit }, visible) {
    commit('SET_SIDEBAR_VISIBLE', visible);
  },
  
  // 切换搜索
  toggleSearch({ commit, state }) {
    const newActive = !state.searchActive;
    commit('SET_SEARCH_ACTIVE', newActive);
    
    if (!newActive) {
      // 关闭搜索时清空结果
      commit('SET_SEARCH_QUERY', '');
      commit('SET_SEARCH_RESULTS', []);
      commit('SET_SEARCH_CURRENT_INDEX', 0);
    }
  },
  
  // 执行搜索
  async performSearch({ commit, rootState }, query) {
    commit('SET_SEARCH_QUERY', query);
    
    if (!query.trim()) {
      commit('SET_SEARCH_RESULTS', []);
      return;
    }
    
    try {
      // 这里应该调用搜索服务
      // const results = await searchService.search(query);
      // commit('SET_SEARCH_RESULTS', results);
      
      // 临时模拟搜索结果
      const mockResults = [
        { pageNumber: 1, text: query, position: { x: 100, y: 200 } },
        { pageNumber: 3, text: query, position: { x: 150, y: 300 } }
      ];
      commit('SET_SEARCH_RESULTS', mockResults);
    } catch (error) {
      console.error('搜索失败:', error);
      commit('SET_ERROR', { message: '搜索失败', details: error.message });
    }
  },
  
  // 显示错误
  showError({ commit }, { message, details = null }) {
    commit('SET_ERROR', { message, details });
    commit('SET_ERROR_DIALOG_VISIBLE', true);
  },
  
  // 清除错误
  clearError({ commit }) {
    commit('CLEAR_ERROR');
    commit('SET_ERROR_DIALOG_VISIBLE', false);
  },
  
  // 更新用户活动
  updateUserActivity({ commit }) {
    commit('UPDATE_LAST_ACTIVITY');
  },
  
  // 检测移动端
  detectMobile({ commit }) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    commit('SET_MOBILE', isMobile);
    
    // 监听屏幕方向变化
    if (window.screen && window.screen.orientation) {
      const orientation = window.screen.orientation.angle === 0 || window.screen.orientation.angle === 180 ? 'portrait' : 'landscape';
      commit('SET_ORIENTATION', orientation);
    }
  }
};

const getters = {
  // 工具栏状态
  isToolbarVisible: state => state.showTopToolbar || state.showBottomToolbar,
  
  // 侧边栏状态
  sidebarConfig: state => ({
    visible: state.showSidebar,
    mode: state.sidebarMode,
    width: state.sidebarWidth
  }),
  
  // 搜索状态
  searchConfig: state => ({
    active: state.searchActive,
    query: state.searchQuery,
    results: state.searchResults,
    currentIndex: state.searchCurrentIndex,
    hasResults: state.searchResults.length > 0
  }),
  
  // 对话框状态
  dialogStates: state => ({
    password: state.showPasswordDialog,
    error: state.showErrorDialog,
    search: state.showSearchDialog
  }),
  
  // 错误状态
  hasError: state => !!state.errorMessage,
  
  // 用户活动状态
  isUserIdle: state => {
    const idleTime = Date.now() - state.lastActivityTime;
    return idleTime > 30000; // 30秒无活动视为空闲
  },
  
  // 移动端状态
  mobileConfig: state => ({
    isMobile: state.isMobile,
    orientation: state.orientation,
    isLandscape: state.orientation === 'landscape'
  })
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
