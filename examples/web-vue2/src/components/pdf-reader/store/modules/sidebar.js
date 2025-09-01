/**
 * PDF 侧边栏状态管理模块
 * 管理侧边栏的显示状态、标签页切换、宽度等
 */

const state = {
  // 侧边栏显示状态
  visible: false,

  // 当前激活的标签页
  activeTab: "thumbnails", // 'thumbnails', 'outline', 'bookmarks', 'search'

  // 侧边栏宽度
  width: 280, // 像素
  minWidth: 200,
  maxWidth: 500,

  // 可用的标签页配置
  availableTabs: [
    {
      key: "thumbnails",
      title: "缩略图",
      icon: "photo-o",
      enabled: true,
    },
    {
      key: "outline",
      title: "目录",
      icon: "notes-o",
      enabled: true,
    },
    {
      key: "bookmarks",
      title: "书签",
      icon: "bookmark-o",
      enabled: false, // MVP版本暂时禁用
    },
    {
      key: "search",
      title: "搜索",
      icon: "search",
      enabled: false, // MVP版本暂时禁用
    },
  ],

  // 移动端检测
  isMobile: false,

  // 历史记录（用于记住用户偏好）
  lastActiveTab: "thumbnails",
};

const mutations = {
  /**
   * 设置侧边栏显示状态
   */
  SET_VISIBLE(state, visible) {
    state.visible = Boolean(visible);
  },

  /**
   * 设置当前激活的标签页
   */
  SET_ACTIVE_TAB(state, tabKey) {
    // 检查标签页是否可用
    const tab = state.availableTabs.find(t => t.key === tabKey && t.enabled);
    if (tab) {
      state.activeTab = tabKey;
      state.lastActiveTab = tabKey;
    }
  },

  /**
   * 设置侧边栏宽度
   */
  SET_WIDTH(state, width) {
    const newWidth = Math.max(state.minWidth, Math.min(state.maxWidth, width));
    state.width = newWidth;
  },

  /**
   * 设置移动端状态
   */
  SET_MOBILE(state, isMobile) {
    state.isMobile = Boolean(isMobile);
  },

  /**
   * 启用/禁用标签页
   */
  SET_TAB_ENABLED(state, { tabKey, enabled }) {
    const tab = state.availableTabs.find(t => t.key === tabKey);
    if (tab) {
      tab.enabled = Boolean(enabled);

      // 如果当前激活的标签页被禁用，切换到第一个可用的标签页
      if (!enabled && state.activeTab === tabKey) {
        const firstEnabledTab = state.availableTabs.find(t => t.enabled);
        if (firstEnabledTab) {
          state.activeTab = firstEnabledTab.key;
        }
      }
    }
  },

  /**
   * 重置到默认状态
   */
  RESET(state) {
    state.visible = false;
    state.activeTab = "thumbnails";
    state.width = 280;
    state.lastActiveTab = "thumbnails";
  },
};

const actions = {
  /**
   * 显示侧边栏
   */
  show({ commit, state }, tabKey = null) {
    commit("SET_VISIBLE", true);

    // 如果指定了标签页，切换到该标签页
    if (tabKey) {
      commit("SET_ACTIVE_TAB", tabKey);
    } else if (
      !state.availableTabs.find(t => t.key === state.activeTab && t.enabled)
    ) {
      // 如果当前标签页不可用，切换到上次使用的标签页或第一个可用的标签页
      const targetTab =
        state.availableTabs.find(
          t => t.key === state.lastActiveTab && t.enabled
        ) || state.availableTabs.find(t => t.enabled);
      if (targetTab) {
        commit("SET_ACTIVE_TAB", targetTab.key);
      }
    }
  },

  /**
   * 隐藏侧边栏
   */
  hide({ commit }) {
    commit("SET_VISIBLE", false);
  },

  /**
   * 切换侧边栏显示状态
   */
  toggle({ state, dispatch }, tabKey = null) {
    if (state.visible) {
      // 如果已显示且指定了相同的标签页，则隐藏
      if (!tabKey || tabKey === state.activeTab) {
        dispatch("hide");
      } else {
        // 切换到指定的标签页
        dispatch("show", tabKey);
      }
    } else {
      // 显示侧边栏
      dispatch("show", tabKey);
    }
  },

  /**
   * 切换到指定标签页（如果侧边栏未显示则显示）
   */
  switchToTab({ state, commit, dispatch }, tabKey) {
    // 检查标签页是否可用
    const tab = state.availableTabs.find(t => t.key === tabKey && t.enabled);
    if (!tab) {
      console.warn(`标签页不可用: ${tabKey}`);
      return;
    }

    commit("SET_ACTIVE_TAB", tabKey);

    // 如果侧边栏未显示，则显示它
    if (!state.visible) {
      commit("SET_VISIBLE", true);
    }
  },

  /**
   * 调整侧边栏宽度
   */
  setWidth({ commit }, width) {
    commit("SET_WIDTH", width);
  },

  /**
   * 更新移动端状态
   */
  updateMobileState({ commit }) {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768;
    commit("SET_MOBILE", isMobile);
  },

  /**
   * 启用标签页（当相关功能可用时）
   */
  enableTab({ commit }, tabKey) {
    commit("SET_TAB_ENABLED", { tabKey, enabled: true });
  },

  /**
   * 禁用标签页
   */
  disableTab({ commit }, tabKey) {
    commit("SET_TAB_ENABLED", { tabKey, enabled: false });
  },

  /**
   * 重置侧边栏状态
   */
  reset({ commit }) {
    commit("RESET");
  },
};

const getters = {
  /**
   * 获取可用的标签页列表
   */
  enabledTabs: state => state.availableTabs.filter(tab => tab.enabled),

  /**
   * 获取当前激活的标签页信息
   */
  currentTab: state =>
    state.availableTabs.find(tab => tab.key === state.activeTab),

  /**
   * 检查指定标签页是否可用
   */
  isTabEnabled: state => tabKey => {
    const tab = state.availableTabs.find(t => t.key === tabKey);
    return tab ? tab.enabled : false;
  },

  /**
   * 获取侧边栏配置
   */
  config: state => ({
    visible: state.visible,
    activeTab: state.activeTab,
    width: state.width,
    isMobile: state.isMobile,
  }),

  /**
   * 检查是否应该显示侧边栏
   */
  shouldShow: state =>
    state.visible && state.availableTabs.some(tab => tab.enabled),
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
