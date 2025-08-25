# 组件系统

> **相关源文件**
> * [.stylelintrc](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/.stylelintrc)
> * [examples/mobile-viewer/README.md](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/README.md)
> * [examples/mobile-viewer/viewer.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.css)
> * [examples/mobile-viewer/viewer.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.html)
> * [examples/mobile-viewer/viewer.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.mjs)
> * [test/unit/pdf_viewer.component_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/pdf_viewer.component_spec.js)
> * [test/xfa_layer_builder_overrides.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/xfa_layer_builder_overrides.css)
> * [web/debugger.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/debugger.css)
> * [web/genericl10n.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/genericl10n.js)
> * [web/l10n.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/l10n.js)
> * [web/pdf_scripting_manager.component.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_scripting_manager.component.js)
> * [web/pdf_single_page_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_single_page_viewer.js)
> * [web/pdf_viewer.component.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_viewer.component.js)

组件系统提供模块化、可重用的 PDF.js 构建块，可以组合成自定义查看器并集成到第三方应用程序中。该系统使开发人员能够使用特定的 PDF.js 功能，而无需完整的 Web 查看器应用程序。

有关完整 Web 查看器应用程序的信息，请参阅 [Web 查看器应用程序](/Mr-xzq/pdf.js-4.4.168/3-web-viewer-application)。有关平台特定集成的详细信息，请参阅 [平台扩展](/Mr-xzq/pdf.js-4.4.168/7-platform-extensions)。

## 目的和架构

组件系统服务于三个主要目的：

1. **模块化集成**: 能够将特定的 PDF.js 功能嵌入到现有应用程序中
2. **移动端优化**: 提供针对移动端和触摸界面优化的精简组件
3. **平台抽象**: 提供在不同 JavaScript 环境中工作的通用实现

该系统围绕可组合组件构建，这些组件可以独立使用或组合以创建自定义 PDF 查看体验。

### 组件导出结构

```mermaid
flowchart TD

SinglePageViewer["PDFSinglePageViewer<br>单页显示"]
ComponentExport["pdf_viewer.component.js<br>中央导出点"]
PDFViewer["PDFViewer<br>主文档容器"]
PDFPageView["PDFPageView<br>单个页面渲染"]
EventBus["EventBus<br>组件通信"]
LinkService["PDFLinkService<br>导航处理"]
AnnotationBuilder["AnnotationLayerBuilder<br>交互元素"]
TextBuilder["TextLayerBuilder<br>文本选择/搜索"]
XfaBuilder["XfaLayerBuilder<br>XFA 表单渲染"]
StructBuilder["StructTreeLayerBuilder<br>可访问性"]
FindController["PDFFindController<br>文本搜索"]
History["PDFHistory<br>导航历史"]
ProgressBar["ProgressBar<br>加载进度"]
DownloadManager["DownloadManager<br>文件操作"]
ScriptingManager["PDFScriptingManager<br>PDF JavaScript"]

subgraph subGraph4 ["组件 API"]
    ComponentExport
    ComponentExport --> PDFViewer
    ComponentExport --> PDFPageView
    ComponentExport --> EventBus
    ComponentExport --> LinkService
    ComponentExport --> AnnotationBuilder
    ComponentExport --> TextBuilder
    ComponentExport --> XfaBuilder
    ComponentExport --> StructBuilder
    ComponentExport --> FindController
    ComponentExport --> History
    ComponentExport --> ProgressBar
    ComponentExport --> DownloadManager
    ComponentExport --> SinglePageViewer
    ComponentExport --> ScriptingManager

subgraph subGraph3 ["专用查看器"]
    SinglePageViewer
    ScriptingManager
end

subgraph subGraph2 ["实用组件"]
    FindController
    History
    ProgressBar
    DownloadManager
end

subgraph subGraph1 ["层构建器"]
    AnnotationBuilder
    TextBuilder
    XfaBuilder
    StructBuilder
end

subgraph subGraph0 ["核心组件"]
    PDFViewer
    PDFPageView
    EventBus
    LinkService
end
end
```

