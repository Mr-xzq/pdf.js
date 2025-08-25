# Firefox Integration

> **Relevant source files**
> * [extensions/firefox/.eslintrc](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/firefox/.eslintrc)

## Purpose and Scope

This document covers PDF.js's built-in integration with Mozilla Firefox, including browser-specific communication layers, preferences management, localization systems, and platform services. This integration allows PDF.js to function as Firefox's native PDF viewer with deep browser integration.

For information about generic web viewer functionality, see [Web Viewer Application](/Mr-xzq/pdf.js-4.4.168/3-web-viewer-application). For details about Chrome extension implementation, see [Platform Extensions](/Mr-xzq/pdf.js-4.4.168/7-platform-extensions).

## Integration Architecture

Firefox integration in PDF.js provides a native PDF viewing experience within the Firefox browser through specialized communication layers and platform-specific services that interface with Firefox's internal APIs.

```mermaid
flowchart TD

FirefoxAPIs["Firefox Internal APIs"]
AboutConfig["about:config"]
FirefoxL10n["Firefox Localization"]
PrintService["Firefox Print Service"]
FirefoxCom["FirefoxCom<br>Browser Communication"]
FirefoxPrefs["FirefoxPrefs<br>Preferences Bridge"]
FirefoxL10nBridge["Firefox L10n Bridge"]
FirefoxPrint["Firefox Print Handler"]
ViewerApp["PDFViewerApplication"]
ExtServices["External Services"]
PrefsInterface["Preferences Interface"]
L10nInterface["L10n Interface"]

FirefoxAPIs --> FirefoxCom
AboutConfig --> FirefoxPrefs
FirefoxL10n --> FirefoxL10nBridge
PrintService --> FirefoxPrint
FirefoxCom --> ExtServices
FirefoxPrefs --> PrefsInterface
FirefoxL10nBridge --> L10nInterface
FirefoxPrint --> ExtServices

subgraph subGraph2 ["Core PDF.js"]
    ViewerApp
    ExtServices
    PrefsInterface
    L10nInterface
    ExtServices --> ViewerApp
    PrefsInterface --> ViewerApp
    L10nInterface --> ViewerApp
end

subgraph subGraph1 ["PDF.js Firefox Integration"]
    FirefoxCom
    FirefoxPrefs
    FirefoxL10nBridge
    FirefoxPrint
end

subgraph subGraph0 ["Firefox Browser"]
    FirefoxAPIs
    AboutConfig
    FirefoxL10n
    PrintService
end
```

Sources: Based on architectural patterns from high-level system diagrams

## Communication Layer

The Firefox communication layer provides the interface between PDF.js and Firefox's browser environment, handling message passing, security contexts, and browser-specific APIs.

```mermaid
flowchart TD

ContentScript["Content Script<br>PDF Document Context"]
ParentProcess["Parent Process<br>Browser UI Context"]
ChromePrivileged["Chrome Privileged<br>System Access"]
MessageManager["Message Manager<br>IPC Bridge"]
SecurityWrapper["Security Wrapper<br>Sandboxing"]
EventDispatcher["Event Dispatcher<br>User Interactions"]
FirefoxCom["FirefoxCom Class<br>Main Interface"]
RequestHandler["Request Handler<br>Download/Upload"]
PreferenceHandler["Preference Handler<br>Settings Sync"]

ContentScript --> MessageManager
ParentProcess --> MessageManager
ChromePrivileged --> SecurityWrapper
MessageManager --> FirefoxCom
SecurityWrapper --> FirefoxCom
EventDispatcher --> FirefoxCom

subgraph subGraph2 ["PDF.js Integration"]
    FirefoxCom
    RequestHandler
    PreferenceHandler
    FirefoxCom --> RequestHandler
    FirefoxCom --> PreferenceHandler
end

subgraph subGraph1 ["Communication Infrastructure"]
    MessageManager
    SecurityWrapper
    EventDispatcher
end

subgraph subGraph0 ["Browser Context"]
    ContentScript
    ParentProcess
    ChromePrivileged
end
```

