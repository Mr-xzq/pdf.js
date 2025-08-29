# Vue2 PDF 查看器 vs 官方 `web/` 实现：对比与优化建议

本文对比 `web/` 官方实现与 `examples/web-vue2/` 的 Vue2 实现（目录、缩略图、页面展示等），结合 Vue2 最佳实践提出一套可落地的优化方案与实施步骤。

## 概要

- 官方实现（`web/`）：以功能内聚的纯 JS 类为核心（PDFViewer、PDFPageView、PDFThumbnailViewer、PDFLinkService、EventBus、RenderingQueue），通过事件总线协作，性能与职责划分成熟。
- Vue2 实现（`examples/web-vue2/src/components/pdf-reader`）：组件化 + Vuex 管理全局状态，已封装 PdfServices、EventBridge，并初步实现 Outline、Thumbnail、ViewerCore 等。
- 核心差异：
  - 官方以“服务/类 + EventBus”为主，状态在类内部；
  - Vue2 以“组件 + Vuex”为主，状态集中在 store；
- 方向：保留 Vue2 开发体验与状态集中管理优势，同时在关键路径对齐官方的职责划分和性能策略。


## 优先级策略（功能优先）

- 先保障功能闭环：目录侧边栏可点击、文档内目录链接（注释层）可交互、统一导航入口（goToPage/goToDestination）、命名空间与状态治理、基础缩略图列表与联动。
- 性能优化（渲染队列/可见性优先级、预取、DPI Canvas 放大、虚拟滚动等）暂列为后期优化，不阻塞当前迭代交付。

## 总体架构对比

- 官方：
  - 页面展示：`web/pdf_viewer.js`（PDFViewer -> 内部管理 PDFPageView 列表、滚动/缩放/渲染队列/可见性计算）
  - 页面视图：`web/pdf_page_view.js`（单页渲染、图层管理、缩放/旋转、renderingState）
  - 缩略图：`web/pdf_thumbnail_viewer.js` + `web/pdf_thumbnail_view.js`（独立滚动容器、懒加载、渲染队列、选中态与滚动定位）
  - 目录：`web/pdf_outline_viewer.js`（树构建、链接绑定、懒展开）
  - 导航：`web/pdf_link_service.js`（goToPage/goToDestination、历史、命名动作）
  - 事件：`web/event_utils.js`（EventBus） + 各模块内部订阅

- Vue2：
  - 页面展示：`PdfViewerCore.vue`（单页渲染 MVP）、`PdfViewer.vue`（外层容器与工具条/侧栏）
  - 缩略图：由 `viewer` 模块的 `loadThumbnail` 生成，尚未形成独立渲染/滚动容器与队列
  - 目录：`PdfOutline.vue` + `PdfOutlineItem.vue`（具备展开/点击跳页能力）
  - 导航：`core/pdf-services.js` + `NavigationService`（对接 linkService 的雏形）
  - 事件：`core/pdf-events.js`（EventBridge 将 PDF.js 事件桥接为 Vue 事件）
  - 状态：Vuex 模块化（`pdfReader/document|viewer|sidebar`），组件映射 actions/getters

## 关键模块对比与改进方向

### 1) 页面展示（Viewer/PageView）
- 官方：多页列表 + 可见性计算 + 渲染队列 + ResizeObserver + 高 DPI 缩放策略。
- 现状：`PdfViewerCore.vue` 以单页为主，`NavigationService` 控制页码与缩放；缺少“多页/虚拟滚动/渲染队列/可见性管理”。
- 建议：
  - 引入“渲染队列与可见性管理”（参照官方 `getVisibleElements` 与 RenderingQueue 思想），逐步支持多页滚动渲染（长文档性能更佳）。
  - DPI 感知缩放（devicePixelRatio）、最大像素控制（maxCanvasPixels 已配置），在 PageContainer 中按需放大 canvas 提升清晰度。

