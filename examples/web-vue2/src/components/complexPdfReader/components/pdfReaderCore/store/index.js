import documentModule from "./modules/document.js";
import viewerModule from "./modules/viewer.js";

/**
 * PDF 阅读器 Vuex 模块 - 最小化：仅保留文档与查看器状态
 */
export const pdfReaderModule = {
  namespaced: true,
  modules: {
    document: documentModule,
    viewer: viewerModule,
  },
};
