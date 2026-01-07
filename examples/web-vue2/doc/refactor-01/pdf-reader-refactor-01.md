# PDF 阅读器重构方案（Refactor-01）

> 目标：在不牺牲现有能力的前提下，让 **Simple** 与 **Complex** 共享一套 Core（Vuex + utils），并为未来 Desktop 端 UI 的扩展打好基础。

## 1. 背景与初始现状（重构前）

- 重构前存在两套移动端 PDF 阅读器 UI：
  - `SimplePdfReader`：轻量模式，直接调用 pdf.js，自己维护加载与渲染。
  - `ComplexPdfReader`：完整功能模式，通过 Vuex 模块 + utils 组成的 Core 来驱动。
- 实际上，**Core 能力已经基本存在于 Complex 的 Vuex 模块 + pdf-config/pdf-utils 中**，包括：
  - 文档加载：`loadPdfDocument`（封装 pdfjsLib.getDocument 与进度回调）。
  - 页面获取与渲染：`getPage`、`renderPageToCanvas` 等。
  - 导航与缩放：`currentPage`、`scale`、`goToPage`、`zoomIn/zoomOut` 等。
- 当时 Simple 绕过这套 Core，自行使用 pdf.js API，导致：
  - 文档加载、进度处理、渲染逻辑等存在重复实现；
  - 无法天然复用到未来的 Desktop Reader。

### 1.1 当前进度快照（本次更新）

- Core：
  - 已在 `examples/web-vue2/src/components/pdf/core/` 下落地独立实现（`pdf-config.js`、`pdf-utils.js`、`core/store/index.js`），并通过 `core/store.js` 暴露 `pdfReaderCoreModule`。
  - 在 `examples/web-vue2/src/store/index.js` 中，以 `pdfReaderCore` 命名空间注册到全局 Vuex store。
- Mobile UI：
  - `components/pdf/mobile/simple/index.vue` 与 `components/pdf/mobile/complex/index.vue` 分别作为移动端 Simple / Complex Reader 的实际实现，也是对外导出的组件本体。
  - `components/pdf/index.js` 中，通过导出别名的方式同时暴露 `SimplePdfReader` / `ComplexPdfReader` 与 `MobileSimplePdfReader` / `MobileComplexPdfReader`，这四个名称实际指向上述两个实现。
- Simple Reader 与 Core：
  - Simple Reader 已不再直接使用 `pdfjsLib.getDocument` 等 API，而是通过 `pdfReaderCore/loadDocument` + `core/pdf-utils.renderPageToCanvas` 完成文档加载与页面渲染。
  - 下载进度与渲染进度通过 Core 的 `onProgress` 回调与组件本地 state 组合后，对外继续暴露 `@loading-start`、`@progress`、`@loaded`、`@error` 等事件。
- Complex Reader 与 Core：
  - Complex Reader 也已经完全通过 `pdfReaderCore` 的 state / getters / actions 以及 `core/pdf-utils` 中的工具（如 `renderPageToCanvas`、`isValidPageNumber`）来驱动视图。
  - Core 负责文档状态与导航/缩放逻辑，Complex 仅负责 UI 布局与交互（目录、缩略图、自动播放、翻页音效等）。
