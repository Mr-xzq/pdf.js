## web/ 官方查看器使用要点

本仓库包含 Mozilla 官方 viewer（web/viewer.html 及相关资源），适合参考 UI/交互与完整功能接入方式。

### 快速试用
- 直接用本地静态服务器打开 web/viewer.html
- 通过 URL 参数 file 指定文档：
  - web/viewer.html?file=/gsjrPdf.pdf

### 与库模式的区别
- viewer 通过完整的 UI、事件与服务层组合 pdf.js 能力
- 库模式（本指南多数示例）直接使用 getDocument/PDFDocumentProxy/PDFPageProxy 组合

### 阅读源码建议
- web/pdf_viewer.js：核心 Viewer 组件
- web/app.js：应用入口与初始化
- web/pdf_link_service.js / pdf_outline_viewer.js：跳转与大纲
- web/text_layer_builder.js / annotation_layer_builder.js：文本/注释图层

这些实现可直接迁移/裁剪到自定义项目中（Vue2 适配可参考 examples/web-vue2 目录）。

