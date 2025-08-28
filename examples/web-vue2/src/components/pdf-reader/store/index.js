import { createNamespacedHelpers } from 'vuex';
import documentModule from './modules/document.js';
import viewerModule from './modules/viewer.js';
import sidebarModule from './modules/sidebar.js';

/**
 * PDF 阅读器 Vuex 模块 - 包含侧边栏状态管理
 * 管理文档、查看器和侧边栏的全局状态
 */
export const pdfReaderModule = {
  namespaced: true,
  modules: {
    document: documentModule,
    viewer: viewerModule,
    sidebar: sidebarModule
  }
};

/**
 * 安装 PDF 阅读器模块到 Vuex store
 */
export function installPdfReaderModule(store, moduleName = 'pdfReader') {
  if (!store.hasModule(moduleName)) {
    store.registerModule(moduleName, pdfReaderModule);
    console.log(`PDF 阅读器模块已注册: ${moduleName}`);
  }
  return moduleName;
}

/**
 * 卸载 PDF 阅读器模块
 */
export function uninstallPdfReaderModule(store, moduleName = 'pdfReader') {
  if (store.hasModule(moduleName)) {
    store.unregisterModule(moduleName);
    console.log(`PDF 阅读器模块已卸载: ${moduleName}`);
  }
}

/**
 * 创建命名空间辅助函数 - 简化版
 */
export function createPdfReaderHelpers(moduleName = 'pdfReader') {
  // 模块辅助函数
  const documentHelpers = createNamespacedHelpers(`${moduleName}/document`);
  const viewerHelpers = createNamespacedHelpers(`${moduleName}/viewer`);
  const sidebarHelpers = createNamespacedHelpers(`${moduleName}/sidebar`);

  return {
    // 文档相关
    document: {
      mapState: documentHelpers.mapState,
      mapGetters: documentHelpers.mapGetters,
      mapMutations: documentHelpers.mapMutations,
      mapActions: documentHelpers.mapActions
    },

    // 查看器相关
    viewer: {
      mapState: viewerHelpers.mapState,
      mapGetters: viewerHelpers.mapGetters,
      mapMutations: viewerHelpers.mapMutations,
      mapActions: viewerHelpers.mapActions
    },

    // 侧边栏相关
    sidebar: {
      mapState: sidebarHelpers.mapState,
      mapGetters: sidebarHelpers.mapGetters,
      mapMutations: sidebarHelpers.mapMutations,
      mapActions: sidebarHelpers.mapActions
    }
  };
}

/**
 * 默认的辅助函数（使用默认模块名）
 */
const defaultHelpers = createPdfReaderHelpers();

// 导出文档相关辅助函数
export const {
  mapState: mapDocumentState,
  mapGetters: mapDocumentGetters,
  mapMutations: mapDocumentMutations,
  mapActions: mapDocumentActions
} = defaultHelpers.document;

// 导出查看器相关辅助函数
export const {
  mapState: mapViewerState,
  mapGetters: mapViewerGetters,
  mapMutations: mapViewerMutations,
  mapActions: mapViewerActions
} = defaultHelpers.viewer;

// 导出侧边栏相关辅助函数
export const {
  mapState: mapSidebarState,
  mapGetters: mapSidebarGetters,
  mapMutations: mapSidebarMutations,
  mapActions: mapSidebarActions
} = defaultHelpers.sidebar;



/**
 * 默认导出 - 简化版
 */
export default {
  pdfReaderModule,
  installPdfReaderModule,
  uninstallPdfReaderModule,
  createPdfReaderHelpers
};