- Desktop Reader 进展（DesktopComplexPdfReader + Desktop 版 PdfViewport）：
  - `components/pdf/desktop/complex/index.vue` 提供 `DesktopComplexPdfReader` 主组件：复用 `pdfReaderCore` 与 `core/pdf-utils`，在 props / 事件 / ref 方法层面与 `mobile/complex` 保持基本对齐，但在 UI 容器上基于 Element（如 `el-input`、`el-dialog` 等）重新组织了底部工具栏与抽屉布局，以适配 PC 端交互。
  - `components/pdf/desktop/complex/components/pdfReaderCore/index.vue` 提供 Desktop 版 `PdfViewport`：基于 `ResizeObserver` 监听容器尺寸变化，结合 `pdfReaderCore` 的 `getPage` / `setScale` / `setBaselineScale`，首版实现了「PC 端一屏一页」的自动适配缩放，并统一承接文档加载、目录获取、缩略图渲染与自动播放等逻辑。
  - Desktop 版 Outline/Thumbnail 组件已在 Desktop 路径下落地：Outline 使用 `components/Outline/OutlineWrapper.vue` + `components/Outline/OutlineContent.vue` 组合，实现与移动端 `OutlinePanel` 等价的「页码 → 目录节点」映射与就近高亮；Thumbnail 使用 `components/Thumbnail/ThumbnailWrapper.vue` + `components/Thumbnail/ThumbnailContent.vue`，采用底部 `el-dialog` + 横向滚动缩略图条，内部同样通过缩放参数计算缩略图渲染尺寸。
  - `DesktopComplexPdfReader` 通过 `page-changed`、`error`、`loading-start` / `loading-stop`、`document-loaded`、`update:autoPlayEnabled` 等事件，以及 `getOutline`、`renderThumbnail`、`navigateToDestination` 等 ref 方法，对外暴露的接口已与移动端 Complex Reader 基本对齐，可作为 Desktop 端首个可用版本（MVP）；目前翻页 slider 与翻页音效仅在移动端 Complex Reader 中提供，Desktop 端暂不包含这些移动端增强交互。
- 旧实现收敛情况：
  - 原 `components/pdf/simplePdfReader/` 与 `components/pdf/complexPdfReader/` 目录的能力已迁移到 `components/pdf/mobile/` 与 `components/pdf/core/` 下，不再作为对外入口使用。
  - 现有示例与后续业务建议统一通过 `components/pdf/index.js` 中的导出使用新路径与命名。
- 阶段状态一览：
  - 阶段一（命名与目录重组）：已在当前代码中完成。
  - 阶段二（统一 Core）：已在移动端 Simple / Complex Reader 中完成；未来 Desktop Reader 也将直接复用同一 Core。
  - 阶段三（Desktop Reader）：已进入 Desktop MVP 阶段，`DesktopComplexPdfReader` 及其 PdfViewport / Outline / Thumbnail 等子组件已在 Desktop 目录下落地并通过 demo 路由完成基础联调，后续主要是 Desktop 专属 UI 与交互的迭代。

## 2. 最终目标（目标态架构）

1. **单一 Core**：
   - 使用一套 Vuex 模块 + utils（记为 `pdfReaderCore`），提供：
     - 文档加载：`loadDocument`, `getPage`, `getOutline`；
     - 导航与缩放：`goToPage`, `nextPage`, `prevPage`, `setScale` 等；
     - 渲染工具：`renderPageToCanvas` 等；
     - 错误与加载状态：`error`, `isLoading`, `loadingMessage`。
2. **多 UI 变体复用同一 Core**：
   - Mobile：
     - `MobileSimplePdfReader`（简单模式）。
     - `MobileComplexPdfReader`（完整模式）。
   - Desktop（未来）：
     - `DesktopSimplePdfReader`、`DesktopComplexPdfReader` 或其他 `DesktopXxxPdfReader`，均通过同一 Core 驱动。
3. **清晰的目录结构与命名**：
   - Core 层：`components/pdf/core/`（Vuex 模块 + utils）。
   - UI 层：按平台与模式划分：
     - `components/pdf/mobile/simple/`、`components/pdf/mobile/complex/`。
     - `components/pdf/desktop/...`（预留）。
4. **保持对现有代码的最大兼容**：
   - `SimplePdfReader` / `ComplexPdfReader` 旧导出仍然可用；
   - 新导出使用更语义化命名：`MobileSimplePdfReader` / `MobileComplexPdfReader` 等。

## 3. 阶段目标与实现路径

### 3.1 阶段一：命名与目录重组（低风险结构优化，已完成）

**目标：** 建立清晰的 Core 与 UI 分层路径，统一导出入口，为后续重构与 Desktop 扩展打基础。

1. 新增并固化 Core 目录：
   - 位置：`examples/web-vue2/src/components/pdf/core/`。
   - 内容：
     - `core/store/index.js`：`pdfReaderCore` Vuex 模块的真实实现，通过 `core/store.js` 暴露为 `pdfReaderCoreModule`，并在全局 store 中以 `pdfReaderCore` 命名空间注册。
     - `core/pdf-config.js`、`core/pdf-utils.js`：集中承载 pdf.js 调用配置、文档加载（`loadPdfDocument`）、渲染工具（`renderPageToCanvas`、`cancelAllRenderTasks` 等）与页码工具（`isValidPageNumber`、`resolveDestToPage`）。
