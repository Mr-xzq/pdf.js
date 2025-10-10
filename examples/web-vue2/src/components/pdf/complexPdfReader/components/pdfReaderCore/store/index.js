import documentModule from "./modules/document.js";
import viewerModule from "./modules/viewer.js";

export const pdfReaderModule = {
  namespaced: true,
  modules: {
    document: documentModule,
    viewer: viewerModule,
  },
};