### 2) 缩略图（Thumbnail）
- 官方：独立 `PDFThumbnailViewer` 容器，滚动监听 watchScroll、按可见优先级渲染、选中高亮与滚动定位。
- 现状：`viewer` 模块中以 action 生成缩略图，缺少独立列表/懒加载与渲染优先级管理。
- 建议：
  - 提供 `PdfThumbnailList.vue` 容器组件，内部维护可见区域与渲染优先级；
  - 使用 IntersectionObserver 或滚动监听配合“渲染队列”；
  - 在 Vuex 仅保存必要的缩略图元数据（URL/canvas 缓存引用），避免放置大型二进制数据；
  - 与主视图联动：当前页高亮、点击缩略图滚动到页。

### 3) 目录（Outline）
- 官方：一次性构建树节点，链接通过 linkService 绑定，支持懒展开与定位。
- 现状：`PdfOutline.vue`/`PdfOutlineItem.vue` 已具备展开/跳转，支持“展开到指定项”的逻辑。
- 建议：
  - 懒解析 dest：点击时再解析目标页（已有雏形）。
  - 将“展开状态”和“最近展开路径”下沉到 Vuex（`sidebar` 或新建 `outline` 子模块），在路由/热更新中保持一致。
  - 提供“按当前页定位并自动展开父节点”的能力（文件很大时体验更好）。

### 3.1) 目录的两种交互形态（与官方一致）

- 侧边栏目录（已覆盖）：
  - 官方 `web/pdf_outline_viewer.js`：构建树、为每个条目绑定 `linkService`，点击后通过 `goToDestination` 跳页；并提供 `outlineloaded` 与当前条目标记。
  - Vue2 `PdfOutline.vue`：已支持展开/点击跳转、懒解析 `dest`，具备“展开到指定项”的能力。

- 文档内目录项（未覆盖/待完善）：
  - 官方通过注释层 `AnnotationLayerBuilder` 在页面上渲染“链接注释（linkAnnotation）”，这些链接可以是 PDF 内部跳转（dest）或外部 URL，样式在 `pdf_viewer.css` 中定义；
  - 对应到 Vue2，需要在 `PdfPageContainer.vue` 的注释层渲染时，对 subtype 为 `Link` 的注释：
    - 若 annotation.dest 存在：调用 linkService.goToDestination(dest)；
    - 若 annotation.url 存在：使用 `addLinkAttributes` 或在新窗口打开；
    - 支持 hover/点击态与可访问性属性；
  - 当前我们仅做了基础矩形覆盖（border+背景），尚未接入 linkService 与交互事件，需要补齐。


### 4) 导航与历史（LinkService）
- 官方：`goToPage/goToDestination` + 历史（back/forward）。
- 现状：`NavigationService` 包装 `PdfServices`，Vuex `viewer` 维护 `navigationHistory` 简化版。
- 建议：
  - 统一导航入口：组件与侧边栏、缩略图、文档内链接统一走 `pdfReader/viewer/goToPage`，服务层补齐并对外暴露 `goToDestination`；
  - 历史记录：在 `goToPage` 时 push 历史，提供 back/forward 能力，与命名动作联动；
  - 命名动作与输入：支持 Next/Prev/First/Last 的命名动作，绑定键盘/手势（如上下/左右、双击放大等）。

## 关键模块对比与改进方向（更新补充：功能优先版）

