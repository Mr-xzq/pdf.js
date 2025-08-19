# Platform Extensions

> **Relevant source files**
> * [extensions/firefox/.eslintrc](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/firefox/.eslintrc)

Platform Extensions provide the abstraction layer that enables PDF.js to operate seamlessly across different browser environments and deployment scenarios. This system allows the core PDF processing engine to remain platform-agnostic while providing specialized implementations for Firefox, Chrome extensions, and generic web environments.

For information about the core PDF processing that underlies all platforms, see [Core PDF Processing Engine](/Mr-xzq/pdf.js-4.4.168/2-core-pdf-processing-engine). For details about the web viewer application that builds on these platform extensions, see [Web Viewer Application](/Mr-xzq/pdf.js-4.4.168/3-web-viewer-application).

## Platform Architecture Overview

PDF.js implements a plugin-style architecture where platform-specific code extends the shared core through well-defined interfaces. This design enables the same PDF processing engine to integrate natively with Firefox, function as a Chrome extension, or operate as a standalone web application.

```mermaid
flowchart TD

PDFCore["PDFDocumentProxy<br>Document API"]
DisplayAPI["CanvasGraphics<br>SVGGraphics"]
ViewerBase["PDFViewerApplication<br>Base Implementation"]
ExtServices["ExternalServices<br>Interface"]
PrefsInterface["BasePreferences<br>Interface"]
L10nInterface["GenericL10n<br>Interface"]
ComLayer["IPDFLinkService<br>Communication"]
FirefoxCom["FirefoxCom<br>Privileged APIs"]
FirefoxPrefs["FirefoxPreferences<br>about:config"]
FirefoxPrint["FirefoxPrintService<br>Native Print"]
FirefoxScript["FirefoxScripting<br>Content Scripts"]
ChromeCom["ChromeCom<br>Extension APIs"]
ChromeStorage["ChromeStorage<br>chrome.storage"]
ChromePrint["ChromePrintService<br>Extension Print"]
ChromeScript["ChromeScripting<br>Background Scripts"]
GenericCom["GenericCom<br>Web APIs"]
LocalStorage["LocalStoragePrefs<br>localStorage"]
GenericPrint["GenericPrintService<br>Browser Print"]
GenericScript["GenericScripting<br>Web Workers"]

ViewerBase --> ExtServices
ViewerBase --> PrefsInterface
ViewerBase --> L10nInterface
ViewerBase --> ComLayer
ExtServices --> FirefoxCom
ExtServices --> ChromeCom
ExtServices --> GenericCom
PrefsInterface --> FirefoxPrefs
PrefsInterface --> ChromeStorage
PrefsInterface --> LocalStorage
ComLayer --> FirefoxScript
ComLayer --> ChromeScript
ComLayer --> GenericScript

subgraph GenericImpl ["Generic Web"]
    GenericCom
    LocalStorage
    GenericPrint
    GenericScript
end

subgraph ChromeImpl ["Chrome Extension"]
    ChromeCom
    ChromeStorage
    ChromePrint
    ChromeScript
end

subgraph FirefoxImpl ["Firefox Implementation"]
    FirefoxCom
    FirefoxPrefs
    FirefoxPrint
    FirefoxScript
end

subgraph PlatformAbstraction ["Platform Abstraction Layer"]
    ExtServices
    PrefsInterface
    L10nInterface
    ComLayer
end

subgraph SharedCore ["Shared Core Components"]
    PDFCore
    DisplayAPI
    ViewerBase
    PDFCore --> ViewerBase
    DisplayAPI --> ViewerBase
end
```

**Sources:** Architecture inferred from high-level system diagrams and platform integration patterns

## External Services Interface

The `ExternalServices` interface serves as the primary abstraction point between the viewer application and platform-specific implementations. This interface defines contracts for preferences management, localization, scripting, and communication services.

```mermaid
flowchart TD

PrefsService["supportsUserPreferences()<br>createPreferences()"]
L10nService["supportsIntegratedFind()<br>createL10n()"]
ScriptService["supportsDocumentFonts()<br>createScripting()"]
ComService["createDownloadManager()<br>createPreferences()"]
FirefoxPrefs["FirefoxPreferences<br>about:config integration"]
FirefoxL10n["FirefoxL10n<br>Fluent integration"]
FirefoxDownload["FirefoxDownloadManager<br>Native downloads"]
FirefoxFonts["FirefoxFontInspector<br>System fonts"]
ChromePrefs["ChromePreferences<br>Extension storage"]
ChromeL10n["ChromeL10n<br>Extension i18n"]
ChromeDownload["ChromeDownloadManager<br>Downloads API"]
ChromeFonts["ChromeFontInspector<br>Canvas fonts"]
GenericPrefs["GenericPreferences<br>localStorage"]
GenericL10n["GenericL10n<br>Fluent fallback"]
GenericDownload["GenericDownloadManager<br>Blob downloads"]
GenericFonts["GenericFontInspector<br>Web fonts"]

PrefsService --> FirefoxPrefs
PrefsService --> ChromePrefs
PrefsService --> GenericPrefs
L10nService --> FirefoxL10n
L10nService --> ChromeL10n
L10nService --> GenericL10n
ComService --> FirefoxDownload
ComService --> ChromeDownload
ComService --> GenericDownload
ScriptService --> FirefoxFonts
ScriptService --> ChromeFonts
ScriptService --> GenericFonts

subgraph GenericServices ["Generic Services"]
    GenericPrefs
    GenericL10n
    GenericDownload
    GenericFonts
end

subgraph ChromeServices ["Chrome Services"]
    ChromePrefs
    ChromeL10n
    ChromeDownload
    ChromeFonts
end

subgraph FirefoxServices ["Firefox Services"]
    FirefoxPrefs
    FirefoxL10n
    FirefoxDownload
    FirefoxFonts
end

subgraph ExternalServices ["ExternalServices Interface"]
    PrefsService
    L10nService
    ScriptService
    ComService
end
```

