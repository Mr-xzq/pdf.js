import { createNamespacedHelpers } from 'vuex';
import documentModule from './modules/document.js';
import viewerModule from './modules/viewer.js';

/**
 * PDF 阅读器 Vuex 模块
 */
export const pdfReaderModule = {
  namespaced: true,
  modules: {
    document: documentModule,
    viewer: viewerModule
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
 * 创建命名空间辅助函数
 */
export function createPdfReaderHelpers(moduleName = 'pdfReader') {
  // 文档模块辅助函数
  const documentHelpers = createNamespacedHelpers(`${moduleName}/document`);
  const viewerHelpers = createNamespacedHelpers(`${moduleName}/viewer`);
  
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

/**
 * 混合辅助函数 - 同时映射文档和查看器状态
 */
export function createMixedHelpers(moduleName = 'pdfReader') {
  const helpers = createPdfReaderHelpers(moduleName);
  
  return {
    // 混合状态映射
    mapMixedState(documentStates = [], viewerStates = []) {
      return {
        ...helpers.document.mapState(documentStates),
        ...helpers.viewer.mapState(viewerStates)
      };
    },
    
    // 混合 getters 映射
    mapMixedGetters(documentGetters = [], viewerGetters = []) {
      return {
        ...helpers.document.mapGetters(documentGetters),
        ...helpers.viewer.mapGetters(viewerGetters)
      };
    },
    
    // 混合 actions 映射
    mapMixedActions(documentActions = [], viewerActions = []) {
      return {
        ...helpers.document.mapActions(documentActions),
        ...helpers.viewer.mapActions(viewerActions)
      };
    }
  };
}

/**
 * 常用状态组合
 */
export const commonStateHelpers = {
  // 基础状态
  basic: () => ({
    ...mapDocumentState(['loading', 'error']),
    ...mapViewerState(['currentPage', 'scale']),
    ...mapDocumentGetters(['isDocumentLoaded', 'totalPages']),
    ...mapViewerGetters(['navigationState', 'zoomState'])
  }),
  
  // 导航状态
  navigation: () => ({
    ...mapViewerState(['currentPage']),
    ...mapDocumentGetters(['totalPages']),
    ...mapViewerGetters(['navigationState']),
    ...mapViewerActions(['goToPage', 'nextPage', 'prevPage'])
  }),
  
  // 缩放状态
  zoom: () => ({
    ...mapViewerState(['scale', 'scaleMode']),
    ...mapViewerGetters(['zoomState']),
    ...mapViewerActions(['setScale', 'zoomIn', 'zoomOut', 'setScaleMode'])
  }),
  
  // 文档状态
  document: () => ({
    ...mapDocumentState(['loading', 'error', 'src']),
    ...mapDocumentGetters(['isDocumentLoaded', 'documentTitle', 'hasError']),
    ...mapDocumentActions(['loadDocument', 'resetDocument'])
  })
};

/**
 * 状态监听器工厂
 */
export function createStateWatcher(store, moduleName = 'pdfReader') {
  return {
    // 监听文档加载状态
    watchDocumentLoading(callback) {
      return store.watch(
        state => state[moduleName].document.loading,
        callback
      );
    },
    
    // 监听当前页面变化
    watchCurrentPage(callback) {
      return store.watch(
        state => state[moduleName].viewer.currentPage,
        callback
      );
    },
    
    // 监听缩放变化
    watchScale(callback) {
      return store.watch(
        state => state[moduleName].viewer.scale,
        callback
      );
    },
    
    // 监听错误状态
    watchError(callback) {
      return store.watch(
        state => state[moduleName].document.error,
        callback
      );
    }
  };
}

/**
 * 状态验证器
 */
export const stateValidators = {
  // 验证页码
  validatePageNumber(store, pageNumber, moduleName = 'pdfReader') {
    const totalPages = store.getters[`${moduleName}/document/totalPages`];
    return Number.isInteger(pageNumber) && 
           pageNumber >= 1 && 
           pageNumber <= totalPages;
  },
  
  // 验证缩放比例
  validateScale(store, scale, moduleName = 'pdfReader') {
    const { minScale, maxScale } = store.state[moduleName].viewer;
    return typeof scale === 'number' && 
           scale >= minScale && 
           scale <= maxScale;
  },
  
  // 验证文档是否已加载
  validateDocumentLoaded(store, moduleName = 'pdfReader') {
    return store.getters[`${moduleName}/document/isDocumentLoaded`];
  }
};

/**
 * 默认导出
 */
export default {
  pdfReaderModule,
  installPdfReaderModule,
  uninstallPdfReaderModule,
  createPdfReaderHelpers,
  createMixedHelpers,
  commonStateHelpers,
  createStateWatcher,
  stateValidators
};
