# Web Viewer Application

> **Relevant source files**
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

## Purpose and Scope

The Web Viewer Application provides a complete, browser-based PDF viewing experience built on top of the Core PDF Processing Engine. It includes the user interface, application orchestration, platform abstraction, and all the interactive features that end users interact with when viewing PDFs in browsers.

This document covers the application-level architecture, component system, and platform integration. For information about the underlying PDF parsing and rendering systems, see [Core PDF Processing Engine](/Mr-xzq/pdf.js-4.4.168/2-core-pdf-processing-engine). For details about interactive annotation editing, see [Annotation Editor System](/Mr-xzq/pdf.js-4.4.168/4-annotation-editor-system).

## Application Architecture

The Web Viewer Application is orchestrated by the `PDFViewerApplication` object, which serves as the central coordinator for all viewer components, services, and lifecycle management.

### Core Application Object

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

subgraph subGraph3 ["PDF Engine Integration"]
    PDFDoc
    PDFViewer
    LoadingTask
end

subgraph subGraph2 ["Core Services"]
    EventBus
    ExtServices
    RenderQueue
    LinkService
end

subgraph subGraph1 ["Configuration System"]
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

The `PDFViewerApplication` object maintains references to all major components and handles the application lifecycle from initialization through document loading and cleanup.

