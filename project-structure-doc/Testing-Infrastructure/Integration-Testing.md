# Integration Testing

> **Relevant source files**
> * [test/integration/.eslintrc](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/.eslintrc)
> * [test/integration/accessibility_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/accessibility_spec.mjs)
> * [test/integration/annotation_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/annotation_spec.mjs)
> * [test/integration/caret_browsing_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/caret_browsing_spec.mjs)
> * [test/integration/copy_paste_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/copy_paste_spec.mjs)
> * [test/integration/find_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/find_spec.mjs)
> * [test/integration/freetext_editor_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/freetext_editor_spec.mjs)
> * [test/integration/ink_editor_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/ink_editor_spec.mjs)
> * [test/integration/scripting_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/scripting_spec.mjs)
> * [test/integration/stamp_editor_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/stamp_editor_spec.mjs)
> * [test/integration/test_utils.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs)
> * [test/pdfs/issue17998.pdf](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/issue17998.pdf)
> * [test/pdfs/issue18305.pdf](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/issue18305.pdf)

## Purpose and Scope

Integration testing in PDF.js validates end-to-end functionality through browser automation, focusing on user interactions with the complete web viewer application. These tests verify that PDF rendering, annotation editing, form handling, scripting, and accessibility features work correctly across different browsers in real-world scenarios.

For information about unit testing, see [Unit Testing](/Mr-xzq/pdf.js-4.4.168/6.1-unit-testing). For visual regression testing of PDF rendering output, see [Visual Regression Testing](/Mr-xzq/pdf.js-4.4.168/6.3-visual-regression-testing).

## Test Infrastructure Architecture

The integration testing system uses Puppeteer for browser automation and Jasmine for test organization. Tests run against the full PDF.js viewer application loaded in headless browsers.

```mermaid
flowchart TD

TestRunner["Test Runner<br>(Jasmine Framework)"]
PuppeteerController["Puppeteer Controller<br>Browser Automation"]
TestUtils["test_utils.mjs<br>Helper Functions"]
ChromeSession["Chrome Session<br>integrationSessions[0]"]
FirefoxSession["Firefox Session<br>integrationSessions[1]"]
ViewerApp["PDFViewerApplication<br>Main Controller"]
EditorLayer["AnnotationEditorLayer<br>Editor Management"]
EventBus["EventBus<br>Component Communication"]
Storage["AnnotationStorage<br>Data Persistence"]
TestSpecs["*_spec.mjs Files<br>Test Definitions"]
TestPDFs["test/pdfs/<br>PDF Test Files"]

PuppeteerController --> ChromeSession
PuppeteerController --> FirefoxSession
ChromeSession --> ViewerApp
FirefoxSession --> ViewerApp
TestSpecs --> TestRunner
TestSpecs --> TestUtils

subgraph subGraph3 ["Test Files"]
    TestSpecs
    TestPDFs
    TestSpecs --> TestPDFs
end

subgraph subGraph2 ["PDF.js Application"]
    ViewerApp
    EditorLayer
    EventBus
    Storage
    ViewerApp --> EditorLayer
    ViewerApp --> EventBus
    ViewerApp --> Storage
end

subgraph subGraph1 ["Browser Sessions"]
    ChromeSession
    FirefoxSession
end

subgraph subGraph0 ["Test Infrastructure"]
    TestRunner
    PuppeteerController
    TestUtils
    TestRunner --> PuppeteerController
    TestUtils --> PuppeteerController
end
```

