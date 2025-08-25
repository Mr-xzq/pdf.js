# 应用程序架构

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

本文档涵盖 Web 查看器应用程序架构，重点关注主应用程序控制器、配置管理和服务集成模式。有关核心 PDF 处理引擎的信息，请参阅 [核心 PDF 处理引擎](/Mr-xzq/pdf.js-4.4.168/2-core-pdf-processing-engine)。有关各个 UI 组件的详细信息，请参阅 [用户界面组件](/Mr-xzq/pdf.js-4.4.168/3.2-user-interface-components)。

## 概述

PDF.js Web 查看器应用程序围绕中央应用程序控制器模式构建，具有模块化服务集成和平台抽象层。该架构将应用程序编排、配置管理和平台特定实现之间的关注点分离。

**主应用程序控制器**

```mermaid
flowchart TD

PDFViewerApp["PDFViewerApplication<br>(app.js)"]
AppConfig["appConfig<br>(DOM 配置)"]
EventBus["EventBus<br>(event_utils.js)"]
AppOptions["AppOptions<br>(app_options.js)"]
Preferences["Preferences<br>(平台特定)"]
DefaultOptions["defaultOptions<br>(编译时)"]
ExternalServices["ExternalServices<br>(平台抽象)"]
DownloadManager["DownloadManager"]
PrintService["PDFPrintServiceFactory"]
ScriptingManager["PDFScriptingManager"]
FirefoxCom["FirefoxCom<br>(firefoxcom.js)"]
ChromeCom["ChromeCom<br>(chromecom.js)"]
GenericCom["GenericCom<br>(genericcom.js)"]

PDFViewerApp --> AppOptions
PDFViewerApp --> ExternalServices
ExternalServices --> FirefoxCom
ExternalServices --> ChromeCom
ExternalServices --> GenericCom

subgraph subGraph3 ["平台实现"]
    FirefoxCom
    ChromeCom
    GenericCom
end

subgraph subGraph2 ["服务层"]
    ExternalServices
    DownloadManager
    PrintService
    ScriptingManager
    ExternalServices --> DownloadManager
    ExternalServices --> PrintService
    ExternalServices --> ScriptingManager
end

subgraph subGraph1 ["配置层"]
    AppOptions
    Preferences
    DefaultOptions
    AppOptions --> Preferences
    AppOptions --> DefaultOptions
end

subgraph subGraph0 ["应用程序核心"]
    PDFViewerApp
    AppConfig
    EventBus
    PDFViewerApp --> AppConfig
    PDFViewerApp --> EventBus
end
```