- Viewer（页面展示）：保持单页 MVP，不在本阶段引入多页/虚拟滚动；统一从 Vuex action 驱动（`pdfReader/viewer/goToPage`）。
- Outline（目录侧边栏）：已具备点击跳转与懒解析，补充“按当前页自动展开父链”与状态持久化（Vuex）。
- In-Document Outline（文档内目录/链接）：新增基于注释层的交互绑定——Link 注释有 dest 时调用 `goToDestination`，有 url 时外链打开；样式参考 `pdf_viewer.css` 的 `.annotationLayer .linkAnnotation`。
- Thumbnails（缩略图）：先做“基础列表 + 懒加载 + 当前页高亮 + 点击跳页”，暂不引入复杂渲染队列。
- Navigation（导航）：在服务层补齐 `goToDestination` 并作为统一入口，对齐侧边栏目录、文档内链接、缩略图点击等调用路径。
- State/Events（状态与事件）：命名空间与响应式治理优先；事件桥接维持注册/注销的完整生命周期，避免泄漏。

  - 统一导航入口：所有跳页统一调用 `pdfReader/viewer/goToPage`，内部委托给 `NavigationService` 与 PDF.js linkService；
  - 完善历史：在 `goToPage` 时 push 历史，并提供 back/forward 能力；
  - 命名动作（NextPage/PrevPage/First/Last）与键盘/手势绑定。（本次先不考虑键盘和手势之类的，体验优化也放在后期）

### 5) 事件与状态
- 官方：EventBus 事件驱动，状态以内聚类属性为主。
- 现状：Vuex 集中管理；`pdf-events.js` 已桥接部分事件。
- 建议（Vue2 最佳实践）：
  - 命名空间统一：跨模块分发必须使用绝对路径（例如 `pdfReader/viewer/goToPage`）；
  - Store 避免 Set/Map/WeakMap 作为响应式状态，统一用对象/数组；
  - 组件本地 UI 状态（如输入框聚焦）不进 Vuex；
  - 事件桥接提供注册/注销生命周期，避免泄漏；
  - 仅将“可分享/可恢复”的状态放入 Vuex（页码、缩放、侧栏可见等）。

### 6) 性能细节（后期优化，暂缓）
- 渲染队列：优先可见页/缩略图，滑动时取消低优先级任务；
- 预取：在空闲时预渲染下一页/上一页缩略图；
- ResizeObserver 与 rAF：已有应用，可在列表场景下进一步节流合并；
- Canvas 复用：缩略图/页面渲染完后缓存复用，避免频繁创建销毁；
- HWA 与颜色：对齐官方 `enableHWA` 与 `pageColors` 选项（已在配置中保留入口）。

## 具体优化建议清单

1) 建立“轻服务/强组件/薄 Store”模式：
   - 服务层（PdfServices/NavigationService）：只做 PDF.js API 协调与事件桥接；
   - 组件层（ViewerCore/ThumbnailList/Outline）：处理 UI、滚动、可见性与渲染优先级；
   - Store：记录“共享状态”，不要塞入大体积数据（如完整 canvas 数据）。

2) 对齐官方的职责：
   - ViewerCore 负责“主视图与可见性”，新增滚动列表与渲染优先级；
   - 独立 ThumbnailList 组件管理缩略图渲染；
   - Outline 保持树与懒解析，展开状态持久化在 Vuex。