2. 新增 Mobile UI 目录与命名：
   - `components/pdf/mobile/simple/index.vue`：移动端 Simple Reader 的实际实现，直接使用 `pdfReaderCore` 与 `core/pdf-utils`。
   - `components/pdf/mobile/complex/index.vue`：移动端 Complex Reader 的实际实现，基于相同 Core 驱动。
3. 更新统一导出入口 `components/pdf/index.js`：
   - 保留：`SimplePdfReader`, `ComplexPdfReader`（向后兼容旧用法）；
   - 新增：`MobileSimplePdfReader`, `MobileComplexPdfReader`；
   - 当前实现中，`SimplePdfReader` / `ComplexPdfReader` 与 `MobileSimplePdfReader` / `MobileComplexPdfReader` 均通过导出别名指向 `mobile/simple/index.vue` 与 `mobile/complex/index.vue` 两个实现。
4. 收敛旧目录：
   - 原 `simplePdfReader/` 与 `complexPdfReader/` 目录能力已迁移至 `core/` 与 `mobile/` 下，不再作为对外入口使用；
   - 新增与后续业务应统一通过 `components/pdf/index.js` 中的导出使用新路径与命名。

> 阶段一完成后：文件结构更清晰，Core 与 UI 分层边界明确，外部既可以继续使用旧组件名，也可以逐步切换到新的 Mobile 命名。

### 3.2 阶段二：统一 Core（Simple 接入 Vuex Core，移动端已完成）

**目标：** 将 Simple 的加载与渲染逻辑迁移到 Core（Vuex + utils），消除重复逻辑。

1. **统一 Core 模块命名**：
   - 将当前 `complexPdfReader` Vuex 模块更名为 `pdfReaderCore`（或类似命名）：
     - 更新 `store.registerModule` 的命名空间；
     - 更新所有 `mapState("complexPdfReader", ...)` → `mapState("pdfReaderCore", ...)`。
   - 同时更新 `core/store.js` 的导出命名。
2. **Simple 不再直接使用 pdf.js**：
   - 移除 Simple 内部对 `pdfjsLib.getDocument` 等直接依赖；
   - 改为：
     - 使用 Core 的 `loadDocument` action 加载文档；
     - 通过 Core 的 getter 获取 `totalPages`、`isLoading`、`error` 等；
     - 将需要的下载进度（如果要展示）通过 Core 的 `onProgress` 回调向组件本地 state 透传。
3. **统一页面渲染逻辑**：
   - Simple 渲染每一页时：
     - 通过 Core 的 `getPage`（或封装好的 API）获取 `page`；
     - 使用 `renderPageToCanvas` 完成 DPR/viewport/transform 的处理与真正绘制；
   - 组件本地仍然负责布局与滚动（如多页竖排布局、首屏优先渲染等）。
4. **错误与事件兼容**：
   - Simple 使用 Core 的 `error` 状态，并保持对外事件语义不变（如 `@loading-start`、`@progress`、`@loaded`、`@error`）。

> 阶段二完成后：Simple 与 Complex 完全共享一套 Core 能力，pdf.js 相关逻辑集中在 Core 内部维护。

当前实现：`components/pdf/mobile/simple/index.vue` 与 `components/pdf/mobile/complex/index.vue` 已按上述方案接入 `pdfReaderCore` 与 `core/pdf-utils`；后续 Desktop Reader 可直接复用同一 Core。

### 3.3 阶段三：Desktop Reader（第一步：DesktopComplexPdfReader MVP）

**阶段三整体目标：** 在已有 Core 基础上，为 Desktop Reader 提供一套与 Mobile Reader 等价的能力，后续仅在 UI 布局与交互层演进，不再动 Core。

**当前状态：** 已在 `components/pdf/desktop/complex/` 下落地首个 `DesktopComplexPdfReader` MVP，实现了与 `mobile/complex` 在「能力层」（props / 事件 / ref 方法）上的基本对齐，UI 与交互根据 PC 端特性做了适配调整。