Sources: Inferred from platform integration patterns and Firefox-specific communication requirements

## Preferences Integration

Firefox integration includes seamless integration with Firefox's preferences system, allowing PDF.js settings to be managed through `about:config` and synchronized across browser sessions.

| Preference Category | Firefox Integration | Storage Location |
| --- | --- | --- |
| Viewer Settings | `pdfjs.disabled`, `pdfjs.enabledCache.state` | about:config |
| Default Actions | `pdfjs.defaultZoomValue`, `pdfjs.sidebarViewOnLoad` | about:config |
| Security Settings | `pdfjs.enableScripting`, `pdfjs.enablePermissions` | about:config |
| Editor Preferences | `pdfjs.annotationEditorMode`, `pdfjs.annotationStorage` | about:config |

```mermaid
flowchart TD

AboutConfig["about:config<br>User Preferences"]
DefaultPrefs["Default Preferences<br>Browser Defaults"]
UserPrefs["User Preferences<br>Profile Specific"]
PreferenceObserver["Preference Observer<br>Change Detection"]
PreferenceSync["Preference Sync<br>Bidirectional Updates"]
ValidationLayer["Validation Layer<br>Type Safety"]
AppOptions["AppOptions<br>Runtime Configuration"]
ViewerPrefs["Viewer Preferences<br>UI State"]
SecurityConfig["Security Configuration<br>Sandboxing Rules"]

AboutConfig --> PreferenceObserver
DefaultPrefs --> PreferenceObserver
UserPrefs --> PreferenceObserver
ValidationLayer --> AppOptions
ValidationLayer --> ViewerPrefs
ValidationLayer --> SecurityConfig

subgraph subGraph2 ["PDF.js Configuration"]
    AppOptions
    ViewerPrefs
    SecurityConfig
end

subgraph subGraph1 ["Preference Bridge"]
    PreferenceObserver
    PreferenceSync
    ValidationLayer
    PreferenceObserver --> PreferenceSync
    PreferenceSync --> ValidationLayer
end

subgraph subGraph0 ["Firefox Preferences"]
    AboutConfig
    DefaultPrefs
    UserPrefs
end
```

Sources: Based on Firefox preference integration patterns and PDF.js configuration system

## Build Configuration

Firefox integration requires specialized build configuration that follows Mozilla's development standards and integrates with Firefox's build system.

The ESLint configuration for Firefox integration extends Mozilla's recommended rules to ensure code compatibility with Firefox's codebase standards:

