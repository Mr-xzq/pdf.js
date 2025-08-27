/**
 * PDF 导航状态管理模块
 * 管理目录、缩略图、书签等导航相关功能的状态
 */

const state = {
  // 目录相关
  outline: null,
  outlineLoading: false,
  outlineError: null,
  expandedOutlineItems: new Set(),
  currentOutlineItem: null,

  // 缩略图相关
  thumbnails: {},
  thumbnailsLoading: false,
  thumbnailsError: null,
  thumbnailSize: 120,
  thumbnailScale: 0.5,
  loadingThumbnails: new Set(),

  // 书签相关（预留）
  bookmarks: [],
  bookmarksLoading: false,
  bookmarksError: null,

  // 搜索相关（预留）
  searchResults: [],
  searchQuery: '',
  searchLoading: false,
  searchError: null,
  currentSearchIndex: 0,

  // 导航历史
  navigationHistory: [],
  historyIndex: -1,
  maxHistorySize: 50,

  // 页面跳转相关
  pendingNavigation: null,
  navigationInProgress: false
};

const mutations = {
  // 目录相关
  SET_OUTLINE(state, outline) {
    state.outline = outline;
  },

  SET_OUTLINE_LOADING(state, loading) {
    state.outlineLoading = loading;
  },

  SET_OUTLINE_ERROR(state, error) {
    state.outlineError = error;
  },

  SET_EXPANDED_OUTLINE_ITEMS(state, items) {
    state.expandedOutlineItems = new Set(items);
  },

  ADD_EXPANDED_OUTLINE_ITEM(state, itemId) {
    state.expandedOutlineItems.add(itemId);
  },

  REMOVE_EXPANDED_OUTLINE_ITEM(state, itemId) {
    state.expandedOutlineItems.delete(itemId);
  },

  SET_CURRENT_OUTLINE_ITEM(state, item) {
    state.currentOutlineItem = item;
  },

  // 缩略图相关
  SET_THUMBNAILS(state, thumbnails) {
    state.thumbnails = { ...thumbnails };
  },

  SET_THUMBNAIL(state, { pageNumber, thumbnail }) {
    state.thumbnails = {
      ...state.thumbnails,
      [pageNumber]: thumbnail
    };
  },

  REMOVE_THUMBNAIL(state, pageNumber) {
    const newThumbnails = { ...state.thumbnails };
    delete newThumbnails[pageNumber];
    state.thumbnails = newThumbnails;
  },

  SET_THUMBNAILS_LOADING(state, loading) {
    state.thumbnailsLoading = loading;
  },

  SET_THUMBNAILS_ERROR(state, error) {
    state.thumbnailsError = error;
  },

  SET_THUMBNAIL_SIZE(state, size) {
    state.thumbnailSize = size;
  },

  SET_THUMBNAIL_SCALE(state, scale) {
    state.thumbnailScale = scale;
  },

  ADD_LOADING_THUMBNAIL(state, pageNumber) {
    state.loadingThumbnails.add(pageNumber);
  },

  REMOVE_LOADING_THUMBNAIL(state, pageNumber) {
    state.loadingThumbnails.delete(pageNumber);
  },

  // 书签相关
  SET_BOOKMARKS(state, bookmarks) {
    state.bookmarks = bookmarks;
  },

  ADD_BOOKMARK(state, bookmark) {
    state.bookmarks.push(bookmark);
  },

  REMOVE_BOOKMARK(state, bookmarkId) {
    state.bookmarks = state.bookmarks.filter(b => b.id !== bookmarkId);
  },

  SET_BOOKMARKS_LOADING(state, loading) {
    state.bookmarksLoading = loading;
  },

  SET_BOOKMARKS_ERROR(state, error) {
    state.bookmarksError = error;
  },

  // 搜索相关
  SET_SEARCH_RESULTS(state, results) {
    state.searchResults = results;
  },

  SET_SEARCH_QUERY(state, query) {
    state.searchQuery = query;
  },

  SET_SEARCH_LOADING(state, loading) {
    state.searchLoading = loading;
  },

  SET_SEARCH_ERROR(state, error) {
    state.searchError = error;
  },

  SET_CURRENT_SEARCH_INDEX(state, index) {
    state.currentSearchIndex = index;
  },

  // 导航历史
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

  CLEAR_NAVIGATION_HISTORY(state) {
    state.navigationHistory = [];
    state.historyIndex = -1;
  },

  // 页面跳转
  SET_PENDING_NAVIGATION(state, navigation) {
    state.pendingNavigation = navigation;
  },

  SET_NAVIGATION_IN_PROGRESS(state, inProgress) {
    state.navigationInProgress = inProgress;
  }
};

