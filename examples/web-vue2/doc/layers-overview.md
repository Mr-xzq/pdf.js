# PDF.js 官方 Layer 与 Vue2 实现对照与总结

本文汇总 `web/` 目录中与页面渲染相关的各类 Layer/Builder，并结合本仓库 `examples/web-vue2` 当前/本次优化后的实现做对照与建议，便于后续统一规划与迭代。

## 1. 官方 web/ 层与职责总览

- TextLayerBuilder（web/text_layer_builder.js）
  - 作用：渲染文本选择与复制的可视层；将 `page.getTextContent()` 的 item 按 transform 绝对定位到页面上，支持精确选中/复制/aria。
  - 输入：pdfPage、viewport、文本内容；
  - 依赖：文本内容解析；
  - 生命周期：render -> update(scale/rotation/viewport) -> cancel -> destroy。

- AnnotationLayerBuilder（web/annotation_layer_builder.js）
  - 作用：渲染各类注释（尤其链接 Link），绑定交互；
  - 输入：pdfPage、viewport、annotations（intent: 'display'）；
  - 依赖：linkService（goToDestination、addLinkAttributes）、annotationStorage、l10n 等；
  - 生命周期：render/update/cancel/destroy。

- AnnotationEditorLayerBuilder（web/annotation_editor_layer_builder.js）
  - 作用：注释编辑层（自由绘制、文本框、矩形等编辑工具），支持创建/移动/删除；
  - 依赖：事件/编辑状态管理、历史撤销、存储；
  - 生命周期：与 AnnotationLayer 类似，额外包含工具态与编辑会话管理。

- StructTreeLayerBuilder（web/struct_tree_layer_builder.js）
  - 作用：构建可访问性语义树（结构化标签），供屏幕阅读器使用；
  - 依赖：结构树数据/aria 属性映射；
  - 生命周期：render/update/destroy。

- XfaLayerBuilder（web/xfa_layer_builder.js）
  - 作用：渲染 XFA 表单层；
  - 依赖：XFA 数据解析、表单控件渲染与交互；
  - 生命周期：render/update/destroy。

- DrawLayerBuilder（web/draw_layer_builder.js）
  - 作用：绘制层（如 SVG/Canvas 上的额外矢量或标记）；
  - 依赖：绘制任务/样式；
  - 生命周期：render/update/cancel/destroy。

- TextHighlighter（web/text_highlighter.js）
  - 作用：查找命中高亮、选区高亮等；
  - 依赖：findController、文本定位与 range 计算；
  - 生命周期：高亮添加/移除、随缩放/滚动更新。

- 统一调度者：PDFPageView（web/pdf_page_view.js）
  - 职责：管理单页渲染与所有层的组合/时序；
  - 关联：PDFViewer（web/pdf_viewer.js）负责多页管理、可见性与渲染队列。

通用特征：
- 统一输入：pdfPage + viewport，必要时注入 services（linkService 等）；
- 生命周期清晰：render/update/cancel/destroy；
- 性能友好：与可见性/渲染队列配合，优先渲染可见项；
- 可访问性：通过 StructTree 与注释/aria 提升辅助技术体验。

## 2. Vue2（examples/web-vue2）当前/本次实现概览

- PdfPageContainer.vue（页面容器，单页 MVP）
  - Canvas：使用 PageRenderService 渲染页面，支持 devicePixelRatio 提升清晰度；
  - LayerBuilder（本次引入）：
    - TextLayerBuilder（简版占位）：先以聚合文本 div 占位，后续替换为逐 item 定位；
    - AnnotationLayerBuilder：渲染 Link 注释，内部目的地统一 `pdfServices.goToDestination(dest)`；外部 URL 复用 `linkService.addLinkAttributes`，无服务时安全降级；
    - （已移除）StructTreeLayer：本示例不包含可访问性结构树层，MVP 不需要；如需可访问性后续可单独引入。
  - 生命周期：initializeLayers -> renderLayers；在切页/缩放前 `cancelLayers()`，beforeDestroy 时 `destroyLayers()`；
  - 依赖注入：通过 `pdfServices.getApplicationServices()` 获取 linkService 等。

- PdfServices / NavigationService
  - 提供 goToDestination(dest) 统一解析目的地并分发到 Vuex viewer.goToPage；
  - NavigationService 负责真正跳页与 scale 变更，并触发组件 onPageChanged/onScaleChanged。

- Vuex viewer 模块
  - goToPage：优先调用 `window.pdfViewerInstance.navigationService.goToPage(pageNumber)`，并记录 `ADD_NAVIGATION_HISTORY`；
  - 只在 `PdfViewer.vue` 的 onPageChanged 中一次性 `commit('SET_CURRENT_PAGE')` 回写，避免循环。

## 3. 官方 vs Vue2 对照表（状态）

- TextLayerBuilder：
  - 官方：精确定位、可选/复制、与高亮协作；
  - Vue2：已有“简版占位”，后续替换为逐 item 定位；
  - 状态：进行中（MVP 已满足不阻塞）。

- AnnotationLayerBuilder：
  - 官方：完整注释渲染与交互；
  - Vue2：已实现 Link 注释（内部/外部链接），统一服务层入口；
  - 状态：已完成基础（继续完善更多注释类型可选）。

- AnnotationEditorLayerBuilder：
  - 官方：注释编辑工具集；
  - Vue2：未引入；
  - 状态：待评估（可作为后续独立特性）。

- StructTreeLayer：
  - 官方：可访问性语义树；
  - Vue2：未接入（本示例已移除，可按需单独引入）；
  - 状态：未接入。

- XfaLayerBuilder / DrawLayerBuilder / TextHighlighter：
  - 官方：分别负责 XFA、绘制、查找高亮；
  - Vue2：暂未接入；
  - 状态：按需引入（不阻塞 MVP）。

## 4. 本次 Layer 优化摘要（Vue2）

- 引入统一 LayerBuilder 抽象（Base/Text/Annotation/StructTree 占位）与“层注册表”，按需启用；
- AnnotationLayerBuilder 统一通过服务层进行内部目的地跳转；
- PdfPageContainer 生命周期完善：
  - 渲染前 cancelLayers()；渲染中 initializeLayers() + renderLayers()；销毁时 destroyLayers()；
  - 缩放/切页时对各层调用 update({ viewport }) 再 render()，保持几何一致；
- Vuex 导航历史在 goToPage 后统一记录，来源后续可细化（toolbar/outline/link-annotation/thumbnail）。

## 5. 建议路线图（按需推进）

- 文本层精度提升（短期）
  - 将 TextLayerBuilder 升级为逐 item 定位（对齐官方），配合 TextHighlighter 做查找高亮；
- 可访问性增强（按需）
  - 如有可访问性需求，再单独引入 StructTree 层并填充结构树/aria 支持；
- 注释类型扩展（中期）
  - 按需支持更多注释（按钮、表单、弹出等），与 AnnotationEditor 分层可插拔；
- 性能与可见性（长期）
  - 多页/虚拟滚动与渲染队列；层级可见性优先；空闲时预取相邻页。

## 6. DoD（完成标准）

- 缩放/切页后，文本/注释层与 Canvas 几何对齐，无残留；
- 文档内 Link（dest/url）均能正确跳转，且有导航历史记录；

- 文本层替换为精确定位方案后，可进行准确选择/复制，Find 高亮正确对齐。

