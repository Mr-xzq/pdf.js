# Page Rendering System

> **Relevant source files**
> * [src/display/text_layer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/text_layer.js)
> * [test/unit/pdf_find_controller_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/pdf_find_controller_spec.js)
> * [test/unit/ui_utils_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/ui_utils_spec.js)
> * [web/annotation_layer_builder.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_layer_builder.js)
> * [web/interfaces.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/interfaces.js)
> * [web/pdf_find_bar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_find_bar.js)
> * [web/pdf_find_controller.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_find_controller.js)
> * [web/pdf_history.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_history.js)
> * [web/pdf_link_service.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_link_service.js)
> * [web/pdf_page_view.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js)
> * [web/pdf_rendering_queue.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_rendering_queue.js)
> * [web/pdf_thumbnail_view.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_thumbnail_view.js)
> * [web/pdf_thumbnail_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_thumbnail_viewer.js)
> * [web/pdf_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_viewer.js)
> * [web/text_layer_builder.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/text_layer_builder.js)
> * [web/ui_utils.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/ui_utils.js)

## Purpose and Scope

The Page Rendering System is responsible for rendering individual PDF pages in the web viewer, including the coordination of multiple visual layers and user interaction capabilities. This system takes parsed PDF content and transforms it into interactive web elements with proper layering for text selection, annotations, and visual display.

This document covers the rendering of individual pages and their constituent layers. For information about PDF content parsing and processing, see [Core PDF Processing Engine](/Mr-xzq/pdf.js-4.4.168/2-core-pdf-processing-engine). For information about the overall viewer application architecture, see [Application Architecture](/Mr-xzq/pdf.js-4.4.168/3.1-application-architecture).

## Architecture Overview

The page rendering system follows a multi-layer architecture where each PDF page is represented by a `PDFPageView` instance that manages several specialized layers stacked on top of each other.

### Core Components

```mermaid
flowchart TD

PDFViewer["PDFViewer<br>Container & Lifecycle"]
PDFRenderingQueue["PDFRenderingQueue<br>Priority Management"]
PDFPageView["PDFPageView<br>Individual Page Rendering"]
LayerOrder["LAYERS_ORDER Map<br>canvasWrapper: 0<br>textLayer: 1<br>annotationLayer: 2<br>annotationEditorLayer: 3"]
LayerBuilders["Layer Builders<br>TextLayerBuilder<br>AnnotationLayerBuilder<br>AnnotationEditorLayerBuilder"]
CanvasWrapper["canvasWrapper<br>PDF Content Rendering"]
TextLayer["textLayer<br>Text Selection & Search"]
AnnotationLayer["annotationLayer<br>Interactive Forms & Links"]
AnnotationEditorLayer["annotationEditorLayer<br>Annotation Editing"]
XfaLayer["xfaLayer<br>XFA Form Rendering"]

PDFPageView --> LayerBuilders
LayerBuilders --> CanvasWrapper
LayerBuilders --> TextLayer
LayerBuilders --> AnnotationLayer
LayerBuilders --> AnnotationEditorLayer
LayerBuilders --> XfaLayer
LayerOrder --> PDFPageView

subgraph subGraph2 ["Rendering Layers"]
    CanvasWrapper
    TextLayer
    AnnotationLayer
    AnnotationEditorLayer
    XfaLayer
end

subgraph subGraph1 ["Layer Management"]
    LayerOrder
    LayerBuilders
end

subgraph subGraph0 ["Page Rendering Coordination"]
    PDFViewer
    PDFRenderingQueue
    PDFPageView
    PDFViewer --> PDFPageView
    PDFRenderingQueue --> PDFPageView
end
```