**Sources:** External services architecture inferred from platform integration diagrams

## Platform-Specific Communication Layers

Each platform implements its own communication layer that handles message passing, preference synchronization, and integration with browser-specific APIs. These layers abstract the differences between Firefox's privileged context, Chrome's extension APIs, and generic web constraints.

| Platform | Communication Class | Key Responsibilities | Browser Integration |
| --- | --- | --- | --- |
| Firefox | `FirefoxCom` | Privileged API access, content script communication | Native Firefox integration via `browser` APIs |
| Chrome | `ChromeCom` | Extension message passing, storage synchronization | Chrome extension APIs via `chrome.*` namespace |
| Generic | `GenericCom` | PostMessage communication, localStorage fallbacks | Standard web APIs only |

```mermaid
flowchart TD

MainThread["PDFViewerApplication<br>Main Thread"]
WorkerThread["PDFWorker<br>Worker Thread"]
ContentScript["ContentScript<br>Bridge Layer"]
FirefoxMain["firefox.com.js<br>Main Process"]
FirefoxContent["firefox-content.js<br>Content Process"]
FirefoxPrefs["firefox-prefs.js<br>Preference Sync"]
FirefoxPrint["firefox-print.js<br>Print Service"]
ChromeBackground["chrome-background.js<br>Background Script"]
ChromeContent["chrome-content.js<br>Content Script"]
ChromeStorage["chrome-storage.js<br>Storage Sync"]
ChromeDownload["chrome-download.js<br>Download Service"]
GenericMain["generic.js<br>Main Context"]
GenericWorker["generic-worker.js<br>Worker Context"]
GenericStorage["generic-storage.js<br>Storage Fallback"]
GenericPrint["generic-print.js<br>Print Fallback"]

ContentScript --> FirefoxContent
ContentScript --> ChromeContent
ContentScript --> GenericMain

subgraph GenericIntegration ["Generic Integration"]
    GenericMain
    GenericWorker
    GenericStorage
    GenericPrint
    GenericMain --> GenericWorker
    GenericMain --> GenericStorage
    GenericMain --> GenericPrint
end

subgraph ChromeIntegration ["Chrome Integration"]
    ChromeBackground
    ChromeContent
    ChromeStorage
    ChromeDownload
    ChromeContent --> ChromeBackground
    ChromeContent --> ChromeStorage
    ChromeContent --> ChromeDownload
end

subgraph FirefoxIntegration ["Firefox Integration"]
    FirefoxMain
    FirefoxContent
    FirefoxPrefs
    FirefoxPrint
    FirefoxContent --> FirefoxMain
    FirefoxContent --> FirefoxPrefs
    FirefoxContent --> FirefoxPrint
end

subgraph MessageHandling ["Message Handling Architecture"]
    MainThread
    WorkerThread
    ContentScript
    MainThread --> ContentScript
    ContentScript --> WorkerThread
end
```

**Sources:** Platform communication architecture inferred from system integration patterns

## Firefox Extension Implementation

The Firefox implementation leverages Mozilla's privileged extension APIs and integrates directly with the browser's native PDF handling capabilities. Firefox-specific code is located in the extensions directory and follows Mozilla's development guidelines.

### Firefox-Specific Features

Firefox integration provides several unique capabilities:

* **Native Preference Integration**: Direct integration with `about:config` preferences
* **Privileged API Access**: Access to Firefox's internal APIs for enhanced functionality
* **Content Security Policy**: Relaxed CSP for PDF processing requirements
* **Native Print Integration**: Direct access to Firefox's print subsystem
* **Fluent Localization**: Integration with Firefox's localization system