1. 目录结构与命名
   - Desktop UI 目录：
     - `components/pdf/desktop/complex/index.vue`：`DesktopComplexPdfReader` 主组件。
     - `components/pdf/desktop/complex/components/pdfReaderCore/index.vue`：Desktop 版 `PdfViewport`。
     - `components/pdf/desktop/complex/components/Outline/OutlineWrapper.vue`、`components/pdf/desktop/complex/components/Outline/OutlineContent.vue`：Desktop 版目录抽屉容器与内容。
     - `components/pdf/desktop/complex/components/Thumbnail/ThumbnailWrapper.vue`、`components/pdf/desktop/complex/components/Thumbnail/ThumbnailContent.vue`：Desktop 版缩略图浮层容器与内容。
     - `components/pdf/desktop/complex/components/tree/*`：与移动端共享实现的目录树组件。
   - 仍使用 `pdfReaderCore` 作为唯一 Core：
     - 通过 `mapState` / `mapGetters` / `mapActions` 使用 `pdfReaderCore` 的状态与能力；
     - 渲染相关继续复用 `core/pdf-utils`（如 `renderPageToCanvas`、`isValidPageNumber` 等）。

2. Desktop / Mobile Complex 对齐情况
   - **两端共享的核心能力：**
     - 使用同一 `pdfReaderCore` 模块（文档加载、错误 & loading 状态、页码/总页数、缩放状态等）；
     - 页面导航：首页 / 末页 / 上一页 / 下一页 + 数字输入跳转（`gotoPageInput + isEditingPageInput` 逻辑一致）；
     - 目录（Outline）：通过 `getOutline` + `resolveDestToPageNumber` 构建「页码 → 节点 key」映射，支持依据当前页自动高亮与就近前驱匹配，并在面板打开时自动滚动到激活节点；
     - 缩略图（Thumbnail）：通过 `renderThumbnail` 渲染各页缩略图，支持点击跳页、跟随当前页高亮并滚动到可见位置；
     - 缩放：支持点击放大到 `zoomTarget`，再通过“还原”按钮恢复放大前的缩放倍数；
     - 自动播放：共用 `autoPlayEnabled / autoPlayIntervalMs` props 与 `update:autoPlayEnabled` / `auto-play-ended` 事件，对外语义一致。
   - **当前仅在移动端提供的能力：**
     - 底部 `slider` 翻页导航：`mobile/complex` 通过 `van-slider` 与 `sliderValue` 同步页码，Desktop 版暂未实现该 UI；
     - 翻页音效：`mobile/complex` 通过 `Audio(sampleAudioUrl)` + 超时/错误处理实现翻页音效的预加载与播放，Desktop 版暂未接入该能力。
   - **当前仅在 Desktop 提供或更强调的行为：**
     - 目录抽屉会根据实际面板宽度动态推开内容区域（`outlineLeftOffset` + `contentAreaStyle.marginLeft`），突出 PC 端左右分栏布局；
     - Desktop 版 `PdfViewport` 结合 `ResizeObserver` 与 `handleViewportResized`，在容器尺寸变化时自动重置手动缩放状态，保证「一屏一页」策略的稳定性；
     - Desktop 缩略图当前采用底部 `el-dialog` + 横向滚动缩略图条，优先保证在宽屏场景下的横向浏览体验，而移动端则使用网格布局（基于列宽推导缩放）。

3. 对外接口（与 `MobileComplexPdfReader` 对齐）
   - Props：
     - `src: string`：PDF 文档地址；
     - `initialPage: number = 1`：初始页；
     - `initialScale: number = 1`：初始缩放；
     - `zoomTarget: number = 1.5`：点击放大的目标倍数；
     - `autoPlayEnabled: boolean = false`：是否开启自动播放（为保持接口兼容，Desktop 与 Mobile 共用该 props）；
     - `autoPlayIntervalMs: number = 1500`：自动翻页间隔。
   - Events（保持与 `mobile/complex` 一致）：
     - `document-loaded(e)`：文档加载完成；
     - `error(err)`：统一错误事件；
     - `loading-start(payload)` / `loading-stop()`：加载状态变化；
     - `page-changed({ newPageNumber, oldPageNumber })`：当前页变化；
     - `update:autoPlayEnabled(value: boolean)`：用于 v-model 语义的自动播放状态同步。
   - 暴露方法（通过 `ref` 调用）：
     - `getOutline()`：获取目录数据；
     - `renderThumbnail(pageNumber, canvasEl, options)`：渲染缩略图；
     - `goToPage(pageNumber)` / `nextPage()` / `prevPage()`：页码导航；
     - `setScale(scale)`：设置缩放。