const actions = {
  // 加载目录
  async loadOutline({ commit, rootState }) {
    const pdfDocument = rootState.document.pdfDocument;
    if (!pdfDocument) {
      commit('SET_OUTLINE', null);
      return;
    }

    try {
      commit('SET_OUTLINE_LOADING', true);
      commit('SET_OUTLINE_ERROR', null);

      const outline = await pdfDocument.getOutline();
      commit('SET_OUTLINE', outline);

      return outline;
    } catch (error) {
      commit('SET_OUTLINE_ERROR', error.message);
      throw error;
    } finally {
      commit('SET_OUTLINE_LOADING', false);
    }
  },

  // 切换目录项展开状态
  toggleOutlineItem({ commit, state }, itemId) {
    if (state.expandedOutlineItems.has(itemId)) {
      commit('REMOVE_EXPANDED_OUTLINE_ITEM', itemId);
    } else {
      commit('ADD_EXPANDED_OUTLINE_ITEM', itemId);
    }
  },

  // 展开所有目录项
  expandAllOutlineItems({ commit, state }) {
    if (!state.outline) return;

    const allItemIds = [];
    const collectItemIds = (items) => {
      items.forEach(item => {
        if (item.items && item.items.length > 0) {
          const itemId = `${item.title}-${JSON.stringify(item.dest)}`;
          allItemIds.push(itemId);
          collectItemIds(item.items);
        }
      });
    };

    collectItemIds(state.outline);
    commit('SET_EXPANDED_OUTLINE_ITEMS', allItemIds);
  },

  // 收起所有目录项
  collapseAllOutlineItems({ commit }) {
    commit('SET_EXPANDED_OUTLINE_ITEMS', []);
  },

  // 加载缩略图
  async loadThumbnail({ commit, rootState }, { pageNumber, scale }) {
    const pdfDocument = rootState.document.pdfDocument;
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
      commit('SET_THUMBNAILS_ERROR', error.message);
      throw error;
    } finally {
      commit('REMOVE_LOADING_THUMBNAIL', pageNumber);
    }
  },

  // 清除缩略图
  clearThumbnails({ commit }) {
    commit('SET_THUMBNAILS', {});
  },

  // 添加导航历史
  addNavigationHistory({ commit }, { pageNumber, source, timestamp }) {
    const entry = {
      pageNumber,
      source: source || 'unknown',
      timestamp: timestamp || Date.now()
    };
    commit('ADD_NAVIGATION_HISTORY', entry);
  },

  // 导航到历史记录
  navigateToHistory({ commit, state, dispatch }, direction) {
    const newIndex = direction === 'back' 
      ? state.historyIndex - 1 
      : state.historyIndex + 1;

    if (newIndex >= 0 && newIndex < state.navigationHistory.length) {
      commit('SET_HISTORY_INDEX', newIndex);
      const entry = state.navigationHistory[newIndex];
      
      // 触发页面跳转
      dispatch('viewer/goToPage', entry.pageNumber, { root: true });
      
      return entry;
    }
    
    return null;
  },

  // 清除所有导航数据
  clearAllNavigationData({ commit }) {
    commit('SET_OUTLINE', null);
    commit('SET_THUMBNAILS', {});
    commit('SET_BOOKMARKS', []);
    commit('SET_SEARCH_RESULTS', []);
    commit('CLEAR_NAVIGATION_HISTORY');
  }
};

const getters = {
  // 目录相关
  hasOutline: state => state.outline && state.outline.length > 0,
  outlineItemCount: state => {
    if (!state.outline) return 0;
    const countItems = (items) => {
      let count = items.length;
      items.forEach(item => {
        if (item.items && item.items.length > 0) {
          count += countItems(item.items);
        }
      });
      return count;
    };
    return countItems(state.outline);
  },

  // 缩略图相关
  thumbnailCount: state => Object.keys(state.thumbnails).length,
  isLoadingThumbnail: state => pageNumber => state.loadingThumbnails.has(pageNumber),
  getThumbnail: state => pageNumber => state.thumbnails[pageNumber],

  // 导航历史
  canGoBack: state => state.historyIndex > 0,
  canGoForward: state => state.historyIndex < state.navigationHistory.length - 1,
  currentHistoryEntry: state => {
    if (state.historyIndex >= 0 && state.historyIndex < state.navigationHistory.length) {
      return state.navigationHistory[state.historyIndex];
    }
    return null;
  },

  // 搜索相关
  hasSearchResults: state => state.searchResults.length > 0,
  currentSearchResult: state => {
    if (state.searchResults.length > 0 && state.currentSearchIndex >= 0) {
      return state.searchResults[state.currentSearchIndex];
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