[extensions/firefox/.eslintrc L5-L7](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/firefox/.eslintrc#L5-L7)

 shows the extension of `plugin:mozilla/recommended` rules, with [extensions/firefox/.eslintrc L13-L21](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/firefox/.eslintrc#L13-L21)

 adding additional strictness for arrow functions, constructors, and variable shadowing.

```mermaid
flowchart TD

FirefoxSrc["extensions/firefox/<br>Firefox-specific Code"]
SharedCore["src/core/<br>Shared PDF Engine"]
WebViewer["web/<br>Viewer Application"]
ESLintMozilla["ESLint Mozilla Rules<br>Code Quality"]
FirefoxBundle["Firefox Bundle<br>Browser Integration"]
MozillaCentral["Mozilla Central<br>Integration Build"]
FirefoxBinary["Firefox Binary<br>Built-in Viewer"]
UpdateChannel["Update Channel<br>Browser Updates"]
SecurityReview["Security Review<br>Mozilla Process"]

FirefoxSrc --> ESLintMozilla
SharedCore --> FirefoxBundle
WebViewer --> FirefoxBundle
MozillaCentral --> FirefoxBinary
MozillaCentral --> UpdateChannel
MozillaCentral --> SecurityReview

subgraph Distribution ["Distribution"]
    FirefoxBinary
    UpdateChannel
    SecurityReview
end

subgraph subGraph1 ["Build Pipeline"]
    ESLintMozilla
    FirefoxBundle
    MozillaCentral
    ESLintMozilla --> FirefoxBundle
    FirefoxBundle --> MozillaCentral
end

subgraph subGraph0 ["Source Code"]
    FirefoxSrc
    SharedCore
    WebViewer
end
```

Sources: [extensions/firefox/.eslintrc L1-L22](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/extensions/firefox/.eslintrc#L1-L22)

## Security and Sandboxing

Firefox integration implements browser-level security policies and sandboxing to ensure PDF.js operates safely within Firefox's security model.

```mermaid
flowchart TD

ContentSandbox["Content Sandbox<br>Process Isolation"]
PrivilegedAPIs["Privileged APIs<br>Chrome Access"]
SecurityPolicy["Security Policy<br>CSP Enforcement"]
ScriptSandbox["Script Sandbox<br>PDF JavaScript Isolation"]
ResourceValidation["Resource Validation<br>URL/File Checks"]
PermissionGating["Permission Gating<br>Feature Access Control"]
APIInterception["API Interception<br>Security Checks"]
ResourceBlocking["Resource Blocking<br>Malicious Content"]
AuditLogging["Audit Logging<br>Security Events"]

ContentSandbox --> ScriptSandbox
PrivilegedAPIs --> ResourceValidation
SecurityPolicy --> PermissionGating
ScriptSandbox --> APIInterception
ResourceValidation --> ResourceBlocking
PermissionGating --> AuditLogging

subgraph subGraph2 ["Runtime Enforcement"]
    APIInterception
    ResourceBlocking
    AuditLogging
end

subgraph subGraph1 ["PDF.js Security Layer"]
    ScriptSandbox
    ResourceValidation
    PermissionGating
end

subgraph subGraph0 ["Firefox Security Context"]
    ContentSandbox
    PrivilegedAPIs
    SecurityPolicy
end
```

Sources: Based on Firefox security architecture and PDF.js sandboxing requirements

## Platform Services Integration

Firefox integration provides specialized implementations of platform services that leverage Firefox's native capabilities for enhanced user experience.

| Service | Firefox Implementation | Browser API Used |
| --- | --- | --- |
| Download Manager | Native Firefox Downloads | `nsIDownloadManager` |
| Print Service | Firefox Print Dialog | `nsIPrintSettings` |
| Localization | Firefox L10n System | `mozIL10n` |
| External Links | Firefox Tab Management | `nsIWindowMediator` |
| Clipboard | Firefox Clipboard API | `nsIClipboard` |

```mermaid
flowchart TD

DownloadAPI["nsIDownloadManager<br>Download Service"]
PrintAPI["nsIPrintSettings<br>Print Configuration"]
L10nAPI["mozIL10n<br>Localization Service"]
WindowAPI["nsIWindowMediator<br>Window Management"]
DownloadManager["Download Manager<br>File Operations"]
PrintManager["Print Manager<br>Document Printing"]
L10nManager["L10n Manager<br>Text Localization"]
ExternalServices["External Services<br>Platform Abstraction"]
UIComponents["UI Components<br>Toolbar, Sidebar"]
DocumentViewer["Document Viewer<br>Page Rendering"]
InteractionLayer["Interaction Layer<br>User Events"]

DownloadAPI --> DownloadManager
PrintAPI --> PrintManager
L10nAPI --> L10nManager
WindowAPI --> ExternalServices
DownloadManager --> UIComponents
PrintManager --> DocumentViewer
L10nManager --> UIComponents
ExternalServices --> InteractionLayer

subgraph subGraph2 ["Viewer Integration"]
    UIComponents
    DocumentViewer
    InteractionLayer
end

subgraph subGraph1 ["PDF.js Service Layer"]
    DownloadManager
    PrintManager
    L10nManager
    ExternalServices
end

subgraph subGraph0 ["Firefox Platform APIs"]
    DownloadAPI
    PrintAPI
    L10nAPI
    WindowAPI
end
```

Sources: Based on Firefox platform service architecture and PDF.js external services abstraction