4. 行为与样式演进策略
   - 行为层：
     - 当前 Desktop 实现已经在「文档加载 / 导航 / 缩放 / 目录 / 缩略图 / 自动播放」等核心行为上与移动端对齐；
     - 翻页 slider 与翻页音效暂时保持为移动端增强能力，后续如有 Desktop 需求，可以在不修改 Core 的前提下，按 PC 交互重新设计对应 UI；
     - 如需引入更“PC 化”的行为（键盘快捷键、鼠标滚轮缩放、多窗格布局等），建议在 `DesktopComplexPdfReader` / Desktop 版 `PdfViewport` 中按平台定制。
   - 样式层：
     - 继续沿用 `.complex-pdf-reader` 及相关 class 作为 Desktop 布局基础，当前样式已针对 PC 端做了 Toolbar 高度、缩略图容器尺寸等初步调优；
     - 等设计稿到位后，再统一调整 Desktop 的布局与视觉风格，保证在不破坏现有 API 的前提下，可以迭代出多个 Desktop 变体。

> 小结：当前 DesktopComplexPdfReader 已作为 Desktop 端复杂 Reader 的首个 MVP，与移动端 Complex 共享同一 Core 与大部分对外接口。后续 Desktop 与 Mobile 的差异将主要体现在样式与交互层，Core 与组件对外 API 尽量保持一致，以降低维护成本与迁移成本。

## 4. Roadmap（实施顺序 & 当前状态）

1. **[x] Step 0：准备阶段**
   - 梳理当前 pdf 相关文件：Vuex 模块、utils、Simple/Complex 组件之间的依赖关系；
   - 确定 Vuex 模块命名空间与注册方式。
2. **[x] Step 1：阶段一（命名与目录重组）**
   - 创建 `core/` re-export 文件；
   - 创建 `mobile/simple/` 与 `mobile/complex/` 包装组件；
   - 更新 `index.js` 导出；
   - 验证现有示例是否仍然能正常运行。
3. **[x] Step 2：阶段二（统一 Core，移动端）**
   - 将 Vuex 模块命名规范化为 `pdfReaderCore`；
   - 在 Complex 中完成命名替换并测试通过；
   - 重构 Simple：改用 Core 加载与渲染；
   - 删除/收敛 Simple 中重复的 pdf.js 逻辑；
   - （可选）补充/更新相关单元测试与示例。
4. **[ ] Step 3：阶段三（Desktop 准备）**
   - **[x] 在 `components/pdf/desktop/complex/index.vue` 中实现 `DesktopComplexPdfReader` MVP 组件：**
     - 复用 `pdfReaderCore` 与 `core/pdf-utils`，在 props / 事件 / ref 方法层面与 `mobile/complex/index.vue` 保持基本一致；
     - 使用 Element 组件（如 `el-input`、`el-dialog`）重绘底部工具栏与 Outline/Thumbnail 容器布局，引入 PC 端特有的内容区域推开逻辑；
     - 已在 `components/pdf/index.js` 中导出 `DesktopComplexPdfReader`，并新增 `/desktop-complex-pdf-reader-demo` 路由与 `DesktopComplexReaderDemo` 页面用于基本验证；
   - **[x] 将 Desktop 版 PdfViewport / Outline / Thumbnail 相关子组件下沉至 `components/pdf/desktop/complex/components/` 目录：**
     - PdfViewport 在 `components/pdf/desktop/complex/components/pdfReaderCore/index.vue` 中落地，基于 `ResizeObserver` + `fitPageOnce` 实现 PC 端「一屏一页」的首版缩放策略，并统一承接文档加载、目录与缩略图相关对外方法；
     - OutlineWrapper / OutlineContent、ThumbnailWrapper / ThumbnailContent 以及 tree 组件在 Desktop 路径下提供与 mobile 版 OutlinePanel / ThumbnailPanel 等价的目录与缩略图能力，实现与当前页的双向联动与浮层/抽屉内的自适应布局；
   - **[ ] 验证多 UI 变体（Mobile + Desktop）共存时 Core 行为是否符合预期；**
   - **[ ] 在 UI 设计稿就绪后，再迭代 Desktop 的布局与样式，并按需要扩展 Desktop 专属高级功能（例如更丰富的键盘/鼠标交互、多窗格布局等）。**