3) 统一导航入口：
   - 以 `pdfReader/viewer/goToPage` 为唯一跳页 action；
   - 组件内不要直接改 currentPage，统一走 action，内部调用 NavigationService；
   - 修正所有命名空间（已处理 document -> viewer 的初始化跳页）。


   具体说明（落地指引）：
   - 统一入口与对外约定：任何跳页来源（工具栏输入、上一页/下一页、目录点击、文档内链接、缩略图点击、外部调用）一律 `dispatch('pdfReader/viewer/goToPage', pageNumber, { root: true })`。
   - action 内部职责：校验页码 -> 提交 `SET_CURRENT_PAGE` -> 驱动视图层跳转（推荐：委托到 `NavigationService`；当前 MVP 采用 `window.pdfViewerInstance.syncPageFromStore(pageNumber)` 以避免事件回环）。
   - 组件侧约束：
     1) 禁止在组件内部直接写 `this.currentPage = n`；
     2) 禁止直接 `commit('SET_CURRENT_PAGE')` 来“发起跳页”；
     3) 仅当“底层视图已完成跳转并回调 page-changed 事件”时，由容器组件用一次性 `commit('pdfReader/viewer/SET_CURRENT_PAGE', n)` 同步状态，避免再次触发 action 造成循环（此为必要的单向数据流回写例外）。
   - 命名空间规范：跨模块分发与读取一律使用绝对路径，如 `pdfReader/viewer/...`、`rootGetters['pdfReader/document/totalPages']`，并在组件中分发时设置 `{ root: true }`（若当前非该命名空间内部）。

   现状扫描与处理状态：
   - 已对齐为 action：
     - 文档内链接点击（PdfPageContainer.vue）统一 `dispatch('pdfReader/viewer/goToPage', pageNumber)`；
     - 目录/工具栏/对外 API（PdfViewer.vue）通过 `mapViewerActions(['goToPage', ...])` 调用；
     - 文档初始化（PdfViewerCore.vue -> initializeScaleForDocument）调用 `dispatch('pdfReader/viewer/goToPage', initialPage)`；
     - 服务层目的地跳转（PdfServices.goToDestination）优先 `dispatch('pdfReader/viewer/goToPage', pageNumber)`，无 store 时回退到 `navigationService`。
   - 需要保留的“回写例外”：
     - PdfViewer.vue 的 `onPageChanged` 使用 `commit('pdfReader/viewer/SET_CURRENT_PAGE', event.pageNumber)` 仅做状态同步，不再二次触发 action，避免循环。
   - 潜在调用点自检清单：
     - 搜索 `navigationService.goToPage(`：如组件/服务仍直接调用，应替换为 `dispatch('pdfReader/viewer/goToPage', n)`（服务层在无 store 时可保留回退）。
     - 搜索 `SET_CURRENT_PAGE(`：除“事件回写例外”外，应改为分发 `goToPage`；
     - 搜索 `dispatch('goToPage'` 或 `viewer/goToPage`：统一改为 `dispatch('pdfReader/viewer/goToPage', n, { root: true })`；
     - 检查 `rootGetters` 与 `rootState` 的路径是否带上 `pdfReader/` 前缀。

   验证步骤（DoD）：
   - 工具栏输入、上一页/下一页、目录点击、文档内链接、外部示例页调用均能跳转；
   - Vuex DevTools 仅出现一次 `SET_CURRENT_PAGE`，无往返抖动；
   - 大文档（100+ 页）多次跳页无“unknown action type/命名空间错误”；
   - 断开 `window.pdfViewerInstance` 时，服务层回退路径（直接 `navigationService`）仍可用（仅限本地组件调用场景）。

   后续可选优化（非本次必做）：
   - 将 `viewer.goToPage` action 内的“视图驱动”从 `syncPageFromStore` 迁移为显式调用：`window.pdfViewerInstance?.navigationService?.goToPage(pageNumber)`，由 `NavigationService` 触发 `onPageChanged`，容器再做一次性 `commit` 回写，进一步统一真实跳页路径。

4) 严格的响应式约束：
   - Store 内的集合结构统一改为数组/对象；
   - 大对象（如缩略图 canvas）仅做弱引用/缓存，不放入 Store。

5) 引入渲染队列与可见性（后期优化，暂缓）：
   - 使用 IntersectionObserver 或复用官方 `getVisibleElements` 思想；
   - 滚动时，优先渲染可见项，其次预取相邻项。

## 实施步骤（建议分 3 阶段）

阶段 A：命名空间与状态治理（1~2 天）
1. 统一跨模块调用路径：
   - 检查并修正 `dispatch('viewer/...')` -> `dispatch('pdfReader/viewer/...', { root: true })`；
   - 检查 `rootGetters/rootState` 路径，统一加 `pdfReader/` 前缀。
2. Store 响应式清理：
   - 将 `Set/Map` 改为 数组/对象（若仍存在）；
   - 大对象不入 Store，仅存 ID/URL/尺寸等元数据。

