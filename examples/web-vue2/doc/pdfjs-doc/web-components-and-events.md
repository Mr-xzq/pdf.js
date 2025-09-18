## web/ 组件与事件集成（基于官方查看器实现）

本篇基于仓库 web/ 目录的实际实现，梳理 PDF.js 官方查看器的关键组件、事件流与装配方式，帮助你在实际项目中复用其成熟做法：
- 组件：PDFViewer、PDFLinkService、PDFHistory、PDFRenderingQueue、PDFFindController、TextLayerBuilder、AnnotationLayerBuilder、EventBus
- 事件：pagesinit/pagesloaded/updateviewarea/pagechanging/scalechanging/rotationchanging 等
- 装配：如何把上述组件串起来工作（含 Vue2 场景建议）

### 组件关系总览

- EventBus（事件总线）
  - 所有 UI 与核心组件通过它订阅/派发事件（on/dispatch）。
- PDFViewer（页面容器/生命周期）
  - 负责 setDocument、页面实例化、滚动与缩放、触发渲染队列。
- PDFRenderingQueue（渲染调度）
  - 根据可视区域优先级调度页面/缩略图渲染。
- PDFLinkService（链接与导航）
  - 解析显式/命名目的地，驱动跳转与哈希、命名动作。
- PDFHistory（浏览器历史）
  - 同步 URL/回退前进，持久化当前位置。
- PDFFindController（全文检索）
  - 分页查找与高亮、向 UI 回报状态。
- TextLayerBuilder / AnnotationLayerBuilder（文本层/注释层）
  - 在页面之上构建交互层，支撑选择、查找高亮、表单/链接。

### EventBus 常用事件

- 页面就绪与列表加载
  - pagesinit：Viewer 初始化完成，可开始设置初始缩放/滚动。
  - pagesloaded：全部页面对象已创建（不代表已渲染完成）。
- 视图变化
  - updateviewarea：可视区域变化（滚动/缩放后），用于同步 URL 与历史。
  - pagechanging：当前页变化；scalechanging、rotationchanging：缩放/旋转变化。
  - scrollmodechanged、spreadmodechanged：滚动/跨页布局模式变化。
- 其他
  - optionalcontentconfigchanged：可选内容层（图层）配置变化。
  - pagerender / pagerendered：页面开始/完成主绘制（内部使用较多）。

源码摘录：
<augment_code_snippet path="web/pdf_viewer.js" mode="EXCERPT">
````js
this.eventBus.dispatch("pagechanging", { pageNumber: val });
this.eventBus.dispatch("scalechanging", { scale: newScale });
this.eventBus.dispatch("rotationchanging", { pagesRotation: rotation });
this.eventBus.dispatch("updateviewarea", { location: this._location });
this.eventBus.dispatch("scrollmodechanged", { mode });
this.eventBus.dispatch("spreadmodechanged", { mode });
this.eventBus.dispatch("pagesinit", { source: this });
````
</augment_code_snippet>

从 URL 触发检索：
<augment_code_snippet path="web/pdf_link_service.js" mode="EXCERPT">
````js
this.eventBus.dispatch("findfromurlhash", {
  source: this, query: phrase ? query : query.match(/\S+/g),
});
````
</augment_code_snippet>

Find 控件状态更新（供 UI 使用）：
<augment_code_snippet path="web/pdf_find_controller.js" mode="EXCERPT">
````js
this._eventBus.dispatch("updatefindcontrolstate", {
  source: this, state, matchesCount: this.#requestMatchesCount(),
});
````
</augment_code_snippet>

### PDFViewer 生命周期（setDocument 流程）

- 清理上一个文档：pagesdestroy、取消渲染、重置视图、断开 find/script。
- 预抓取第一页、OCC 图层配置与权限；创建页面视图 PDFPageView；挂渲染监听。
- 派发 pagesinit 与 pagesloaded 等事件；驱动第一次 update() 与渲染队列。

关键调用：
<augment_code_snippet path="web/pdf_viewer.js" mode="EXCERPT">
````js
setDocument(pdfDocument) {
  const firstPagePromise = pdfDocument.getPage(1);
  // ...
  eventBus.dispatch("pagesinit", { source: this });
  if (this.defaultRenderingQueue) this.update();
}
````
</augment_code_snippet>

可视区驱动渲染与历史：
<augment_code_snippet path="web/pdf_viewer.js" mode="EXCERPT">
````js
this.renderingQueue.renderHighestPriority(visible);
this.eventBus.dispatch("updateviewarea", { location: this._location });
````
</augment_code_snippet>

### 渲染队列（PDFRenderingQueue）

- renderHighestPriority(visible)：按优先级选择需要渲染的页面。
- renderView(view)：开始渲染，结束后再次触发调度以连续渲染。

<augment_code_snippet path="web/pdf_rendering_queue.js" mode="EXCERPT">
````js
view.draw().finally(() => {
  this.renderHighestPriority();
});
````
</augment_code_snippet>

实践建议：监听 pagesinit 后调用 viewer.update() 或设置初始缩放，避免早期强制渲染导致的抖动。