Sources: [web/app.js L98-L182](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L98-L182)

 [web/viewer.js L37-L180](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.js#L37-L180)

 [web/app_options.js L466-L532](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L466-L532)

### Component Initialization Flow

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
  PDFViewerApplication->>UI Components: Create all UI components
  PDFViewerApplication->>PDFViewerApplication: bindEvents()
  PDFViewerApplication->>PDFViewerApplication: bindWindowEvents()
  PDFViewerApplication->>PDFViewerApplication: open({url: file})
```

The initialization process follows a strict sequence to ensure all dependencies are properly set up before the viewer becomes interactive.

Sources: [web/app.js L656-L752](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L656-L752)

 [web/app.js L184-L260](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L184-L260)

 [web/app.js L392-L654](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L392-L654)

## Component System

The Web Viewer Application consists of several major component categories that work together to provide the complete viewing experience.

### UI Component Architecture

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
PageViews["PDFPageView[]<br>(individual pages)"]
TextLayer["TextLayer<br>(text selection)"]
AnnotLayer["AnnotationLayer<br>(forms & links)"]

SidebarContainer --> PDFSidebar
MainContainer --> PrimaryToolbar
MainContainer --> SecondaryToolbar
MainContainer --> FindBar
MainContainer --> EditorParams
ViewerContainer --> PDFViewer

subgraph subGraph3 ["Document Display"]
    PDFViewer
    PageViews
    TextLayer
    AnnotLayer
    PDFViewer --> PageViews
    PageViews --> TextLayer
    PageViews --> AnnotLayer
end

subgraph subGraph2 ["Sidebar Components"]
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

subgraph subGraph1 ["Toolbar Components"]
    PrimaryToolbar
    SecondaryToolbar
    FindBar
    EditorParams
end

subgraph subGraph0 ["Main Container Structure"]
    OuterContainer
    SidebarContainer
    MainContainer
    ViewerContainer
    OuterContainer --> SidebarContainer
    OuterContainer --> MainContainer
    MainContainer --> ViewerContainer
end
```

Each UI component is instantiated and managed by the `PDFViewerApplication` during the `_initializeViewerComponents()` phase.

Sources: [web/app.js L392-L654](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L392-L654)

 [web/viewer.html L96-L411](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.html#L96-L411)

 [web/toolbar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/toolbar.js)

 [web/pdf_sidebar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_sidebar.js)

### Service Component Architecture

```mermaid
flowchart TD

PDFHistory["PDFHistory<br>(web/pdf_history.js)"]
ViewHistory["ViewHistory<br>(web/view_history.js)"]
PresentationMode["PDFPresentationMode<br>(web/pdf_presentation_mode.js)"]
ExternalServices["ExternalServices<br>(platform-specific)"]
PrintService["PDFPrintServiceFactory<br>(web/pdf_print_service.js)"]
Preferences["Preferences<br>(platform-specific)"]
MLManager["MLManager<br>(machine learning)"]
DocumentProperties["PDFDocumentProperties<br>(web/pdf_document_properties.js:56)"]
PasswordPrompt["PasswordPrompt<br>(web/password_prompt.js:32)"]
AltTextManager["AltTextManager<br>(web/alt_text_manager.js)"]
OverlayManager["OverlayManager<br>(web/overlay_manager.js)"]
DownloadManager["DownloadManager<br>(web/download_manager.js:49)"]
ScriptingManager["PDFScriptingManager<br>(web/pdf_scripting_manager.js)"]
FindController["PDFFindController<br>(web/pdf_find_controller.js)"]
CursorTools["PDFCursorTools<br>(web/pdf_cursor_tools.js)"]

subgraph subGraph3 ["State Management"]
    PDFHistory
    ViewHistory
    PresentationMode
end

subgraph subGraph2 ["Platform Services"]
    ExternalServices
    PrintService
    Preferences
    MLManager
end

subgraph subGraph1 ["Dialog Services"]
    DocumentProperties
    PasswordPrompt
    AltTextManager
    OverlayManager
end

subgraph subGraph0 ["Core Services"]
    DownloadManager
    ScriptingManager
    FindController
    CursorTools
end
```

Service components provide specialized functionality and are typically instantiated as singletons within the application context.

Sources: [web/app.js L421-L653](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L421-L653)

 [web/download_manager.js L49-L126](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/download_manager.js#L49-L126)

 [web/pdf_document_properties.js L56-L327](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_document_properties.js#L56-L327)

## Platform Integration Strategy

The Web Viewer Application uses a platform abstraction layer to support different deployment targets while maintaining a unified codebase.

### Platform Abstraction Layer

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

subgraph subGraph3 ["Chrome Platform"]
    ChromeCom
    ChromeServices
    ChromePrefs
    ChromeDownload
    ChromeServices --> ChromeCom
end

subgraph subGraph2 ["Firefox Platform"]
    FirefoxCom
    FirefoxServices
    FirefoxPrefs
    FirefoxDownload
    FirefoxServices --> FirefoxCom
end

subgraph subGraph1 ["Generic Platform"]
    GenericCom
    GenericServices
    GenericPrefs
    GenericL10n
    GenericServices --> GenericL10n
end

subgraph subGraph0 ["Shared Application Core"]
    PDFViewerApp
    BaseExtServices
    BasePreferences
    PDFViewerApp --> BaseExtServices
    PDFViewerApp --> BasePreferences
end
```

Platform-specific implementations are selected at build time through conditional compilation directives.

Sources: [web/external_services.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/external_services.js)

 [web/firefoxcom.js L311-L419](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefoxcom.js#L311-L419)

 [web/chromecom.js L330-L428](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/chromecom.js#L330-L428)

 [web/genericcom.js L40-L57](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/genericcom.js#L40-L57)

### Configuration Management

```mermaid
flowchart TD

DefaultOptions["defaultOptions<br>(web/app_options.js:57)"]
UserOptions["userOptions<br>(web/app_options.js:424)"]
BrowserDefaults["browserDefaults<br>(compatibility params)"]
Preferences["Platform Preferences<br>(persistent storage)"]
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

subgraph subGraph2 ["Option Categories"]
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

subgraph subGraph0 ["Configuration Sources"]
    DefaultOptions
    UserOptions
    BrowserDefaults
    Preferences
end
```

The configuration system provides a hierarchical approach where user preferences override defaults, and platform-specific values are applied as needed.

Sources: [web/app_options.js L57-L532](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L57-L532)

 [web/preferences.js L23-L210](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/preferences.js#L23-L210)

## Event System and Communication

The Web Viewer Application uses a centralized event system to coordinate communication between components.

### EventBus Architecture

```mermaid
flowchart TD

EventBus["EventBus<br>(web/event_utils.js)"]
FirefoxEventBus["FirefoxEventBus<br>(web/event_utils.js)"]
PDFViewer["PDFViewer<br>(page events)"]
Toolbar["Toolbar<br>(UI events)"]
Sidebar["PDFSidebar<br>(navigation events)"]
FindController["PDFFindController<br>(search events)"]
LinkService["PDFLinkService<br>(link events)"]
App["PDFViewerApplication<br>(app.js:2565-2802)"]
Components["UI Components<br>(various listeners)"]
Services["Service Components<br>(various listeners)"]
Platform["Platform Services<br>(external communication)"]
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

subgraph subGraph3 ["Key Event Types"]
    PageEvents
    NavEvents
    SearchEvents
    DocumentEvents
end

subgraph subGraph2 ["Event Consumers"]
    App
    Components
    Services
    Platform
end

subgraph subGraph1 ["Event Producers"]
    PDFViewer
    Toolbar
    Sidebar
    FindController
    LinkService
end

subgraph subGraph0 ["Event Bus Core"]
    EventBus
    FirefoxEventBus
end
```

The event system enables loose coupling between components while maintaining coordinated behavior across the application.

Sources: [web/event_utils.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/event_utils.js)

 [web/app.js L2565-L2802](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L2565-L2802)

 [web/pdf_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_viewer.js)

### Document Lifecycle Management

```mermaid
sequenceDiagram
  participant User Action
  participant PDFViewerApplication
  participant PDFDocumentLoadingTask
  participant PDFDocument
  participant PDFViewer
  participant UI Components

  User Action->>PDFViewerApplication: open({url})
  PDFViewerApplication->>PDFViewerApplication: close() [if previous doc]
  PDFViewerApplication->>PDFDocumentLoadingTask: getDocument(params)
  PDFDocumentLoadingTask->>PDFViewerApplication: onProgress events
  PDFDocumentLoadingTask->>PDFDocument: promise resolves
  PDFViewerApplication->>PDFViewerApplication: load(pdfDocument)
  PDFViewerApplication->>PDFViewer: setDocument(pdfDocument)
  PDFViewerApplication->>UI Components: setDocument(pdfDocument)
  PDFViewerApplication->>PDFViewerApplication: _initializeViewerComponents()
  PDFViewer->>PDFViewerApplication: pagesinit event
  PDFViewerApplication->>PDFViewerApplication: setInitialView()
  PDFViewerApplication->>UI Components: Document ready
```

The document lifecycle is carefully managed to ensure proper cleanup and initialization when switching between PDF documents.

Sources: [web/app.js L1005-L1093](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L1005-L1093)

 [web/app.js L1139-L1254](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L1139-L1254)

 [web/app.js L932-L997](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L932-L997)

## Printing and Export Services

The application provides comprehensive printing capabilities through a platform-aware printing service system.

### Print Service Architecture

```mermaid
flowchart TD

PrintFactory["PDFPrintServiceFactory<br>(web/pdf_print_service.js:349)"]
GenericPrint["PDFPrintService<br>(web/pdf_print_service.js:80)"]
FirefoxPrint["FirefoxPrintService<br>(web/firefox_print_service.js:116)"]
Layout["layout()<br>(create print layout)"]
RenderPages["renderPages()<br>(render to canvas)"]
PerformPrint["performPrint()<br>(invoke browser print)"]
Cleanup["destroy()<br>(cleanup resources)"]
PrintResolution["printResolution<br>(150 DPI default)"]
PageSizes["pagesOverview<br>(page dimensions)"]
AnnotationStorage["printAnnotationStorage<br>(form data)"]
OptionalContent["optionalContentConfig<br>(layer visibility)"]

GenericPrint --> Layout
Layout --> PrintResolution
Layout --> PageSizes
RenderPages --> AnnotationStorage
RenderPages --> OptionalContent

subgraph subGraph2 ["Print Configuration"]
    PrintResolution
    PageSizes
    AnnotationStorage
    OptionalContent
end

subgraph subGraph1 ["Print Process"]
    Layout
    RenderPages
    PerformPrint
    Cleanup
    Layout --> RenderPages
    RenderPages --> PerformPrint
    PerformPrint --> Cleanup
end

subgraph subGraph0 ["Print Service Factory"]
    PrintFactory
    GenericPrint
    FirefoxPrint
    PrintFactory --> GenericPrint
    PrintFactory --> FirefoxPrint
end
```

The printing system adapts to browser capabilities, using native Firefox printing APIs when available or falling back to generic canvas-based printing.

Sources: [web/pdf_print_service.js L80-L241](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_print_service.js#L80-L241)

 [web/firefox_print_service.js L116-L194](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefox_print_service.js#L116-L194)

 [web/pdf_print_service.js L349-L374](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_print_service.js#L349-L374)