来源: [web/pdf_viewer.component.js L49-L72](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_viewer.component.js#L49-L72)

 [test/unit/pdf_viewer.component_spec.js L48-L71](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/pdf_viewer.component_spec.js#L48-L71)

## 核心组件分类

组件系统按功能分为几个主要类别：

| 组件类别 | 类 | 目的 |
| --- | --- | --- |
| **查看器组件** | `PDFViewer`, `PDFSinglePageViewer`, `PDFPageView` | 文档显示和页面渲染 |
| **层构建器** | `AnnotationLayerBuilder`, `TextLayerBuilder`, `XfaLayerBuilder`, `StructTreeLayerBuilder` | 内容层管理 |
| **导航** | `PDFLinkService`, `SimpleLinkService`, `PDFHistory` | 文档导航和历史 |
| **搜索和交互** | `PDFFindController`, `PDFScriptingManager` | 文本搜索和 JavaScript 执行 |
| **实用工具** | `EventBus`, `ProgressBar`, `DownloadManager` | 通信和文件操作 |
| **本地化** | `GenericL10n` | 国际化支持 |

### PDFSinglePageViewer 实现

`PDFSinglePageViewer` 是针对移动端和简化用例优化的专用查看器：

```mermaid
flowchart TD

SinglePageViewer["PDFSinglePageViewer<br>(pdf_single_page_viewer.js)"]
Container["container<br>(DOM 元素)"]
EventBus["eventBus<br>(事件通信)"]
LinkService["linkService<br>(导航)"]
L10n["l10n<br>(本地化)"]
RenderingQueue["renderingQueue<br>(渲染队列)"]
PageView["_pages[0]<br>(单个 PDFPageView)"]
CurrentPageNumber["_currentPageNumber<br>(当前页码)"]
PagesCount["_pagesCount<br>(总页数)"]
Document["_pdfDocument<br>(PDF 文档)"]

SinglePageViewer --> Container
SinglePageViewer --> EventBus
SinglePageViewer --> LinkService
SinglePageViewer --> L10n
SinglePageViewer --> RenderingQueue
SinglePageViewer --> PageView
SinglePageViewer --> CurrentPageNumber
SinglePageViewer --> PagesCount
SinglePageViewer --> Document

subgraph subGraph1 ["状态管理"]
    CurrentPageNumber
    PagesCount
    Document
end

subgraph subGraph0 ["核心依赖"]
    Container
    EventBus
    LinkService
    L10n
    RenderingQueue
    PageView
end
```

**关键特性**:
- **简化的 API**: 专注于单页显示，减少复杂性
- **移动端优化**: 针对触摸交互和小屏幕优化
- **内存效率**: 一次只渲染一个页面，减少内存使用
- **事件驱动**: 使用 EventBus 进行组件间通信

来源: [web/pdf_single_page_viewer.js L49-L127](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_single_page_viewer.js#L49-L127)

 [examples/mobile-viewer/viewer.mjs L89-L156](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.mjs#L89-L156)

## 层构建器系统

层构建器负责在 PDF 页面上创建和管理不同类型的内容层：

### 层构建器架构

```mermaid
flowchart TD

PageView["PDFPageView<br>(页面容器)"]
AnnotationBuilder["AnnotationLayerBuilder<br>(注释层)"]
TextBuilder["TextLayerBuilder<br>(文本层)"]
XfaBuilder["XfaLayerBuilder<br>(XFA 表单层)"]
StructBuilder["StructTreeLayerBuilder<br>(结构树层)"]
AnnotationLayer["AnnotationLayer<br>(交互元素)"]
TextLayer["TextLayer<br>(文本选择)"]
XfaLayer["XfaLayer<br>(表单渲染)"]
StructTree["StructTree<br>(可访问性)"]
EventBus["EventBus<br>(事件通信)"]
DownloadManager["DownloadManager<br>(文件下载)"]
AnnotationStorage["AnnotationStorage<br>(表单数据)"]

PageView --> AnnotationBuilder
PageView --> TextBuilder
PageView --> XfaBuilder
PageView --> StructBuilder
AnnotationBuilder --> AnnotationLayer
TextBuilder --> TextLayer
XfaBuilder --> XfaLayer
StructBuilder --> StructTree
AnnotationBuilder --> EventBus
AnnotationBuilder --> DownloadManager
AnnotationBuilder --> AnnotationStorage

subgraph subGraph2 ["渲染层"]
    AnnotationLayer
    TextLayer
    XfaLayer
    StructTree
end

subgraph subGraph1 ["层构建器"]
    AnnotationBuilder
    TextBuilder
    XfaBuilder
    StructBuilder
end

subgraph subGraph0 ["页面容器"]
    PageView
    EventBus
    DownloadManager
    AnnotationStorage
end
```

**层构建器职责**:

1. **AnnotationLayerBuilder**: 处理链接、表单字段、注释的交互
2. **TextLayerBuilder**: 管理文本选择、搜索高亮和复制功能
3. **XfaLayerBuilder**: 渲染 XFA（XML Forms Architecture）表单
4. **StructTreeLayerBuilder**: 提供可访问性支持和结构化内容

来源: [web/annotation_layer_builder.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_layer_builder.js)

 [web/text_layer_builder.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/text_layer_builder.js)

 [web/xfa_layer_builder.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/xfa_layer_builder.js)

## 移动端优化组件

项目包含专门针对移动设备优化的组件实现：

### 移动端查看器特性

```mermaid
flowchart TD

MobileViewer["移动端查看器<br>(examples/mobile-viewer/)"]
TouchGestures["触摸手势<br>(缩放、滑动)"]
ResponsiveUI["响应式 UI<br>(自适应布局)"]
OptimizedRendering["优化渲染<br>(内存管理)"]
SimplifiedControls["简化控件<br>(最小化 UI)"]
PerformanceOpts["性能优化<br>(懒加载)"]

MobileViewer --> TouchGestures
MobileViewer --> ResponsiveUI
MobileViewer --> OptimizedRendering
MobileViewer --> SimplifiedControls
MobileViewer --> PerformanceOpts

subgraph subGraph1 ["用户体验优化"]
    TouchGestures
    ResponsiveUI
    SimplifiedControls
end

subgraph subGraph0 ["性能优化"]
    OptimizedRendering
    PerformanceOpts
end
```

**移动端特定功能**:

- **触摸手势支持**: 双指缩放、滑动翻页
- **响应式设计**: 适应不同屏幕尺寸
- **内存优化**: 按需加载和卸载页面
- **简化界面**: 减少不必要的 UI 元素
- **性能调优**: 针对移动设备的渲染优化

来源: [examples/mobile-viewer/viewer.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.html)

 [examples/mobile-viewer/viewer.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.css)

 [examples/mobile-viewer/viewer.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.mjs)

## 组件集成模式

组件系统支持多种集成模式，适应不同的使用场景：

### 1. 独立组件使用

```javascript
// 使用单个组件
import { PDFSinglePageViewer, EventBus } from 'pdfjs-dist/web/pdf_viewer.component.js';

const eventBus = new EventBus();
const viewer = new PDFSinglePageViewer({
  container: document.getElementById('viewerContainer'),
  eventBus: eventBus
});
```

### 2. 组合式集成

```javascript
// 组合多个组件
import {
  PDFViewer,
  PDFFindController,
  PDFLinkService,
  EventBus
} from 'pdfjs-dist/web/pdf_viewer.component.js';

const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
const findController = new PDFFindController({ linkService, eventBus });
const viewer = new PDFViewer({
  container,
  eventBus,
  linkService,
  findController
});
```

## 组件测试和验证

组件系统包含完整的测试套件，确保各组件的独立性和集成稳定性：

```javascript
// 组件测试示例
describe('PDFViewer Component', () => {
  it('should initialize with required dependencies', () => {
    const eventBus = new EventBus();
    const viewer = new PDFViewer({ container, eventBus });
    expect(viewer.eventBus).toBe(eventBus);
  });
});
```

来源: [test/unit/pdf_viewer.component_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/pdf_viewer.component_spec.js)