### 链接与导航（PDFLinkService）

- setDocument/setViewer/setHistory：注入依赖。
- goToDestination(dest)：支持命名目的地与显式数组，解析页码后滚动到视图。
- setHash(hash)：解析 URL 参数（page、zoom、nameddest、search 等）并执行跳转/检索。

<augment_code_snippet path="web/pdf_link_service.js" mode="EXCERPT">

````js
async goToDestination(dest) {
  // 解析命名/显式目的地，求得 pageNumber 后委托 viewer.scrollPageIntoView
}
````
</augment_code_snippet>

### 浏览器历史（PDFHistory）

- initialize({ fingerprint, updateUrl }): 首次加载/重加载时绑定事件并初始化当前状态。
- push({ namedDest, explicitDest, pageNumber })/pushPage(page)：入栈当前位置或目的地。
- back()/forward()：基于 window.history。

<augment_code_snippet path="web/pdf_history.js" mode="EXCERPT">

````js
initialize({ fingerprint, updateUrl }) { this._initialized = true; this.#bindEvents(); }
#pushOrReplaceState({ hash, page, rotation }, true);
window.history.pushState(newState, "", newUrl);
````
</augment_code_snippet>

推荐：以 PDFDocumentProxy.fingerprints[0] 作为 fingerprint；updateUrl 设为 true 可同步地址栏。

### 文本层与注释层（Builder）

- TextLayerBuilder.render(viewport, params)
  - 首次渲染创建文本映射与可访问性映射；后续更新仅做 transform。
  - 支持 hide()/show()/cancel() 控制。

<augment_code_snippet path="web/text_layer_builder.js" mode="EXCERPT">
````js
await this.#textLayer.render();
this.#renderingDone = true; this.#bindMouse(endOfContent);
````
</augment_code_snippet>

- AnnotationLayerBuilder.render(viewport, intent)
  - 拉取 annotations 与表单对象，调用核心注释层渲染，支持 Scripting。

<augment_code_snippet path="web/annotation_layer_builder.js" mode="EXCERPT">
````js
await this.annotationLayer.render({ annotations, linkService, annotationStorage });
````
</augment_code_snippet>

### 检索（PDFFindController）

- setDocument(pdf)：绑定文档后方可检索。
- 通过 EventBus 接收外部指令（例如工具栏/URL），在进度中分批计算匹配并高亮。
- UI 端监听 updatefindcontrolstate，显示当前/总计匹配数、高亮状态。

<augment_code_snippet path="web/pdf_find_controller.js" mode="EXCERPT">

````js
this.#updateUIState(state, this.#state.findPrevious);
this._eventBus.dispatch("updatefindcontrolstate", { /* ... */ });
````
</augment_code_snippet>

### Vue2 集成装配建议（示例骨架）

1) 构建核心对象并互相注入：
<augment_code_snippet mode="EXCERPT">
````js
import { EventBus } from "./web/event_utils";
import { PDFLinkService } from "./web/pdf_link_service";
import { PDFViewer } from "./web/pdf_viewer";
import { PDFHistory } from "./web/pdf_history";

const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
const viewer = new PDFViewer({ container, viewer, eventBus, linkService });
linkService.setViewer(viewer);
const history = new PDFHistory({ linkService, eventBus });
````
</augment_code_snippet>

2) 打开文档并初始化：
<augment_code_snippet mode="EXCERPT">
````js
const loadingTask = getDocument({ url });
const pdf = await loadingTask.promise;
viewer.setDocument(pdf);
linkService.setDocument(pdf);
history.initialize({ fingerprint: pdf.fingerprints[0], updateUrl: true });
````
</augment_code_snippet>

3) 监听事件同步 UI（页码/缩放/历史）：
<augment_code_snippet mode="EXCERPT">
````js
eventBus.on("pagechanging", ({ pageNumber }) => (vm.page = pageNumber));
eventBus.on("scalechanging", ({ scale }) => (vm.scale = scale));
eventBus.on("updateviewarea", ({ location }) => { /* 同步 URL/状态 */ });
````
</augment_code_snippet>

### 实战要点与坑位

- 优先级渲染：滚动时不要手动逐页 render，交给 PDFViewer + PDFRenderingQueue；监听 pagesinit 后再设定初始缩放，减少回流。
- 性能与缓存：长文档会强制 PAGE 模式以减轻 DOM 压力；内部使用 LRU 缓存（默认缓存大小 10，随可视页数动态调整）。
- URL 与导航：使用 PDFHistory.initialize({ updateUrl: true }) 保持地址栏同步；命名目的地（#nameddest）与显式数组均受支持。
- 检索：大文档检索为渐进式（FindState.PENDING）；UI 端要处理 WRAPPED/NOT_FOUND 等状态。
- 文本/注释层：viewport 变化需调用 builder.update 或重新 render；打印/高对比模式请注意 intent 与 pageColors。

如需我把本篇内容进一步拆为「搜索、历史、链接、渲染队列」四篇细化教程，请告诉我优先级。