```mermaid
flowchart TD

BrowserAPI["browser.runtime<br>Extension Context"]
PrefsAPI["Services.prefs<br>Preference Access"]
L10nAPI["Localization<br>Fluent Integration"]
PrintAPI["window.print<br>Native Print"]
FirefoxCom["FirefoxCom<br>Message Bridge"]
FirefoxPrefs["FirefoxPreferences<br>Settings Manager"]
FirefoxL10n["FirefoxL10n<br>Translation Service"]
FirefoxPrint["FirefoxPrintService<br>Print Manager"]
ViewerApp["PDFViewerApplication<br>Main Controller"]
ExternalServices["ExternalServices<br>Service Locator"]
PrintService["PDFPrintService<br>Print Controller"]
PrefsManager["PreferencesManager<br>Settings Controller"]

BrowserAPI --> FirefoxCom
PrefsAPI --> FirefoxPrefs
L10nAPI --> FirefoxL10n
PrintAPI --> FirefoxPrint
FirefoxCom --> ExternalServices
FirefoxPrefs --> ExternalServices
FirefoxL10n --> ExternalServices
FirefoxPrint --> ExternalServices

subgraph PDFViewer ["PDF Viewer Integration"]
    ViewerApp
    ExternalServices
    PrintService
    PrefsManager
    ExternalServices --> ViewerApp
    ExternalServices --> PrintService
    ExternalServices --> PrefsManager
end

subgraph FirefoxServices ["Firefox Services"]
    FirefoxCom
    FirefoxPrefs
    FirefoxL10n
    FirefoxPrint
end

subgraph FirefoxAPIs ["Firefox APIs"]
    BrowserAPI
    PrefsAPI
    L10nAPI
    PrintAPI
end
```

**Sources:** [extensions/firefox/.eslintrc L1-L23](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/firefox/.eslintrc#L1-L23)

 Firefox integration patterns from platform diagrams

## Chrome Extension Implementation

The Chrome extension implementation operates within Chrome's security sandbox and utilizes extension APIs for functionality that generic web applications cannot access. This includes persistent storage, download management, and cross-origin communication.

### Chrome Extension Architecture

Chrome extensions require manifest-defined permissions and operate across multiple contexts:

* **Background Scripts**: Handle persistent state and API access
* **Content Scripts**: Inject PDF.js into web pages
* **Extension Storage**: Synchronize preferences across devices
* **Downloads API**: Manage PDF file downloads

| Chrome API | PDF.js Service | Functionality |
| --- | --- | --- |
| `chrome.storage.sync` | `ChromePreferences` | Cross-device preference synchronization |
| `chrome.downloads` | `ChromeDownloadManager` | Enhanced download management |
| `chrome.tabs` | `ChromeTabService` | Tab communication and control |
| `chrome.runtime` | `ChromeMessaging` | Extension message passing |

**Sources:** Chrome extension architecture inferred from platform integration diagrams

## Generic Web Implementation

The generic web implementation provides fallback functionality using only standard web APIs. This ensures PDF.js can operate in any modern browser environment without requiring special permissions or extensions.

### Web API Limitations and Workarounds

The generic implementation must work around several web platform limitations:

```mermaid
flowchart TD

CORS["Cross-Origin Restrictions<br>Same-origin PDF loading"]
Storage["Limited Storage<br>localStorage quotas"]
Downloads["Download Limitations<br>Blob URL downloads"]
Printing["Print Constraints<br>CSS print media"]
ProxyService["PDF Proxy Service<br>CORS bypass"]
IndexedDB["IndexedDB Storage<br>Large data storage"]
BlobDownload["Blob Download<br>Client-side generation"]
PrintCSS["Print CSS<br>Media query styling"]
GenericCom["GenericCom<br>PostMessage"]
GenericPrefs["GenericPreferences<br>localStorage"]
GenericL10n["GenericL10n<br>Fluent fallback"]
GenericPrint["GenericPrintService<br>Window print"]

CORS --> ProxyService
Storage --> IndexedDB
Downloads --> BlobDownload
Printing --> PrintCSS
ProxyService --> GenericCom
IndexedDB --> GenericPrefs
BlobDownload --> GenericCom
PrintCSS --> GenericPrint

subgraph FallbackServices ["Fallback Services"]
    GenericCom
    GenericPrefs
    GenericL10n
    GenericPrint
end

subgraph Workarounds ["Generic Workarounds"]
    ProxyService
    IndexedDB
    BlobDownload
    PrintCSS
end

subgraph WebConstraints ["Web Platform Constraints"]
    CORS
    Storage
    Downloads
    Printing
end
```

**Sources:** Generic web implementation constraints inferred from platform abstraction patterns

## Build System Integration

The build system generates platform-specific distributions by conditionally including platform code and configuring webpack entry points for each target environment.

### Platform-Specific Build Targets

| Build Target | Output Directory | Platform Code | Key Features |
| --- | --- | --- | --- |
| `generic` | `build/generic/` | Generic web implementation | Standard web APIs only |
| `firefox` | `build/firefox/` | Firefox extension code | Mozilla APIs and CSP |
| `chrome` | `build/chrome/` | Chrome extension code | Extension APIs and manifest |
| `components` | `build/components/` | Reusable library components | Framework integration |

The build process uses webpack's conditional compilation to include platform-specific modules and exclude incompatible code paths for each target environment.

**Sources:** Build system architecture inferred from distribution and platform integration diagrams