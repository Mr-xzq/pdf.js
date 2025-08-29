# 服务汇总（web/ 官方 vs Vue2 实现）

面向本仓库两个目录：
- web/：PDF.js 官方 Web Viewer 的模块与服务
- examples/web-vue2/：我们基于 Vue2 的移动端阅读器实现

本文梳理官方 viewer 中的“service/管理器/控制器”类与职责，并给出在 Vue2 实现中的取舍与对应关系，便于后续扩展与定位。

## 1. 官方 web/ 目录中的服务清单与职责

按功能分组列出主要“服务类（或管理器/控制器）”与作用（文件位于 web/ 下）：

- 核心通信/事件
  - EventBus（来自 pdf_viewer.mjs）：应用内事件总线
  - ExternalServices（external_services.js / genericcom.js 等）：平台桥接（宿主浏览器/扩展集成）
  - MLManager（external_services 关联）：实验/遥测等能力

- 导航/历史
  - PDFLinkService（pdf_link_service.js）：内部链接/目标跳转、锚点解析
  - PDFHistory（pdf_history.js）：浏览器历史集成，前进/后退、hash 同步
  - ViewHistory（view_history.js）：查看器层面的视图偏好持久化

- 搜索/脚本
  - PDFFindController（pdf_find_controller.js）：全文检索、匹配计数
  - PDFScriptingManager（pdf_scripting_manager.js）：PDF 内嵌脚本（JavaScript）执行与桥接

- 打印/下载
  - PDFPrintServiceFactory（pdf_print_service.js）：打印流程管理
  - DownloadManager（download_manager.js）：下载与保存

- 叠层/对话框/属性
  - OverlayManager（overlay_manager.js）：对话框/遮罩统一管理
  - PasswordPrompt（password_prompt.js）：密码输入弹窗
  - PDFDocumentProperties（pdf_document_properties.js）：文档信息面板
  - AltTextManager（alt_text_manager.js）：可访问性替代文本管理

- 交互/工具
  - PDFCursorTools（pdf_cursor_tools.js）：手型/选择等光标工具集
  - CaretBrowsingMode（caret_browsing.js）：键盘浏览模式

- 偏好/本地化
  - Preferences（preferences.js）：用户偏好设置（与 AppOptions 协作）
  - GenericL10n（genericl10n.js）：本地化/翻译

- 渲染调度
  - PDFRenderingQueue（pdf_rendering_queue.js）：页面/缩略图渲染优先级队列

说明：上述还伴随大量“Viewer/Viewer 子组件（如 PDFViewer、PDFThumbnailViewer、PDFOutlineViewer 等）”与“LayerBuilder（文本/注释/XFA 等）”，它们更偏向 UI 组件与渲染层，不在“服务”范畴内逐一展开。

## 2. Vue2 实现（examples/web-vue2）中的服务清单与职责

本次移动端 MVP 实现严格收敛依赖，抽象出更贴近 Vue 的服务层：

- PdfApplication（core/pdf-application.js）
  - 作用：应用级控制器（轻量版 PDFViewerApplication）
  - 内部实例化：EventBus、PDFLinkService、PDFFindController
  - 能力：加载文档、获取元数据、按页获取 Page、获取大纲
  - 备注：单例；在初始化时通过 pdfjs-dist/webpack.mjs 统一 Worker 配置

- PdfServices（core/pdf-services.js）
  - 作用：对外的“服务门面”与生命周期管理
  - 能力：
    - 预初始化 PDF.js（设置 globalThis.pdfjsLib）
    - 持有 PdfApplication；暴露 getApplicationServices()
    - loadDocument(src, { onProgress, onPassword })：加载 + 事件回调
    - documentState（loaded/loading/totalPages）
    - goToDestination(dest)：解析命名/显式目标为页码，并驱动跳转（优先 Vuex 动作）
  - 备注：与 Vue 组件解耦，通过直接调用组件钩子避免事件循环

- EventBridge（core/pdf-events.js）
  - 作用：将 PDF.js EventBus 事件桥接为 Vue 事件（document/page/scale/search/link 等）
  - 能力：注册/注销监听器，统一转发为更语义化的 VUE_EVENTS

- PageRenderService（core/pdf-services.js）
  - 作用：页面渲染与数据访问的专用服务
  - 能力：renderPageToCanvas（DPR/高分屏优化）、getPageTextContent、getPageAnnotations、简单缓存

