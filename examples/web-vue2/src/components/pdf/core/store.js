// Core Vuex module canonical export
// 现在直接从 core/store/index.js 暴露实现，不再依赖 complexPdfReader 路径。

export { pdfReaderModule as pdfReaderCoreModule } from "./store/index.js";
export { pdfReaderModule } from "./store/index.js";
export { pdfReaderModule as default } from "./store/index.js";

