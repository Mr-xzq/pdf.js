# Web 查看器应用程序

> **相关源文件**
> * [extensions/chromium/preferences_schema.json](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/chromium/preferences_schema.json)
> * [web/app.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js)
> * [web/app_options.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js)
> * [web/chromecom.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/chromecom.js)
> * [web/download_manager.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/download_manager.js)
> * [web/firefox_print_service.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefox_print_service.js)
> * [web/firefoxcom.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefoxcom.js)
> * [web/genericcom.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/genericcom.js)
> * [web/password_prompt.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/password_prompt.js)
> * [web/pdf_document_properties.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_document_properties.js)
> * [web/pdf_print_service.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_print_service.js)
> * [web/preferences.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/preferences.js)
> * [web/viewer.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.css)
> * [web/viewer.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.html)
> * [web/viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.js)

## 目的和范围

Web 查看器应用程序基于核心 PDF 处理引擎构建，提供完整的基于浏览器的 PDF 查看体验。它包括用户界面、应用程序编排、平台抽象以及用户在浏览器中查看 PDF 时交互的所有功能。

本文档涵盖应用程序级架构、组件系统和平台集成。有关底层 PDF 解析和渲染系统的信息，请参阅 [核心 PDF 处理引擎](/Mr-xzq/pdf.js-4.4.168/2-core-pdf-processing-engine)。有关交互式注释编辑的详细信息，请参阅 [注释编辑器系统](/Mr-xzq/pdf.js-4.4.168/4-annotation-editor-system)。

## 应用程序架构

Web 查看器应用程序由 `PDFViewerApplication` 对象编排，它作为所有查看器组件、服务和生命周期管理的中央协调器。

### 核心应用程序对象

```mermaid
flowchart TD

App["PDFViewerApplication<br>(web/app.js:98)"]
Init["initialize()<br>(web/app.js:184)"]
Run["run()<br>(web/app.js:656)"]
Components["_initializeViewerComponents()<br>(web/app.js:392)"]
AppOptions["AppOptions<br>(web/app_options.js:466)"]
Preferences["Preferences<br>(web/preferences.js:23)"]
Config["getViewerConfiguration()<br>(web/viewer.js:37)"]
EventBus["EventBus<br>(web/event_utils.js)"]
ExtServices["ExternalServices<br>(web/external_services.js)"]
RenderQueue["PDFRenderingQueue<br>(web/pdf_rendering_queue.js)"]
LinkService["PDFLinkService<br>(web/pdf_link_service.js)"]
PDFDoc["pdfDocument<br>(PDFDocumentProxy)"]
PDFViewer["pdfViewer<br>(PDFViewer)"]
LoadingTask["pdfLoadingTask<br>(PDFDocumentLoadingTask)"]

Init --> AppOptions
Components --> EventBus
Components --> ExtServices
Components --> RenderQueue
Components --> LinkService
Run --> Config
Run --> PDFDoc
App --> PDFViewer
App --> LoadingTask

subgraph subGraph3 ["PDF 引擎集成"]
    PDFDoc
    PDFViewer
    LoadingTask
end

subgraph subGraph2 ["核心服务"]
    EventBus
    ExtServices
    RenderQueue
    LinkService
end

subgraph subGraph1 ["配置系统"]
    AppOptions
    Preferences
    Config
end

subgraph PDFViewerApplication ["PDFViewerApplication"]
    App
    Init
    Run
    Components
    App --> Init
    Init --> Components
end
```

`PDFViewerApplication` 对象维护对所有主要组件的引用，并处理从初始化到文档加载和清理的应用程序生命周期。