来源: [web/app.js L98-L655](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L98-L655)

 [web/app_options.js L466-L531](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L466-L531)

 [web/viewer.js L37-L180](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.js#L37-L180)

## PDFViewerApplication 控制器

`PDFViewerApplication` 对象作为主应用程序控制器，管理所有查看器组件的生命周期和协调。

**核心属性和生命周期**

```mermaid
flowchart TD

Initialize["initialize(appConfig)"]
InitComponents["_initializeViewerComponents()"]
BindEvents["bindEvents()"]
Run["run(config)"]
AppConfig["appConfig<br>(DOM 引用)"]
PDFDoc["pdfDocument<br>(PDFDocumentProxy)"]
PDFViewer["pdfViewer<br>(PDFViewer)"]
EventBus["eventBus<br>(EventBus)"]
Services["services<br>(各种管理器)"]
LinkService["pdfLinkService"]
RenderQueue["pdfRenderingQueue"]
FindController["findController"]
Toolbar["toolbar"]
Sidebar["pdfSidebar"]
PDFViewerApp["PDFViewerApp"]

PDFViewerApp --> AppConfig
PDFViewerApp --> Services
Services --> LinkService
Services --> RenderQueue
Services --> FindController
Services --> Toolbar
Services --> Sidebar

subgraph subGraph2 ["服务引用"]
    LinkService
    RenderQueue
    FindController
    Toolbar
    Sidebar
end

subgraph subGraph0 ["PDFViewerApplication 属性"]
    AppConfig
    PDFDoc
    PDFViewer
    EventBus
    Services
end

subgraph subGraph1 ["初始化流程"]
    Initialize
    InitComponents
    BindEvents
    Run
    Initialize --> InitComponents
    InitComponents --> BindEvents
    BindEvents --> Run
end
```

应用程序遵循以下初始化序列：

1. **配置设置** - DOM 元素映射到配置对象
2. **组件初始化** - 所有查看器组件都使用依赖项实例化
3. **事件绑定** - 为用户交互和系统事件附加事件处理程序
4. **文档加载** - PDF 文档被打开和渲染

来源: [web/app.js L184-L260](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L184-L260)

 [web/app.js L392-L654](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L392-L654)

 [web/app.js L656-L752](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app.js#L656-L752)

## 配置管理

`AppOptions` 类提供集中式配置系统，具有编译时默认值、运行时首选项和平台特定覆盖。

| 配置类型 | 来源 | 目的 |
| --- | --- | --- |
| `OptionKind.BROWSER` | 平台检测 | 浏览器功能标志 |
| `OptionKind.VIEWER` | 应用程序逻辑 | UI 行为设置 |
| `OptionKind.API` | PDF.js 核心 | PDF 处理参数 |
| `OptionKind.WORKER` | 工作线程 | 后台处理选项 |
| `OptionKind.PREFERENCE` | 用户设置 | 持久用户首选项 |

**配置架构**

```mermaid
flowchart TD

DefaultOpts["defaultOptions<br>(编译时)"]
UserOpts["userOptions<br>(运行时)"]
CompatParams["compatibilityParams<br>(平台检测)"]
Get["AppOptions.get(name)"]
Set["AppOptions.set(name, value)"]
GetAll["AppOptions.getAll(kind)"]
SetAll["AppOptions.setAll(options)"]
FirefoxPrefs["Firefox 首选项<br>(about:config)"]
ChromePrefs["Chrome 存储<br>(chrome.storage)"]
GenericPrefs["通用首选项<br>(localStorage)"]

DefaultOpts --> Get
UserOpts --> Get
Set --> UserOpts
GetAll --> DefaultOpts
SetAll --> UserOpts
FirefoxPrefs --> UserOpts
ChromePrefs --> UserOpts
GenericPrefs --> UserOpts

subgraph subGraph2 ["平台首选项"]
    FirefoxPrefs
    ChromePrefs
    GenericPrefs
end

subgraph subGraph1 ["AppOptions API"]
    Get
    Set
    GetAll
    SetAll
end

subgraph subGraph0 ["配置源"]
    DefaultOpts
    UserOpts
    CompatParams
    CompatParams --> UserOpts
end
```

配置系统支持不同的选项类型，这些类型决定设置的应用位置和方式：

* **浏览器选项** - 检测到的功能，如触摸支持、全屏 API 可用性
* **查看器选项** - UI 行为，如默认缩放、侧边栏状态、编辑器模式
* **API 选项** - PDF 处理设置，如工作源、CMap URL、字体处理
* **首选项选项** - 跨会话持续的用户可配置设置

来源: [web/app_options.js L44-L50](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L44-L50)

 [web/app_options.js L57-L381](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L57-L381)

 [web/app_options.js L466-L531](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/app_options.js#L466-L531)

## 服务集成和平台抽象

应用程序使用面向服务的架构，平台特定的实现抽象在通用接口后面。

**平台服务架构**

```mermaid
flowchart TD

BaseExtServices["BaseExternalServices<br>(external_services.js)"]
BasePrefs["BasePreferences<br>(preferences.js)"]
IDownloadMgr["IDownloadManager<br>(接口)"]
FirefoxExtServices["ExternalServices<br>(firefoxcom.js)"]
FirefoxPrefs["Preferences<br>(firefoxcom.js)"]
FirefoxDownload["DownloadManager<br>(firefoxcom.js)"]
FirefoxCom["FirefoxCom<br>(通信层)"]
ChromeExtServices["ExternalServices<br>(chromecom.js)"]
ChromePrefs["Preferences<br>(chromecom.js)"]
ChromeDownload["DownloadManager<br>(chromecom.js)"]
ChromeCom["ChromeCom<br>(通信层)"]
GenericExtServices["ExternalServices<br>(genericcom.js)"]
GenericPrefs["Preferences<br>(genericcom.js)"]
GenericDownload["DownloadManager<br>(download_manager.js)"]

BaseExtServices --> FirefoxExtServices
BaseExtServices --> ChromeExtServices
BaseExtServices --> GenericExtServices
BasePrefs --> FirefoxPrefs
BasePrefs --> ChromePrefs
BasePrefs --> GenericPrefs
IDownloadMgr --> FirefoxDownload
IDownloadMgr --> ChromeDownload
IDownloadMgr --> GenericDownload

subgraph subGraph3 ["通用实现"]
    GenericExtServices
    GenericPrefs
    GenericDownload
end

subgraph subGraph2 ["Chrome 实现"]
    ChromeExtServices
    ChromePrefs
    ChromeDownload
    ChromeCom
    ChromeExtServices --> ChromeCom
end

subgraph subGraph1 ["Firefox 实现"]
    FirefoxExtServices
    FirefoxPrefs
    FirefoxDownload
    FirefoxCom
    FirefoxExtServices --> FirefoxCom
end

subgraph subGraph0 ["服务接口"]
    BaseExtServices
    BasePrefs
    IDownloadMgr
end
```

每个平台实现提供：

1. **外部服务** - 平台集成点（L10n、脚本、遥测）
2. **首选项** - 持久设置存储机制
3. **下载管理** - 文件下载和保存功能
4. **通信层** - 与浏览器扩展 API 的消息传递

来源: [web/external_services.js L18-L87](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/external_services.js#L18-L87)

 [web/firefoxcom.js L311-L418](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/firefoxcom.js#L311-L418)

 [web/chromecom.js L55-L130](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/chromecom.js#L55-L130)

 [web/genericcom.js L40-L56](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/genericcom.js#L40-L56)
