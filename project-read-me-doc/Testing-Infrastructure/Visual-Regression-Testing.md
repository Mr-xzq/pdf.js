# Visual Regression Testing

> **Relevant source files**
> * [test/driver.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js)
> * [test/font/font_test.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/font/font_test.html)
> * [test/test_slave.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/test_slave.html)
> * [test/unit/unit_test.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/unit_test.html)

## Purpose and Scope

This document covers PDF.js's visual regression testing system, which automatically renders PDF pages and compares the output against reference images to detect rendering regressions. The system generates pixel-perfect snapshots of PDF content across different browsers and configurations to ensure consistent rendering behavior.

For information about unit testing, see [Unit Testing](/Mr-xzq/pdf.js-4.4.168/6.1-unit-testing). For integration testing of user interactions, see [Integration Testing](/Mr-xzq/pdf.js-4.4.168/6.2-integration-testing).

## System Overview

The visual regression testing system operates as a browser-based test harness that loads PDF documents, renders them to canvas elements, and captures snapshots for comparison. The system supports multiple rendering modes including standard page rendering, text layer visualization, annotation layers, and XFA form rendering.

### Test Execution Architecture

```mermaid
flowchart TD

TestSlave["test_slave.html<br>Browser Test Runner"]
Driver["Driver Class<br>Main Orchestrator"]
ManifestFile["manifest.json<br>Test Configuration"]
GetDocument["getDocument API<br>PDF Loading"]
PDFDoc["PDFDocumentProxy<br>Document Instance"]
PageProxy["PDFPageProxy<br>Individual Pages"]
Canvas["HTML5 Canvas<br>Rendering Target"]
Rasterize["Rasterize Class<br>Layer Composition"]
RenderContext["RenderContext<br>Rendering Configuration"]
Snapshot["Canvas.toDataURL<br>PNG Generation"]
ResultSubmission["POST /submit_task_results<br>Server Communication"]
TaskCompletion["Task State Management<br>Page/Round Tracking"]

Driver --> GetDocument
Driver --> Canvas
PageProxy --> RenderContext
Canvas --> Snapshot
TaskCompletion --> Driver

subgraph subGraph3 ["Output Generation"]
    Snapshot
    ResultSubmission
    TaskCompletion
    Snapshot --> ResultSubmission
    ResultSubmission --> TaskCompletion
end

subgraph subGraph2 ["Rendering Pipeline"]
    Canvas
    Rasterize
    RenderContext
    RenderContext --> Canvas
    Rasterize --> Canvas
end

subgraph subGraph1 ["PDF Processing"]
    GetDocument
    PDFDoc
    PageProxy
    GetDocument --> PDFDoc
    PDFDoc --> PageProxy
end

subgraph subGraph0 ["Test Coordination"]
    TestSlave
    Driver
    ManifestFile
    TestSlave --> Driver
    Driver --> ManifestFile
end
```

