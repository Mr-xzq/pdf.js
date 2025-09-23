// Barrel: 统一导出 core 下的公共 API
// 注意：包含 pdf-config 的导出，会触发 pdf_viewer.css 的样式副作用注入
// 如果你需要纯工具无副作用的导入，请改用按需导入单个模块

export * from "./pdf-services.js";
export * from "./pdf-application.js";
export * from "./pdf-events.js";
export * from "./scale.js";
export * from "./pdf-config.js"; // 含样式副作用
export * from "./pdf-loader.js";

// layers 下的导出（按需使用 Builder 与生命周期工具）
export { BaseLayerBuilder } from "./layers/BaseLayerBuilder.js";
export { TextLayerBuilder } from "./layers/TextLayerBuilder.js";
export { AnnotationLayerBuilder } from "./layers/AnnotationLayerBuilder.js";
export * from "./layers/lifecycle.js";