阶段 B：缩略图与目录体验（2~3 天）
3. 新建 `PdfThumbnailList.vue`：
   - 独立滚动容器，内部维护“待渲染队列”；
   - 根据可见性懒渲染，点击项 -> `pdfReader/viewer/goToPage`；
   - 当前页高亮、滚动定位。
4. Outline 持久化与懒解析：
   - 在 `pdfReader/sidebar` 或新增 `outline` 子模块存储 `expandedItems`、`lastExpandedPath`；
   - `PdfOutline.vue` 首次定位到当前页时自动展开父链；
   - 点击项时延迟解析 `dest` -> 跳页。

阶段 C（后期优化，暂缓）：ViewerCore 多页与渲染队列（3~5 天）
5. ViewerCore 多页化：
   - 将 `PdfPageContainer` 改为基于列表的多页容器（虚拟滚动或分段渲染）；
   - 引入“渲染队列”：优先可见页，滚动时重算；
   - 设备像素比感知的清晰度策略（提升移动端观感）。
6. 导航与历史完善：
   - 在 `viewer` action `goToPage` 中 push 历史，新增 back/forward；（暂时不考虑跳转集成 history）
   - 绑定快捷键/手势（上下/左右/双击放大等）；（暂时不用）
   - 与缩略图、目录联动（高亮/同步）。

## 验收标准（DoD）
- 命名空间调用无“unknown action type”类报错；
- 100+ 页文档滚动浏览，页面与缩略图都能按可见优先渲染，不卡顿；
- 目录可快速展开定位到当前页，点击跳转无明显抖动；
- 切换窗口尺寸后，缩放/布局能在 1 帧内完成自适应；
- Vuex 中无大体积二进制数据，状态快照小且可恢复。

## 风险与回滚
- 多页渲染初期可能引入性能回退或布局抖动：
  - 先在隐藏开关下灰度；
  - 出问题可回退到单页模式。
- 渲染队列复杂度上升：
  - 优先实现“可见 -> 相邻”两级优先级；
  - 加强日志与性能标记（渲染耗时与丢帧统计）。

## 参考文件（关键片段）
- 官方：
  - `web/pdf_viewer.js`、`web/pdf_page_view.js`、`web/pdf_thumbnail_viewer.js`、`web/pdf_thumbnail_view.js`、`web/pdf_outline_viewer.js`
- Vue2：
  - `components/pdf-reader/components/PdfViewer.vue`、`PdfViewerCore.vue`、`components/ui/PdfOutline.vue`
  - `components/pdf-reader/store/modules/{document.js, viewer.js, sidebar.js}`
  - `components/pdf-reader/core/{pdf-services.js, pdf-events.js, pdf-config.js}`

如果需要，我可以按上述“实施步骤”直接创建 `PdfThumbnailList.vue` 雏形与渲染队列骨架，并补充相应的 Vuex/服务层改动计划与示例代码。



## Layer 分层与 Builder 模式对比（新增）

- 官方 web 分层与 Builder 一览（受 PDFPageView 统一调度）：
  - TextLayerBuilder：文本选择层（web/text_layer_builder.js）
  - AnnotationLayerBuilder：注释/链接层（web/annotation_layer_builder.js）
  - AnnotationEditorLayerBuilder：注释编辑层（web/annotation_editor_layer_builder.js）
  - StructTreeLayerBuilder：语义结构层，辅助可访问性（web/struct_tree_layer_builder.js）
  - XfaLayerBuilder：XFA 表单（web/xfa_layer_builder.js）
  - DrawLayerBuilder：绘制层（web/draw_layer_builder.js）
  - TextHighlighter：查找高亮（web/text_highlighter.js）
- 共同特征：
  - 生命周期清晰：render -> update(scale/rotation/viewport) -> cancel -> destroy；
  - 输入统一：基于 pdfPage 与 viewport 计算布局；
  - 依赖服务统一注入：linkService、l10n、annotationStorage、downloadManager 等；
  - 由 PDFPageView 负责多层组合、可见性与重渲染时序。