## 5. 潜在风险与坑位

### 5.1 Vuex 状态隔离问题

- 当前 Core Vuex 模块是**全局单例**：
  - 默认假设一个应用中同时只存在一个“当前 PDF 文档”。
- 风险：
  - 如果未来需要在同一页面上同时挂载多个 Reader 实例（例如一个比较视图，两份 PDF 并排），会出现：
    - `currentPage`、`scale` 等状态互相覆盖；
    - 不同 Reader 的 `loadDocument` 互相抢占同一模块的状态。
- 潜在解决方案（可按需求演进）：
  1. **动态模块命名空间**：为每个 Reader 实例注册一个带唯一 ID 的 Vuex 模块（如 `pdfReaderCore/a`, `pdfReaderCore/b`）。
  2. **局部 store + provide/inject**：为每个 Reader 创建局部 store，将 Core 逻辑迁为可复用的 store factory。
  3. **明确约束**：在文档中明确“当前版本仅支持单实例 Reader”，在确有多实例需求时再演进。

### 5.2 事件与对外 API 的兼容性

- Simple 目前可能对外暴露了一些事件和 props（如 `@loading-start`、`@progress`、`@loaded` 等）。
- 在迁移到 Core 时，需要：
  - 保持事件名与触发时机尽量不变；
  - 如果行为必须调整，应在文档中说明，并在必要时做兼容层（例如同时触发新旧事件）。

### 5.3 渲染性能与顺序问题

- Simple 的“多页竖排模式”在大文档下，可能存在：
  - 首屏渲染慢；
  - 滚动时页面大量渲染导致卡顿。
- 统一 Core 后，可以考虑：
  - 使用 Core 的 pendingQueue 或类似机制做**渲染任务队列**；
  - 为 Simple 引入简单的**懒加载/虚拟列表**（只渲染视口附近的页面）。

### 5.4 引用路径与循环依赖

- 在移动 Core 文件、调整目录结构时，需要避免：
  - 组件反向引用 Core 的 UI 代码，造成循环依赖；
  - 大量相对路径修改后遗漏某些 import。
- 建议：
  - 先通过 re-export 的方式稳定对外路径（`components/pdf/core/*`）；
  - 再分步移动内部实现文件，逐步替换 import 源。

### 5.5 测试与回归风险

- 涉及文档加载与渲染的重构更容易出现“功能看起来 OK，但某些边界行为变化”的情况，例如：
  - 特殊 PDF（加密、大页数、带附件/链接）加载行为变化；
  - 某些自定义回调不再触发或顺序改变。
- 建议：
  - 为典型场景补充 demo 与测试（小文档、大文档、异常文档）；
  - 重构后逐一对比 Simple/Complex 的关键交互（加载、翻页、缩放、错误处理）。

## 6. 验收标准（按阶段）

- **阶段一：**
  - 现有 Simple/Complex demo 全部正常运行；
  - 新组件名 `MobileSimplePdfReader` / `MobileComplexPdfReader` 可用；
  - 新的 `core/` 入口可以被引入且无运行时错误。
- **阶段二：**
  - Simple 不再直接依赖 pdf.js，而是全部通过 Core（Vuex + utils）；
  - Simple 与 Complex 加载同一文档时，页数、错误处理、缩放行为一致；
  - 关键事件（加载、进度、完成、错误）的行为满足原有或文档约定。
- **阶段三：**
  - 至少一个 Desktop Reader 最小版本实现并通过基本交互测试；
  - 同一页面上存在一个 Mobile Reader 与一个 Desktop Reader 时，Core 行为正常；
  - 后续新增 Desktop 变体时，仅需在 UI 层开发，不需要更改 Core。