来源: [web/app.js L98-L182](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L98-L182)

 [web/viewer.js L37-L180](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.js#L37-L180)

 [web/app_options.js L466-L532](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L466-L532)

### 组件初始化流程

```mermaid
sequenceDiagram
  participant viewer.js
  participant PDFViewerApplication
  participant Preferences
  participant ExternalServices
  participant UI Components

  viewer.js->>PDFViewerApplication: run(config)
  PDFViewerApplication->>Preferences: new Preferences()
  PDFViewerApplication->>PDFViewerApplication: initialize(config)
  PDFViewerApplication->>Preferences: initializedPromise
  PDFViewerApplication->>ExternalServices: createL10n()
  PDFViewerApplication->>PDFViewerApplication: _initializeViewerComponents()
  PDFViewerApplication->>UI Components: 创建所有 UI 组件
  PDFViewerApplication->>PDFViewerApplication: bindEvents()
  PDFViewerApplication->>PDFViewerApplication: bindWindowEvents()
  PDFViewerApplication->>PDFViewerApplication: open({url: file})
```

初始化过程遵循严格的顺序，确保在查看器变为交互式之前正确设置所有依赖项。

来源: [web/app.js L656-L752](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L656-L752)

 [web/app.js L184-L260](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L184-L260)

 [web/app.js L392-L654](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L392-L654)

## 组件系统

Web 查看器应用程序由几个主要组件类别组成，它们协同工作以提供完整的查看体验。

### UI 组件架构

```mermaid
flowchart TD

OuterContainer["outerContainer<br>(web/viewer.html:96)"]
SidebarContainer["sidebarContainer<br>(web/viewer.html:98)"]
MainContainer["mainContainer<br>(web/viewer.html:140)"]
ViewerContainer["viewerContainer<br>(web/viewer.html:308)"]
PrimaryToolbar["Toolbar<br>(web/toolbar.js)"]
SecondaryToolbar["SecondaryToolbar<br>(web/secondary_toolbar.js)"]
FindBar["PDFFindBar<br>(web/pdf_find_bar.js)"]
EditorParams["AnnotationEditorParams<br>(web/annotation_editor_params.js)"]
PDFSidebar["PDFSidebar<br>(web/pdf_sidebar.js)"]
ThumbnailViewer["PDFThumbnailViewer<br>(web/pdf_thumbnail_viewer.js)"]
OutlineViewer["PDFOutlineViewer<br>(web/pdf_outline_viewer.js)"]
AttachmentViewer["PDFAttachmentViewer<br>(web/pdf_attachment_viewer.js)"]
LayerViewer["PDFLayerViewer<br>(web/pdf_layer_viewer.js)"]
PDFViewer["PDFViewer<br>(web/pdf_viewer.js)"]
PageViews["PDFPageView[]<br>(单个页面)"]
TextLayer["TextLayer<br>(文本选择)"]
AnnotLayer["AnnotationLayer<br>(表单和链接)"]

SidebarContainer --> PDFSidebar
MainContainer --> PrimaryToolbar
MainContainer --> SecondaryToolbar
MainContainer --> FindBar
MainContainer --> EditorParams
ViewerContainer --> PDFViewer

subgraph subGraph3 ["文档显示"]
    PDFViewer
    PageViews
    TextLayer
    AnnotLayer
    PDFViewer --> PageViews
    PageViews --> TextLayer
    PageViews --> AnnotLayer
end

subgraph subGraph2 ["侧边栏组件"]
    PDFSidebar
    ThumbnailViewer
    OutlineViewer
    AttachmentViewer
    LayerViewer
    PDFSidebar --> ThumbnailViewer
    PDFSidebar --> OutlineViewer
    PDFSidebar --> AttachmentViewer
    PDFSidebar --> LayerViewer
end

subgraph subGraph1 ["工具栏组件"]
    PrimaryToolbar
    SecondaryToolbar
    FindBar
    EditorParams
end

subgraph subGraph0 ["主容器结构"]
    OuterContainer
    SidebarContainer
    MainContainer
    ViewerContainer
    OuterContainer --> SidebarContainer
    OuterContainer --> MainContainer
    MainContainer --> ViewerContainer
end
```

每个 UI 组件都在 `PDFViewerApplication` 的 `_initializeViewerComponents()` 阶段实例化和管理。

来源: [web/app.js L392-L654](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L392-L654)

 [web/viewer.html L96-L411](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.html#L96-L411)

 [web/toolbar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/toolbar.js)

 [web/pdf_sidebar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_sidebar.js)

### 服务组件架构

```mermaid
flowchart TD

PDFHistory["PDFHistory<br>(web/pdf_history.js)"]
ViewHistory["ViewHistory<br>(web/view_history.js)"]
PresentationMode["PDFPresentationMode<br>(web/pdf_presentation_mode.js)"]
ExternalServices["ExternalServices<br>(平台特定)"]
PrintService["PDFPrintServiceFactory<br>(web/pdf_print_service.js)"]
Preferences["Preferences<br>(平台特定)"]
MLManager["MLManager<br>(机器学习)"]
DocumentProperties["PDFDocumentProperties<br>(web/pdf_document_properties.js:56)"]
PasswordPrompt["PasswordPrompt<br>(web/password_prompt.js:32)"]
AltTextManager["AltTextManager<br>(web/alt_text_manager.js)"]
OverlayManager["OverlayManager<br>(web/overlay_manager.js)"]
DownloadManager["DownloadManager<br>(web/download_manager.js:49)"]
ScriptingManager["PDFScriptingManager<br>(web/pdf_scripting_manager.js)"]
FindController["PDFFindController<br>(web/pdf_find_controller.js)"]
CursorTools["PDFCursorTools<br>(web/pdf_cursor_tools.js)"]

subgraph subGraph3 ["状态管理"]
    PDFHistory
    ViewHistory
    PresentationMode
end

subgraph subGraph2 ["平台服务"]
    ExternalServices
    PrintService
    Preferences
    MLManager
end

subgraph subGraph1 ["对话框服务"]
    DocumentProperties
    PasswordPrompt
    AltTextManager
    OverlayManager
end

subgraph subGraph0 ["核心服务"]
    DownloadManager
    ScriptingManager
    FindController
    CursorTools
end
```

服务组件提供专门的功能，通常在应用程序上下文中作为单例实例化。

来源: [web/app.js L421-L653](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L421-L653)

 [web/download_manager.js L49-L126](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/download_manager.js#L49-L126)

 [web/pdf_document_properties.js L56-L327](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_document_properties.js#L56-L327)

## 平台集成策略

Web 查看器应用程序使用平台抽象层来支持不同的部署目标，同时维护统一的代码库。

### 平台抽象层

```mermaid
flowchart TD

PDFViewerApp["PDFViewerApplication<br>(web/app.js:98)"]
BaseExtServices["BaseExternalServices<br>(web/external_services.js)"]
BasePreferences["BasePreferences<br>(web/preferences.js:23)"]
GenericCom["GenericCom<br>(web/genericcom.js)"]
GenericServices["ExternalServices<br>(web/genericcom.js:40)"]
GenericPrefs["Preferences<br>(web/genericcom.js:30)"]
GenericL10n["GenericL10n<br>(web/genericl10n.js)"]
FirefoxCom["FirefoxCom<br>(web/firefoxcom.js:33)"]
FirefoxServices["ExternalServices<br>(web/firefoxcom.js:311)"]
FirefoxPrefs["Preferences<br>(web/firefoxcom.js:149)"]
FirefoxDownload["DownloadManager<br>(web/firefoxcom.js:82)"]
ChromeCom["ChromeCom<br>(web/chromecom.js:55)"]
ChromeServices["ExternalServices<br>(web/chromecom.js)"]
ChromePrefs["Preferences<br>(web/chromecom.js:330)"]
ChromeDownload["DownloadManager<br>(web/chromecom.js)"]

BaseExtServices --> GenericServices
BaseExtServices --> FirefoxServices
BaseExtServices --> ChromeServices
BasePreferences --> GenericPrefs
BasePreferences --> FirefoxPrefs
BasePreferences --> ChromePrefs

subgraph subGraph3 ["Chrome 平台"]
    ChromeCom
    ChromeServices
    ChromePrefs
    ChromeDownload
    ChromeServices --> ChromeCom
end

subgraph subGraph2 ["Firefox 平台"]
    FirefoxCom
    FirefoxServices
    FirefoxPrefs
    FirefoxDownload
    FirefoxServices --> FirefoxCom
end

subgraph subGraph1 ["通用平台"]
    GenericCom
    GenericServices
    GenericPrefs
    GenericL10n
    GenericServices --> GenericL10n
end

subgraph subGraph0 ["共享应用程序核心"]
    PDFViewerApp
    BaseExtServices
    BasePreferences
    PDFViewerApp --> BaseExtServices
    PDFViewerApp --> BasePreferences
end
```

平台特定的实现通过条件编译指令在构建时选择。

来源: [web/external_services.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/external_services.js)

 [web/firefoxcom.js L311-L419](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefoxcom.js#L311-L419)

 [web/chromecom.js L330-L428](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/chromecom.js#L330-L428)

 [web/genericcom.js L40-L57](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/genericcom.js#L40-L57)

### 配置管理

```mermaid
flowchart TD

DefaultOptions["defaultOptions<br>(web/app_options.js:57)"]
UserOptions["userOptions<br>(web/app_options.js:424)"]
BrowserDefaults["browserDefaults<br>(兼容性参数)"]
Preferences["平台首选项<br>(持久存储)"]
Get["AppOptions.get()<br>(web/app_options.js:471)"]
Set["AppOptions.set()<br>(web/app_options.js:490)"]
GetAll["AppOptions.getAll()<br>(web/app_options.js:475)"]
SetAll["AppOptions.setAll()<br>(web/app_options.js:494)"]
Browser["OptionKind.BROWSER<br>(web/app_options.js:45)"]
Viewer["OptionKind.VIEWER<br>(web/app_options.js:46)"]
API["OptionKind.API<br>(web/app_options.js:47)"]
Worker["OptionKind.WORKER<br>(web/app_options.js:48)"]
Preference["OptionKind.PREFERENCE<br>(web/app_options.js:49)"]

DefaultOptions --> Get
UserOptions --> Get
BrowserDefaults --> Get
Preferences --> GetAll
Set --> UserOptions
SetAll --> UserOptions
Get --> Browser
Get --> Viewer
Get --> API
Get --> Worker
Get --> Preference

subgraph subGraph2 ["选项类别"]
    Browser
    Viewer
    API
    Worker
    Preference
end

subgraph subGraph1 ["AppOptions API"]
    Get
    Set
    GetAll
    SetAll
end

subgraph subGraph0 ["配置源"]
    DefaultOptions
    UserOptions
    BrowserDefaults
    Preferences
end
```

配置系统提供分层方法，其中用户首选项覆盖默认值，并根据需要应用平台特定值。

来源: [web/app_options.js L57-L532](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L57-L532)

 [web/preferences.js L23-L210](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/preferences.js#L23-L210)

## 事件系统和通信

Web 查看器应用程序使用集中式事件系统来协调组件之间的通信。

### EventBus 架构

```mermaid
flowchart TD

EventBus["EventBus<br>(web/event_utils.js)"]
FirefoxEventBus["FirefoxEventBus<br>(web/event_utils.js)"]
PDFViewer["PDFViewer<br>(页面事件)"]
Toolbar["Toolbar<br>(UI 事件)"]
Sidebar["PDFSidebar<br>(导航事件)"]
FindController["PDFFindController<br>(搜索事件)"]
LinkService["PDFLinkService<br>(链接事件)"]
App["PDFViewerApplication<br>(app.js:2565-2802)"]
Components["UI 组件<br>(各种监听器)"]
Services["服务组件<br>(各种监听器)"]
Platform["平台服务<br>(外部通信)"]
PageEvents["pagesinit, pagechanging<br>pagesloaded, pagerendered"]
NavEvents["rotationchanging<br>scalechanging, scrollmodechanged"]
SearchEvents["find, findbarclose<br>updatefindmatchescount"]
DocumentEvents["documentloaded<br>documentinit, annotationeditorstateschanged"]

PDFViewer --> EventBus
Toolbar --> EventBus
Sidebar --> EventBus
FindController --> EventBus
LinkService --> EventBus
EventBus --> App
EventBus --> Components
EventBus --> Services
EventBus --> Platform
EventBus --> PageEvents
EventBus --> NavEvents
EventBus --> SearchEvents
EventBus --> DocumentEvents

subgraph subGraph3 ["关键事件类型"]
    PageEvents
    NavEvents
    SearchEvents
    DocumentEvents
end

subgraph subGraph2 ["事件消费者"]
    App
    Components
    Services
    Platform
end

subgraph subGraph1 ["事件生产者"]
    PDFViewer
    Toolbar
    Sidebar
    FindController
    LinkService
end

subgraph subGraph0 ["事件总线核心"]
    EventBus
    FirefoxEventBus
end
```

事件系统在组件之间实现松耦合，同时在整个应用程序中维护协调行为。

来源: [web/event_utils.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/event_utils.js)

 [web/app.js L2565-L2802](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L2565-L2802)

 [web/pdf_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_viewer.js)

### 文档生命周期管理

```mermaid
sequenceDiagram
  participant User Action
  participant PDFViewerApplication
  participant PDFDocumentLoadingTask
  participant PDFDocument
  participant PDFViewer
  participant UI Components

  User Action->>PDFViewerApplication: open({url})
  PDFViewerApplication->>PDFViewerApplication: close() [如果有之前的文档]
  PDFViewerApplication->>PDFDocumentLoadingTask: getDocument(params)
  PDFDocumentLoadingTask->>PDFViewerApplication: onProgress 事件
  PDFDocumentLoadingTask->>PDFDocument: promise 解析
  PDFViewerApplication->>PDFViewerApplication: load(pdfDocument)
  PDFViewerApplication->>PDFViewer: setDocument(pdfDocument)
  PDFViewerApplication->>UI Components: setDocument(pdfDocument)
  PDFViewerApplication->>PDFViewerApplication: _initializeViewerComponents()
  PDFViewer->>PDFViewerApplication: pagesinit 事件
  PDFViewerApplication->>PDFViewerApplication: setInitialView()
  PDFViewerApplication->>UI Components: 文档就绪
```

文档生命周期经过精心管理，确保在切换 PDF 文档时进行适当的清理和初始化。

来源: [web/app.js L1005-L1093](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L1005-L1093)

 [web/app.js L1139-L1254](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L1139-L1254)

 [web/app.js L932-L997](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L932-L997)

## 打印和导出服务

应用程序通过平台感知的打印服务系统提供全面的打印功能。

### 打印服务架构

```mermaid
flowchart TD

PrintFactory["PDFPrintServiceFactory<br>(web/pdf_print_service.js:349)"]
GenericPrint["PDFPrintService<br>(web/pdf_print_service.js:80)"]
FirefoxPrint["FirefoxPrintService<br>(web/firefox_print_service.js:116)"]
Layout["layout()<br>(创建打印布局)"]
RenderPages["renderPages()<br>(渲染到画布)"]
PerformPrint["performPrint()<br>(调用浏览器打印)"]
Cleanup["destroy()<br>(清理资源)"]
PrintResolution["printResolution<br>(默认 150 DPI)"]
PageSizes["pagesOverview<br>(页面尺寸)"]
AnnotationStorage["printAnnotationStorage<br>(表单数据)"]
OptionalContent["optionalContentConfig<br>(图层可见性)"]

GenericPrint --> Layout
Layout --> PrintResolution
Layout --> PageSizes
RenderPages --> AnnotationStorage
RenderPages --> OptionalContent

subgraph subGraph2 ["打印配置"]
    PrintResolution
    PageSizes
    AnnotationStorage
    OptionalContent
end

subgraph subGraph1 ["打印流程"]
    Layout
    RenderPages
    PerformPrint
    Cleanup
    Layout --> RenderPages
    RenderPages --> PerformPrint
    PerformPrint --> Cleanup
end

subgraph subGraph0 ["打印服务工厂"]
    PrintFactory
    GenericPrint
    FirefoxPrint
    PrintFactory --> GenericPrint
    PrintFactory --> FirefoxPrint
end
```

打印系统适应浏览器功能，在可用时使用原生 Firefox 打印 API，或回退到通用的基于画布的打印。

来源: [web/pdf_print_service.js L80-L241](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_print_service.js#L80-L241)

 [web/firefox_print_service.js L116-L194](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefox_print_service.js#L116-L194)

 [web/pdf_print_service.js L349-L374](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_print_service.js#L349-L374)

## 项目特定的架构特点

### 构建系统扩展

项目包含自定义的构建配置和测试服务器：

- **开发服务器**: `test/webserver.mjs` 提供本地开发环境
- **构建优化**: 针对不同平台的构建目标优化
- **资源管理**: 静态资源和依赖项的管理策略

### 平台兼容性

项目支持多平台部署：

- **通用浏览器**: 标准 Web 环境支持
- **移动端**: 触摸交互和响应式设计
- **扩展程序**: Chrome 和 Firefox 扩展支持