- 我们当前实现（PdfPageContainer.vue）现状：
  - 文本层：一次性生成单个 div，弱语义，无法准确选择与复制；
  - 注释层：手动创建 a 元素渲染 Link 注释，基本可用，但未统一走 linkService 能力；
  - 缺少：StructTree、XFA、Draw、AnnotationEditor 等层；
  - 缺少统一的 Layer Builder 抽象，生命周期（取消/更新）与复用性较弱。

### 差距与问题
- 可维护性：逻辑集中在组件方法里，难以按层替换与演进；
- 生命周期：缩放/旋转/翻页时缺少 cancel/update 的一致性保障，易导致残留 DOM 或重复渲染；
- 交互一致性：外链/内链处理未完全复用 linkService.addLinkAttributes 的细节（安全属性、下载、目标窗口策略等）；
- 可访问性：缺少结构树层，屏幕阅读器体验不足；
- 性能：缺少按层的渲染优先级与可见性管控（尤其在多页化后）。

### 建议的架构与抽象
- 定义统一接口 LayerBuilder（示意）：
  - setup({ container, viewport, pdfPage, services })：完成初始化与容器挂载；
  - render(options)：首次或强制渲染；
  - update({ viewport })：在缩放/旋转/容器改变时更新；
  - cancel()：取消正在进行的任务（文本解析/注释解析/绘制等）；
  - destroy()：卸载并释放资源；
- 在 PdfPageContainer 引入“层注册表”，按需启用：text、annotation、structTree、xfa、draw、editor、highlighter；
- 服务注入：通过 PdfServices 暴露 services.linkService/l10n/annotationStorage 等，供各 Layer 使用；

### 最小落地方案（1–2 天，可与当前 MVP 并行）
1) 抽象基础类与目录
   - 新增 core/layers/BaseLayerBuilder.js
   - 新增 core/layers/TextLayerBuilder.js（先保留简版实现，后续替换为更接近官方的逐 glyph/transform 实现）
   - 新增 core/layers/AnnotationLayerBuilder.js（封装链接注释，优先使用 linkService.addLinkAttributes）
2) 改造 PdfPageContainer.vue
   - 用“层注册表”替代 renderTextLayer/renderAnnotationLayer 的内联逻辑；
   - 渲染流程：mount -> setup -> render；缩放/页变更 -> cancel -> update/render；
   - 处理销毁：beforeDestroy 调用每个 Layer 的 cancel/destroy；
3) 服务对齐
   - 在 PdfServices.getApplicationServices() 增补 linkService、l10n、downloadManager、annotationStorage 的访问；
   - Link 注释：优先 linkService.addLinkAttributes；无服务时降级为 target=_blank + rel 安全属性；
4) 文本层体验（MVP）
   - 初期仍用简化文本层，保证不阻塞；
   - 后续迭代替换为“按 item 绝对定位”的文本层（对齐官方，支持精确选择与查找高亮）。

### 兼容与风险
- 直接引入官方 web/* Builder 代码到 Vue2 打包可能导致体积/依赖问题，建议“最小必要复制 + 适配”；
- 多层并行时的顺序：Canvas -> Text -> Annotation -> StructTree -> Highlighter/Editor；任一层失败不应阻塞其他层；
- 建议先在隐藏开关下灰度文本层替换与注释层升级，逐步放量。

### 验收要点（本阶段）
- Link 注释：内部目标触发统一的 pdfReader/viewer/goToPage；外部 URL 走 linkService.addLinkAttributes 或安全降级；
- 缩放后：文本层与注释层与 Canvas 几何一致，无明显错位；
- 销毁/切页：无残留 DOM，内存不随翻页线性增长；
- 可选：开启 StructTree 层时，阅读器可被屏幕阅读器识别（基础标签）。