Sources: [web/pdf_page_view.js L104-L110](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L104-L110)

 [web/pdf_viewer.js L939-L955](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_viewer.js#L939-L955)

 [web/pdf_rendering_queue.js L29-L45](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_rendering_queue.js#L29-L45)

## PDFPageView - Core Page Rendering

The `PDFPageView` class is the central component responsible for rendering individual PDF pages. Each page in the viewer is represented by a `PDFPageView` instance that manages the page's lifecycle, dimensions, and layer coordination.

### PDFPageView Structure

```mermaid
flowchart TD

PDFPageView["PDFPageView"]
id["id: page number"]
renderingId["renderingId: 'page' + id"]
pdfPage["pdfPage: PDFPageProxy"]
viewport["viewport: PageViewport"]
div["div: HTML container"]
renderingState["#renderingState: RenderingStates"]
renderTask["renderTask: RenderTask"]
resume["resume: continuation function"]
textLayer["textLayer: TextLayerBuilder"]
annotationLayer["annotationLayer: AnnotationLayerBuilder"]
annotationEditorLayer["annotationEditorLayer: AnnotationEditorLayerBuilder"]
xfaLayer["xfaLayer: XfaLayerBuilder"]
canvas["canvas: HTMLCanvasElement"]

PDFPageView --> id
PDFPageView --> renderingId
PDFPageView --> pdfPage
PDFPageView --> viewport
PDFPageView --> div
PDFPageView --> renderingState
PDFPageView --> renderTask
PDFPageView --> resume
PDFPageView --> textLayer
PDFPageView --> annotationLayer
PDFPageView --> annotationEditorLayer
PDFPageView --> xfaLayer
PDFPageView --> canvas

subgraph subGraph2 ["Layer References"]
    textLayer
    annotationLayer
    annotationEditorLayer
    xfaLayer
    canvas
end

subgraph subGraph1 ["Rendering State"]
    renderingState
    renderTask
    resume
end

subgraph subGraph0 ["Core Properties"]
    id
    renderingId
    pdfPage
    viewport
    div
end
```

Sources: [web/pdf_page_view.js L115-L195](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L115-L195)

 [web/pdf_page_view.js L258-L293](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L258-L293)

### Page Rendering Lifecycle

The `PDFPageView.draw()` method orchestrates the complete rendering process:

```mermaid
sequenceDiagram
  participant Application
  participant PDFPageView
  participant Canvas Context
  participant TextLayerBuilder
  participant AnnotationLayerBuilder
  participant AnnotationEditorLayerBuilder

  Application->>PDFPageView: draw()
  PDFPageView->>PDFPageView: validate renderingState = INITIAL
  PDFPageView->>PDFPageView: create canvasWrapper div
  PDFPageView->>PDFPageView: ​
  loop [textLayerMode != DISABLE]
    PDFPageView->>TextLayerBuilder: new TextLayerBuilder()
    PDFPageView->>TextLayerBuilder: setup with highlighter & accessibility
    PDFPageView->>AnnotationLayerBuilder: new AnnotationLayerBuilder()
    PDFPageView->>AnnotationLayerBuilder: setup with linkService & downloadManager
    PDFPageView->>Canvas Context: create canvas element
    PDFPageView->>Canvas Context: getContext("2d")
    PDFPageView->>PDFPageView: calculate outputScale & dimensions
    PDFPageView->>PDFPageView: pdfPage.render(renderContext)
    note over PDFPageView: Rendering continues asynchronously
    PDFPageView->>PDFPageView: ​
    PDFPageView->>PDFPageView: ​
    PDFPageView->>AnnotationEditorLayerBuilder: new AnnotationEditorLayerBuilder()
    PDFPageView->>PDFPageView: ​
  end
```

Sources: [web/pdf_page_view.js L879-L1114](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L879-L1114)

 [web/pdf_page_view.js L377-L431](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L377-L431)

## Layer Management System

The page rendering system uses a strict layering approach where each layer type has a predefined z-index order managed by the `LAYERS_ORDER` map.

### Layer Ordering and Management

```mermaid
flowchart TD

L0["canvasWrapper (z-index: 0)<br>PDF visual content"]
L1["textLayer (z-index: 1)<br>Invisible text for selection"]
L2["annotationLayer (z-index: 2)<br>Forms, links, widgets"]
L3["annotationEditorLayer (z-index: 3)<br>Annotation editing UI"]
L3Alt["xfaLayer (z-index: 3)<br>XFA form content"]
LayersArray["#layers[4]<br>Array tracking layer elements"]
AddLayer["#addLayer(div, name)<br>Inserts layer in correct position"]
LayersOrder["LAYERS_ORDER Map<br>Defines layer positioning"]

AddLayer --> L0
AddLayer --> L1
AddLayer --> L2
AddLayer --> L3

subgraph subGraph1 ["Layer Management"]
    LayersArray
    AddLayer
    LayersOrder
    LayersOrder --> AddLayer
    AddLayer --> LayersArray
end

subgraph subGraph0 ["Layer Stack (bottom to top)"]
    L0
    L1
    L2
    L3
    L3Alt
    L0 --> L1
    L1 --> L2
    L2 --> L3
    L2 --> L3Alt
end
```

The `#addLayer()` method ensures proper DOM insertion order:

```

```

Sources: [web/pdf_page_view.js L104-L110](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L104-L110)

 [web/pdf_page_view.js L240-L256](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L240-L256)

## Rendering Coordination

The rendering system uses `PDFRenderingQueue` to coordinate rendering priority across multiple pages and optimize performance.

### Rendering Queue Priority System

```mermaid
flowchart TD

Initial["INITIAL (0)<br>Not started"]
Running["RUNNING (1)<br>Currently rendering"]
Paused["PAUSED (2)<br>Temporarily stopped"]
Finished["FINISHED (3)<br>Completed"]
Visible["Visible Pages<br>Highest Priority"]
Adjacent["Adjacent Pages<br>Medium Priority"]
Holes["Layout Holes<br>Fill gaps in spreads"]
PreRender["Pre-render<br>Next/previous pages"]
RenderingQueue["PDFRenderingQueue"]
HighestPriority["getHighestPriority()"]
IsViewFinished["isViewFinished()"]
RenderView["renderView()"]

Visible --> HighestPriority
Adjacent --> HighestPriority
Holes --> HighestPriority
PreRender --> HighestPriority

subgraph subGraph2 ["Queue Management"]
    RenderingQueue
    HighestPriority
    IsViewFinished
    RenderView
    HighestPriority --> RenderingQueue
    RenderingQueue --> IsViewFinished
    RenderingQueue --> RenderView
end

subgraph subGraph0 ["Priority Determination"]
    Visible
    Adjacent
    Holes
    PreRender
end

subgraph subGraph1 ["Rendering States"]
    Initial
    Running
    Paused
    Finished
    Initial --> Running
    Running --> Paused
    Running --> Finished
    Paused --> Running
end
```

Sources: [web/pdf_rendering_queue.js L106-L165](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_rendering_queue.js#L106-L165)

 [web/ui_utils.js L26-L31](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/ui_utils.js#L26-L31)

## Layer Types and Builders

Each layer type has a specialized builder class that handles the creation, rendering, and lifecycle management of that layer.

### Text Layer System

```mermaid
flowchart TD

TextLayerBuilder["TextLayerBuilder<br>High-level coordination"]
TextLayer["TextLayer<br>Core text rendering"]
TextHighlighter["TextHighlighter<br>Search highlighting"]
TextAccessibility["TextAccessibilityManager<br>Screen reader support"]
StreamTextContent["pdfPage.streamTextContent()"]
ProcessItems["#processItems()"]
AppendText["#appendText()"]
Layout["#layout()"]
TextDiv["div.textLayer"]
TextSpans["span elements<br>Positioned text items"]
EndOfContent["div.endOfContent<br>Selection helper"]

TextLayer --> StreamTextContent
Layout --> TextDiv
Layout --> TextSpans
TextLayerBuilder --> EndOfContent

subgraph subGraph2 ["DOM Structure"]
    TextDiv
    TextSpans
    EndOfContent
end

subgraph subGraph1 ["Text Processing"]
    StreamTextContent
    ProcessItems
    AppendText
    Layout
    StreamTextContent --> ProcessItems
    ProcessItems --> AppendText
    AppendText --> Layout
end

subgraph subGraph0 ["Text Layer Architecture"]
    TextLayerBuilder
    TextLayer
    TextHighlighter
    TextAccessibility
    TextLayerBuilder --> TextLayer
    TextLayerBuilder --> TextHighlighter
    TextLayerBuilder --> TextAccessibility
end
```

The text layer creates invisible, selectable text elements positioned over the PDF content:

Sources: [web/text_layer_builder.js L40-L115](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/text_layer_builder.js#L40-L115)

 [src/display/text_layer.js L45-L153](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/text_layer.js#L45-L153)

 [src/display/text_layer.js L285-L394](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/text_layer.js#L285-L394)

### Annotation Layer System

```mermaid
flowchart TD

AnnotationLayerBuilder["AnnotationLayerBuilder<br>Coordinates annotation rendering"]
AnnotationLayer["AnnotationLayer<br>Core annotation display"]
LinkService["IPDFLinkService<br>Navigation handling"]
DownloadManager["IDownloadManager<br>File operations"]
Links["Link Annotations<br>Navigation & external links"]
Forms["Form Widgets<br>Input fields, buttons"]
Markup["Markup Annotations<br>Highlights, notes"]
MediaWidgets["Media Widgets<br>Rich content"]
ScriptingManager["PDFScriptingManager<br>JavaScript execution"]
FieldObjects["Field Objects<br>Form field definitions"]
AnnotationStorage["AnnotationStorage<br>Form data persistence"]

AnnotationLayer --> Links
AnnotationLayer --> Forms
AnnotationLayer --> Markup
AnnotationLayer --> MediaWidgets
AnnotationLayerBuilder --> ScriptingManager
AnnotationLayerBuilder --> FieldObjects
AnnotationLayerBuilder --> AnnotationStorage

subgraph subGraph2 ["Scripting & Interaction"]
    ScriptingManager
    FieldObjects
    AnnotationStorage
end

subgraph subGraph1 ["Annotation Types"]
    Links
    Forms
    Markup
    MediaWidgets
end

subgraph subGraph0 ["Annotation Architecture"]
    AnnotationLayerBuilder
    AnnotationLayer
    LinkService
    DownloadManager
    AnnotationLayerBuilder --> AnnotationLayer
    AnnotationLayerBuilder --> LinkService
    AnnotationLayerBuilder --> DownloadManager
end
```

Sources: [web/annotation_layer_builder.js L50-L91](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_layer_builder.js#L50-L91)

 [web/annotation_layer_builder.js L99-L130](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_layer_builder.js#L99-L130)

## Rendering Pipeline

The complete rendering pipeline coordinates multiple asynchronous operations to produce the final page display.

### Complete Page Rendering Flow

```mermaid
flowchart TD

Start["PDFPageView.draw()"]
ValidateState["renderingState == INITIAL?"]
Error["throw error"]
SetRunning["renderingState = RUNNING"]
CreateCanvas["Create canvas & wrapper"]
SetupLayers["Setup layer builders"]
StartRender["pdfPage.render(renderContext)"]
RenderPromise["renderTask.promise"]
ShowCanvas["showCanvas(true)"]
FinishRender["#finishRenderTask()"]
SetFinished["renderingState = FINISHED"]
RenderText["#renderTextLayer()"]
RenderAnnotations["#renderAnnotationLayer()"]
CheckEditor["annotationEditorUIManager?"]
CreateDrawLayer["new DrawLayerBuilder()"]
RenderDraw["#renderDrawLayer()"]
CreateEditor["new AnnotationEditorLayerBuilder()"]
RenderEditor["#renderAnnotationEditorLayer()"]
CheckXFA["pdfPage.isPureXfa?"]
CreateXFA["new XfaLayerBuilder()"]
RenderXFA["#renderXfaLayer()"]
Complete["Rendering complete"]
HandleError["#finishRenderTask(error)"]

Start --> ValidateState
ValidateState --> Error
ValidateState --> SetRunning
SetRunning --> CreateCanvas
CreateCanvas --> SetupLayers
SetupLayers --> StartRender
StartRender --> RenderPromise
RenderPromise --> ShowCanvas
ShowCanvas --> FinishRender
FinishRender --> SetFinished
SetFinished --> RenderText
RenderText --> RenderAnnotations
RenderAnnotations --> CheckEditor
CheckEditor --> CreateDrawLayer
CreateDrawLayer --> RenderDraw
RenderDraw --> CreateEditor
CreateEditor --> RenderEditor
CheckEditor --> CheckXFA
RenderEditor --> CheckXFA
CheckXFA --> CreateXFA
CreateXFA --> RenderXFA
CheckXFA --> Complete
RenderXFA --> Complete
RenderPromise --> HandleError
HandleError --> Complete
```

### Layer Rendering Coordination

```mermaid
sequenceDiagram
  participant PDFPageView
  participant Canvas Rendering
  participant Text Layer
  participant Annotation Layer
  participant Editor Layer
  participant Event Bus

  PDFPageView->>Canvas Rendering: Start PDF content rendering
  Canvas Rendering-->>PDFPageView: onContinue callback (for pause/resume)
  loop [Asynchronous Layer Rendering]
    Canvas Rendering->>Canvas Rendering: Render PDF graphics
    PDFPageView->>Text Layer: ​
    Text Layer->>Text Layer: Process text content
    Text Layer-->>Event Bus: "textlayerrendered"
    PDFPageView->>Annotation Layer: ​
    Annotation Layer->>Annotation Layer: Create annotation elements
    Annotation Layer-->>Event Bus: "annotationlayerrendered"
    PDFPageView->>Editor Layer: ​
    Editor Layer->>Editor Layer: Setup editing UI
    Editor Layer-->>Event Bus: "annotationeditorlayerrendered"
  end
  Canvas Rendering-->>PDFPageView: Rendering complete
  PDFPageView-->>Event Bus: "pagerendered"
```

Sources: [web/pdf_page_view.js L1044-L1092](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L1044-L1092)

 [web/pdf_page_view.js L434-L451](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L434-L451)

 [web/pdf_page_view.js L845-L877](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_page_view.js#L845-L877)