- NavigationService（core/pdf-services.js）
  - 作用：页面与缩放的轻量状态控制器
  - 能力：goToPage/next/prev、setScale/zoomIn/zoomOut，并向组件回调状态变更

- LayerBuilders（core/layers/*.js）
  - BaseLayerBuilder、TextLayerBuilder、AnnotationLayerBuilder（简化实现）
  - 作用：在页面容器中按需渲染文本层与注释层，注释链接统一委托 pdfServices.goToDestination(dest)

- 配置/初始化
  - pdf-config.js：PDF_CONFIG、initializePdfJs（零配置 Worker，引入 webpack.mjs）

## 3. 官方服务 ↔ Vue2 实现的对应关系

- 已引入/对等：
  - EventBus → PdfApplication 内部 new EventBus
  - PDFLinkService → PdfApplication 内部 new PDFLinkService（externalLinkTarget=新窗口）
  - PDFFindController → PdfApplication 内部 new PDFFindController

- MVP 暂未引入（可演进）：
  - PDFHistory / ViewHistory → 移动端 MVP 先不做浏览器历史耦合；后续可在 Vue Router 层做最小兼容
  - DownloadManager → 可在需要下载/导出时按官方实现接入
  - OverlayManager / PasswordPrompt / PDFDocumentProperties / AltTextManager → 先以回调事件（onPassword）与自定义 UI 代替
  - PDFPrintServiceFactory → 移动端通常不涉及打印；需时再接入
  - PDFScriptingManager → 出于安全与复杂度，默认关闭（enableScripting=false）
  - PDFCursorTools / CaretBrowsingMode → 移动端优先触控；后续如需“抓手/选择”可扩展
  - Preferences / GenericL10n → MVP 不做持久化偏好与 L10n 面板，可逐步加入
  - PDFRenderingQueue → 当前单页渲染无需复杂队列；多页滚动时建议引入

- Vue2 自有增强：
  - PdfServices 门面 + EventBridge（Vue 风格事件）、NavigationService（轻量状态机）、PageRenderService（渲染与数据整合）
  - LayerBuilders（以组件化/依赖注入方式在页面容器中使用）

## 4. 使用建议（如何选型与扩展）

- 若要增加“内置下载/保存”：
  - 引入 web/download_manager.js 的 DownloadManager；在 PdfApplication 中实例化并通过 PdfServices 暴露方法

- 若要支持“历史/书签/深链接”：
  - 接入 PDFHistory + ViewHistory；在 PdfApplication 初始化时挂接到 linkService，并与 Vue Router 协调

- 若要加入“打印”：
  - 通过 PDFPrintServiceFactory.createPrintService 按官方 app.js 流程接入，移动端可按需降级

- 若要启用“脚本与表单高级行为”：
  - 谨慎开启 enableScripting，并接入 PDFScriptingManager，同时评估安全/性能

- 若要加强“可访问性/本地化/偏好”：
  - 逐步引入 AltTextManager、GenericL10n、Preferences，并设计对应的 Vue 侧 UI

- 若转向“长文档多页滚动”：
  - 引入 PDFRenderingQueue 与多页 Viewer 组件（PDFViewer/PDFSinglePageViewer），并将 PageRenderService 升级为任务队列

## 5. 清单速览（按文件）

- web/（官方服务主文件举例）
  - pdf_link_service.js、pdf_history.js、view_history.js
  - pdf_find_controller.js、pdf_scripting_manager.js
  - pdf_print_service.js、download_manager.js
  - overlay_manager.js、password_prompt.js、pdf_document_properties.js、alt_text_manager.js
  - pdf_cursor_tools.js、caret_browsing.js
  - preferences.js、genericl10n.js
  - pdf_rendering_queue.js

- examples/web-vue2/src/components/pdf-reader/core/
  - pdf-application.js、pdf-services.js、pdf-events.js、pdf-config.js
  - layers/BaseLayerBuilder.js、TextLayerBuilder.js、AnnotationLayerBuilder.js

## 6. 小结

- 官方 web/ Viewer 提供了功能完备的“服务群”，覆盖平台桥接、历史、搜索、打印、脚本、对话框与渲染调度。
- 本次 Vue2 移动端 MVP 以“轻服务层 + 事件桥接 + 渲染/导航最小集”为核心，便于嵌入与后续按需扩展。
- 后续可按第 4 节建议，逐项对齐官方能力，保持门面（PdfServices）稳定，对外 API 不破坏。