Sources: [test/integration/test_utils.mjs L20-L69](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L20-L69)

 [test/integration/freetext_editor_spec.mjs L106-L109](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/freetext_editor_spec.mjs#L106-L109)

## Global Test Session Management

Integration tests utilize a global session management system that maintains browser instances across test suites.

```mermaid
flowchart TD

LoadAndWait["loadAndWait()<br>test_utils.mjs:19"]
GlobalSessions["global.integrationSessions<br>Browser Array"]
BaseURL["global.integrationBaseUrl<br>Viewer URL"]
NewPage["page.newPage()<br>Puppeteer API"]
LocaleSetup["navigator.language = 'en-US'<br>test_utils.mjs:26-36"]
PageLoad["page.goto(url)<br>PDF Load"]
WaitSelector["page.waitForSelector()<br>Element Ready"]
TestActions["User Interactions<br>Clicks, Types, etc."]
Cleanup["closeSinglePage()<br>test_utils.mjs:87-94"]

GlobalSessions --> NewPage
PageLoad --> WaitSelector

subgraph subGraph2 ["Test Execution"]
    WaitSelector
    TestActions
    Cleanup
    WaitSelector --> TestActions
    TestActions --> Cleanup
end

subgraph subGraph1 ["Browser Setup"]
    NewPage
    LocaleSetup
    PageLoad
    NewPage --> LocaleSetup
    LocaleSetup --> PageLoad
end

subgraph subGraph0 ["Session Initialization"]
    LoadAndWait
    GlobalSessions
    BaseURL
    LoadAndWait --> GlobalSessions
    LoadAndWait --> BaseURL
end
```

Sources: [test/integration/test_utils.mjs L19-L69](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L19-L69)

 [test/integration/test_utils.mjs L87-L94](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L87-L94)

## Helper Utilities System

The `test_utils.mjs` file provides a comprehensive set of helper functions for common testing operations:

### Element Selection and Interaction

| Function | Purpose | Line Reference |
| --- | --- | --- |
| `getSelector(id)` | Convert element ID to data attribute selector | [test/integration/test_utils.mjs L131-L133](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L131-L133) |
| `getEditorSelector(n)` | Get selector for annotation editor by number | [test/integration/test_utils.mjs L152-L154](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L152-L154) |
| `getRect(page, selector)` | Get element bounding rectangle | [test/integration/test_utils.mjs L135-L142](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L135-L142) |
| `waitForSelectedEditor(page, selector)` | Wait for editor selection state | [test/integration/test_utils.mjs L275-L277](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L275-L277) |

### Annotation Editor Operations

| Function | Purpose | Line Reference |
| --- | --- | --- |
| `switchToEditor(name, page)` | Change annotation editor mode | [test/integration/test_utils.mjs L635-L650](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L635-L650) |
| `getSelectedEditors(page)` | Get array of selected editor IDs | [test/integration/test_utils.mjs L156-L166](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L156-L166) |
| `getSerialized(page, filter)` | Extract serialized annotation data | [test/integration/test_utils.mjs L340-L360](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L340-L360) |
| `waitForStorageEntries(page, nEntries)` | Wait for annotation count in storage | [test/integration/test_utils.mjs L242-L248](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L242-L248) |

### Keyboard and Mouse Simulation

```mermaid
flowchart TD

FocusNext["kbFocusNext(page)<br>test_utils.mjs:617-623"]
FocusPrev["kbFocusPrevious(page)<br>test_utils.mjs:625-633"]
SelectAll["kbSelectAll(page)<br>test_utils.mjs:523-527"]
GoToEnd["kbGoToEnd(page)<br>test_utils.mjs:534-546"]
BigMove["kbBigMoveLeft/Right/Up/Down<br>test_utils.mjs:560-603"]
ModifierKey["modifier = isMac ? 'Meta' : 'Control'<br>test_utils.mjs:494"]
CopyCmd["kbCopy(page)<br>test_utils.mjs:495-499"]
PasteCmd["kbPaste(page)<br>test_utils.mjs:500-504"]
UndoCmd["kbUndo(page)<br>test_utils.mjs:505-509"]
RedoCmd["kbRedo(page)<br>test_utils.mjs:510-522"]

subgraph subGraph2 ["Focus Management"]
    FocusNext
    FocusPrev
end

subgraph subGraph1 ["Navigation Commands"]
    SelectAll
    GoToEnd
    BigMove
end

subgraph subGraph0 ["Cross-Platform Input"]
    ModifierKey
    CopyCmd
    PasteCmd
    UndoCmd
    RedoCmd
    ModifierKey --> CopyCmd
    ModifierKey --> PasteCmd
    ModifierKey --> UndoCmd
    ModifierKey --> RedoCmd
end
```

Sources: [test/integration/test_utils.mjs L494-L633](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L494-L633)

## Test Categories and Coverage

Integration tests are organized into distinct categories covering different aspects of PDF.js functionality:

### Editor Testing

| Test Suite | File | Focus Area |
| --- | --- | --- |
| FreeText Editor | `freetext_editor_spec.mjs` | Text annotation creation and editing |
| Stamp Editor | `stamp_editor_spec.mjs` | Image stamp annotations and alt-text |
| Ink Editor | `ink_editor_spec.mjs` | Drawing/sketching functionality |

### Form and Scripting Testing

| Test Suite | File | Focus Area |
| --- | --- | --- |
| Scripting | `scripting_spec.mjs` | PDF JavaScript execution and form interactions |
| Annotations | `annotation_spec.mjs` | Form field behavior and validation |

### User Interface Testing

| Test Suite | File | Focus Area |
| --- | --- | --- |
| Copy/Paste | `copy_paste_spec.mjs` | Text selection and clipboard operations |
| Find | `find_spec.mjs` | Search functionality and highlighting |
| Accessibility | `accessibility_spec.mjs` | Screen reader support and ARIA attributes |
| Caret Browsing | `caret_browsing_spec.mjs` | Keyboard navigation |

## Event-Driven Test Patterns

Integration tests frequently use event-based waiting patterns to ensure reliable test execution:

```mermaid
flowchart TD

WaitForEvent["waitForEvent({page, eventName, action})<br>test_utils.mjs:189-240"]
CreatePromise["createPromise(page, callback)<br>test_utils.mjs:71-77"]
AwaitPromise["awaitPromise(promise)<br>test_utils.mjs:79-81"]
SelectionChange["selectionchange<br>copy_paste_spec.mjs:26-36"]
EditorModeChange["annotationeditormodechanged<br>test_utils.mjs:637-641"]
EditorLayerRender["annotationeditorlayerrendered<br>test_utils.mjs:447-452"]
SandboxTrip["sandboxtripend<br>test_utils.mjs:96-104"]
UserAction["user interaction<br>(click, type, etc)"]
StateValidation["validate result state"]

WaitForEvent --> SelectionChange
WaitForEvent --> EditorModeChange
WaitForEvent --> EditorLayerRender
WaitForEvent --> SandboxTrip
UserAction --> WaitForEvent
WaitForEvent --> StateValidation

subgraph subGraph2 ["Test Actions"]
    UserAction
    StateValidation
end

subgraph subGraph1 ["Common Event Types"]
    SelectionChange
    EditorModeChange
    EditorLayerRender
    SandboxTrip
end

subgraph subGraph0 ["Event Waiting Pattern"]
    WaitForEvent
    CreatePromise
    AwaitPromise
    WaitForEvent --> CreatePromise
    CreatePromise --> AwaitPromise
end
```

Sources: [test/integration/test_utils.mjs L189-L240](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L189-L240)

 [test/integration/copy_paste_spec.mjs L26-L36](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/copy_paste_spec.mjs#L26-L36)

## Annotation Storage Testing

Tests extensively validate the annotation storage system to ensure data persistence and serialization:

```mermaid
flowchart TD

GetSerialized["getSerialized(page, filter)<br>test_utils.mjs:340-360"]
GetStorage["getAnnotationStorage(page)<br>test_utils.mjs:366-373"]
WaitForEntries["waitForStorageEntries(page, n)<br>test_utils.mjs:242-248"]
WaitForSerialized["waitForSerialized(page, n)<br>test_utils.mjs:250-258"]
PDFApp["window.PDFViewerApplication"]
PDFDoc["pdfDocument"]
AnnotStorage["annotationStorage"]
SerializableMap["serializable.map"]
CountCheck["entry count validation"]
ContentCheck["annotation content validation"]
StateCheck["editor state validation"]

GetSerialized --> PDFApp
SerializableMap --> CountCheck
SerializableMap --> ContentCheck
SerializableMap --> StateCheck

subgraph subGraph2 ["Test Validation"]
    CountCheck
    ContentCheck
    StateCheck
end

subgraph subGraph1 ["Storage Access Path"]
    PDFApp
    PDFDoc
    AnnotStorage
    SerializableMap
    PDFApp --> PDFDoc
    PDFDoc --> AnnotStorage
    AnnotStorage --> SerializableMap
end

subgraph subGraph0 ["Storage Operations"]
    GetSerialized
    GetStorage
    WaitForEntries
    WaitForSerialized
end
```

Sources: [test/integration/test_utils.mjs L340-L373](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L340-L373)

 [test/integration/freetext_editor_spec.mjs L747-L753](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/freetext_editor_spec.mjs#L747-L753)

## Browser-Specific Test Handling

Tests account for browser differences and platform-specific behaviors:

```mermaid
flowchart TD

OSCheck["os.platform() === 'darwin'<br>test_utils.mjs:17"]
BrowserName["browserName parameter<br>from test session"]
FirefoxSkip["if (browserName === 'firefox') return<br>stamp_editor_spec.mjs:107-109"]
WindowsSkip["if (process.platform === 'win32') pending<br>scripting_spec.mjs:428-430"]
ModifierKey["modifier = isMac ? 'Meta' : 'Control'<br>test_utils.mjs:494"]
FileUpload["input.uploadFile() - disabled in Firefox<br>stamp_editor_spec.mjs"]
FocusVisible["waitForSelector(':focus-visible')<br>stamp_editor_spec.mjs:404-412"]
ClipboardAPI["navigator.clipboard operations<br>copy_paste_spec.mjs"]

OSCheck --> ModifierKey
BrowserName --> FirefoxSkip
BrowserName --> WindowsSkip
BrowserName --> FocusVisible

subgraph subGraph2 ["Browser-Specific Features"]
    FileUpload
    FocusVisible
    ClipboardAPI
end

subgraph subGraph1 ["Conditional Execution"]
    FirefoxSkip
    WindowsSkip
    ModifierKey
end

subgraph subGraph0 ["Platform Detection"]
    OSCheck
    BrowserName
end
```

Sources: [test/integration/test_utils.mjs L17](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L17-L17)

 [test/integration/stamp_editor_spec.mjs L107-L109](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/stamp_editor_spec.mjs#L107-L109)

 [test/integration/scripting_spec.mjs L428-L430](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/scripting_spec.mjs#L428-L430)

## Test Execution Flow

The typical integration test follows a consistent pattern of setup, interaction, and validation:

```mermaid
flowchart TD

LoadPDF["loadAndWait(filename, selector)<br>Load PDF and wait for element"]
SwitchMode["switchToEditor(type, page)<br>Enter annotation mode"]
MockClipboard["mockClipboard(pages)<br>Setup clipboard simulation"]
ElementInteraction["page.click(), page.type(), page.mouse.move()"]
KeyboardInput["page.keyboard.press(), kbUndo(), kbCopy()"]
WaitForResponse["waitForSelector(), waitForFunction()"]
StorageCheck["waitForStorageEntries(), getSerialized()"]
ElementCheck["getSelectedEditors(), getRect()"]
ContentCheck["page.$eval() for element content"]
ClosePages["closePages(pages)<br>test_utils.mjs:83-85"]
ResetState["page.evaluate(() => localStorage.clear())"]

MockClipboard --> ElementInteraction
WaitForResponse --> StorageCheck
ContentCheck --> ClosePages

subgraph Cleanup ["Cleanup"]
    ClosePages
    ResetState
    ClosePages --> ResetState
end

subgraph subGraph2 ["State Validation"]
    StorageCheck
    ElementCheck
    ContentCheck
    StorageCheck --> ElementCheck
    ElementCheck --> ContentCheck
end

subgraph subGraph1 ["User Interaction Simulation"]
    ElementInteraction
    KeyboardInput
    WaitForResponse
    ElementInteraction --> KeyboardInput
    KeyboardInput --> WaitForResponse
end

subgraph subGraph0 ["Test Setup"]
    LoadPDF
    SwitchMode
    MockClipboard
    LoadPDF --> SwitchMode
    SwitchMode --> MockClipboard
end
```

Sources: [test/integration/test_utils.mjs L83-L94](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/test_utils.mjs#L83-L94)

 [test/integration/freetext_editor_spec.mjs L115-L166](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/freetext_editor_spec.mjs#L115-L166)

 [test/integration/copy_paste_spec.mjs L44-L46](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/copy_paste_spec.mjs#L44-L46)