Sources: [test/driver.js L442-L471](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L442-L471)

 [test/test_slave.html L35-L46](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/test_slave.html#L35-L46)

### Rendering System Components

The `Rasterize` class provides specialized rendering methods for different PDF content layers, each producing SVG-based output that gets rasterized to canvas.

```mermaid
flowchart TD

AnnotationLayer["Rasterize.annotationLayer<br>Forms & Interactive Elements"]
TextLayer["Rasterize.textLayer<br>Text Content Visualization"]
HighlightLayer["Rasterize.highlightLayer<br>Text Selection Boxes"]
XfaLayer["Rasterize.xfaLayer<br>XFA Form Rendering"]
CreateContainer["Rasterize.createContainer<br>SVG + foreignObject"]
StylePromises["Style Loading Promises<br>CSS Combination"]
WriteSVG["writeSVG Function<br>SVG to Canvas"]
InlineImages["inlineImages Function<br>Data URL Conversion"]
LoadImage["loadImage Function<br>Image Rasterization"]

AnnotationLayer --> CreateContainer
TextLayer --> CreateContainer
HighlightLayer --> CreateContainer
XfaLayer --> CreateContainer
StylePromises --> WriteSVG

subgraph subGraph2 ["Output Processing"]
    WriteSVG
    InlineImages
    LoadImage
    WriteSVG --> InlineImages
    InlineImages --> LoadImage
end

subgraph subGraph1 ["SVG Container Creation"]
    CreateContainer
    StylePromises
    CreateContainer --> StylePromises
end

subgraph subGraph0 ["Rasterize Layer Methods"]
    AnnotationLayer
    TextLayer
    HighlightLayer
    XfaLayer
end
```

Sources: [test/driver.js L167-L430](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L167-L430)

## Test Task Processing

### Task Configuration and Execution Flow

The `Driver` class processes test tasks sequentially, where each task represents a PDF document with specific rendering configuration.

| Task Property | Purpose | Example Values |
| --- | --- | --- |
| `file` | PDF document path | `"tracemonkey.pdf"` |
| `type` | Rendering mode | `"eq"`, `"text"`, `"highlight"` |
| `firstPage`/`lastPage` | Page range | `1`, `10` |
| `enableXfa` | XFA form support | `true`, `false` |
| `annotationStorage` | Form field values | `{"field1": "value"}` |
| `outputScale` | Pixel density | `1.0`, `2.0` |

Sources: [test/driver.js L539-L708](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L539-L708)

### Page Rendering Process

```mermaid
flowchart TD

LoadPDF["getDocument() Call<br>PDF Loading Task"]
OptionalContent["getOptionalContentConfig<br>Layer Visibility"]
AnnotationStorage["annotationStorage.setAll<br>Form Data Injection"]
GetPage["pdfDoc.getPage(pageNum)<br>Page Proxy Retrieval"]
Viewport["page.getViewport()<br>Coordinate System"]
CanvasSetup["Canvas Dimensions<br>Pixel Scaling"]
RenderContext["RenderContext Object<br>Configuration Bundle"]
PageRender["page.render(renderContext)<br>Core Rendering"]
LayerComposition["Layer Overlay<br>Text/Annotation Composite"]
CompleteRender["completeRender Callback<br>Rendering Completion"]
CanvasSnapshot["canvas.toDataURL('image/png')<br>PNG Data Generation"]
ResultTransmission["_sendResult Method<br>Server Communication"]

AnnotationStorage --> GetPage
CanvasSetup --> RenderContext
LayerComposition --> CompleteRender

subgraph subGraph3 ["Snapshot Generation"]
    CompleteRender
    CanvasSnapshot
    ResultTransmission
    CompleteRender --> CanvasSnapshot
    CanvasSnapshot --> ResultTransmission
end

subgraph subGraph2 ["Rendering Execution"]
    RenderContext
    PageRender
    LayerComposition
    RenderContext --> PageRender
    PageRender --> LayerComposition
end

subgraph subGraph1 ["Page Setup"]
    GetPage
    Viewport
    CanvasSetup
    GetPage --> Viewport
    Viewport --> CanvasSetup
end

subgraph subGraph0 ["Task Initialization"]
    LoadPDF
    OptionalContent
    AnnotationStorage
    LoadPDF --> OptionalContent
    OptionalContent --> AnnotationStorage
end
```

Sources: [test/driver.js L795-L1021](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L795-L1021)

## Specialized Rendering Modes

### Text Layer Visualization

For `type: "text"` tasks, the system renders text content with a green background overlay to visualize text positioning accuracy.

```mermaid
flowchart TD

GetTextContent["page.getTextContent()<br>Text Extraction"]
TextLayer["TextLayer Class<br>HTML Text Positioning"]
TextCanvas["Separate Canvas<br>Text Layer Rendering"]
GreenBackground["Green Fill Rectangle<br>Background Overlay"]
ScreenComposite["globalCompositeOperation: 'screen'<br>Blending Mode"]
FinalComposite["drawImage(textLayerCanvas)<br>Layer Combination"]

TextCanvas --> GreenBackground

subgraph Composition ["Composition"]
    GreenBackground
    ScreenComposite
    FinalComposite
    GreenBackground --> ScreenComposite
    ScreenComposite --> FinalComposite
end

subgraph subGraph0 ["Text Rendering Pipeline"]
    GetTextContent
    TextLayer
    TextCanvas
    GetTextContent --> TextLayer
    TextLayer --> TextCanvas
end
```

Sources: [test/driver.js L864-L881](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L864-L881)

 [test/driver.js L952-L966](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L952-L966)

### Annotation Layer Testing

The annotation layer rendering system converts PDF annotations to HTML elements within SVG containers for precise visual testing.

```mermaid
flowchart TD

GetAnnotations["page.getAnnotations()<br>Annotation Data"]
CanvasMap["annotationCanvasMap<br>Canvas Element Mapping"]
ConvertCanvas["convertCanvasesToImages<br>Canvas to Image Conversion"]
AnnotationLayer["AnnotationLayer Class<br>HTML Element Creation"]
LinkService["SimpleLinkService<br>Navigation Handling"]
L10nTranslation["document.l10n.translateRoots<br>Localization Processing"]
SVGContainer["SVG foreignObject<br>HTML Content Wrapper"]
StyleInjection["CSS Style Combination<br>Viewer + Override Styles"]
ImageInlining["inlineImages Function<br>Data URL Conversion"]

ConvertCanvas --> AnnotationLayer
L10nTranslation --> SVGContainer

subgraph subGraph2 ["SVG Composition"]
    SVGContainer
    StyleInjection
    ImageInlining
    SVGContainer --> StyleInjection
    StyleInjection --> ImageInlining
end

subgraph subGraph1 ["HTML Generation"]
    AnnotationLayer
    LinkService
    L10nTranslation
    AnnotationLayer --> LinkService
    LinkService --> L10nTranslation
end

subgraph subGraph0 ["Annotation Processing"]
    GetAnnotations
    CanvasMap
    ConvertCanvas
    GetAnnotations --> CanvasMap
    CanvasMap --> ConvertCanvas
end
```

Sources: [test/driver.js L217-L284](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L217-L284)

 [test/driver.js L144-L165](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L144-L165)

## Canvas Management and Output

### Canvas Scaling and Viewport Handling

The system manages multiple canvas instances for different rendering layers, with careful attention to pixel scaling and viewport transformations.

```mermaid
flowchart TD

MainCanvas["this.canvas<br>Primary Rendering Target"]
TextCanvas["this.textLayerCanvas<br>Text Layer Buffer"]
AnnotationCanvas["this.annotationLayerCanvas<br>Annotation Layer Buffer"]
OutputScale["outputScale = task.outputScale || devicePixelRatio<br>Pixel Density"]
PixelDimensions["pixelWidth/Height = viewport * outputScale<br>Canvas Size"]
MaxCanvasLimit["MAX_CANVAS_PIXEL_DIMENSION = 4096<br>Size Constraint"]
ScaleTransform["transform = [outputScale, 0, 0, outputScale, 0, 0]<br>Scaling Matrix"]
ContextScale["context.scale(outputScale, outputScale)<br>Context Transformation"]
ViewportClone["viewport.clone({scale, rotation})<br>Coordinate System"]

MainCanvas --> OutputScale
TextCanvas --> OutputScale
AnnotationCanvas --> OutputScale
MaxCanvasLimit --> ScaleTransform

subgraph subGraph2 ["Transform Application"]
    ScaleTransform
    ContextScale
    ViewportClone
    ScaleTransform --> ContextScale
    ContextScale --> ViewportClone
end

subgraph subGraph1 ["Scaling Calculation"]
    OutputScale
    PixelDimensions
    MaxCanvasLimit
    OutputScale --> PixelDimensions
    PixelDimensions --> MaxCanvasLimit
end

subgraph subGraph0 ["Canvas Allocation"]
    MainCanvas
    TextCanvas
    AnnotationCanvas
end
```

Sources: [test/driver.js L799-L831](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L799-L831)

 [test/driver.js L853-L863](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L853-L863)

### Result Transmission Protocol

Test results are transmitted to the test server via HTTP POST requests containing comprehensive metadata about the rendering context.

| Result Field | Description | Source |
| --- | --- | --- |
| `browser` | Browser identifier | Query parameter |
| `id` | Test case identifier | Manifest task property |
| `snapshot` | Base64 PNG data | `canvas.toDataURL()` |
| `viewportWidth`/`Height` | Logical dimensions | `Math.floor(viewport.width/height)` |
| `outputScale` | Pixel scaling factor | Calculated scale value |
| `failure` | Error message | Exception/error string |
| `stats` | Performance data | `page.stats.times` |

Sources: [test/driver.js L1088-L1105](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/driver.js#L1088-L1105)