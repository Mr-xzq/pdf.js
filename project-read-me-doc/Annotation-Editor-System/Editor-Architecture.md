# Editor Architecture

> **Relevant source files**
> * [src/display/editor/annotation_editor_layer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js)
> * [src/display/editor/editor.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/editor.js)
> * [src/display/editor/freetext.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/freetext.js)
> * [src/display/editor/ink.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/ink.js)
> * [src/display/editor/stamp.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/stamp.js)
> * [src/display/editor/tools.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js)
> * [test/pdfs/issue16278.pdf](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/issue16278.pdf)
> * [web/alt_text_manager.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/alt_text_manager.js)
> * [web/annotation_editor_layer_builder.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_editor_layer_builder.css)
> * [web/annotation_editor_layer_builder.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_editor_layer_builder.js)

## Purpose and Scope

This document covers the annotation editor system architecture in PDF.js, which enables users to create, edit, and manage interactive annotations including freetext, ink drawings, stamps, and highlights directly on PDF pages. The editor system provides a complete annotation authoring experience with undo/redo, keyboard navigation, accessibility support, and platform integration.

For information about the overall web viewer integration, see [Web Viewer Application](/Mr-xzq/pdf.js-4.4.168/3-web-viewer-application). For details about PDF content rendering that editors overlay, see [Page Rendering System](/Mr-xzq/pdf.js-4.4.168/3.3-page-rendering-system).

## Core Architecture Overview

The annotation editor system follows a hierarchical architecture with a global UI manager coordinating page-level layers that contain individual editor instances.

```mermaid
flowchart TD

UIManager["AnnotationEditorUIManager<br>Global state & coordination"]
CommandManager["CommandManager<br>Undo/redo operations"]
ImageManager["ImageManager<br>Image resource management"]
KeyboardManager["KeyboardManager<br>Keyboard shortcuts"]
LayerBuilder["AnnotationEditorLayerBuilder<br>Layer construction"]
EditorLayer["AnnotationEditorLayer<br>Per-page editor management"]
BaseEditor["AnnotationEditor<br>Base editor class"]
FreeTextEditor["FreeTextEditor<br>Text annotations"]
InkEditor["InkEditor<br>Drawing annotations"]
StampEditor["StampEditor<br>Image stamps"]
HighlightEditor["HighlightEditor<br>Text highlighting"]
AltTextManager["AltTextManager<br>Accessibility support"]
ColorManager["ColorManager<br>Color handling"]
IdManager["IdManager<br>Unique ID generation"]

UIManager --> EditorLayer
EditorLayer --> BaseEditor
UIManager --> AltTextManager
UIManager --> ColorManager
UIManager --> IdManager

subgraph subGraph3 ["Supporting Systems"]
    AltTextManager
    ColorManager
    IdManager
end

subgraph subGraph2 ["Individual Editors"]
    BaseEditor
    FreeTextEditor
    InkEditor
    StampEditor
    HighlightEditor
    BaseEditor --> FreeTextEditor
    BaseEditor --> InkEditor
    BaseEditor --> StampEditor
    BaseEditor --> HighlightEditor
end

subgraph subGraph1 ["Page Layer Management"]
    LayerBuilder
    EditorLayer
    LayerBuilder --> EditorLayer
end

subgraph subGraph0 ["Global Coordination"]
    UIManager
    CommandManager
    ImageManager
    KeyboardManager
    UIManager --> CommandManager
    UIManager --> ImageManager
    UIManager --> KeyboardManager
end
```

Sources: [src/display/editor/tools.js L536-L1400](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js#L536-L1400)

 [src/display/editor/annotation_editor_layer.js L57-L127](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js#L57-L127)

 [src/display/editor/editor.js L42-L178](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/editor.js#L42-L178)

## UI Management System

The `AnnotationEditorUIManager` serves as the central coordinator for all annotation editing functionality. It maintains global state, handles cross-page operations, and coordinates between different editor types.

### Key Responsibilities

| Component | Purpose | Key Methods |
| --- | --- | --- |
| Mode Management | Controls editing modes (NONE, FREETEXT, INK, STAMP, HIGHLIGHT) | `updateMode()`, `getMode()` |
| Selection Management | Tracks selected editors across pages | `setSelected()`, `selectAll()`, `unselectAll()` |
| Event Coordination | Handles global keyboard shortcuts and events | `keydown()`, `copy()`, `paste()` |
| Layer Registration | Manages `AnnotationEditorLayer` instances | `addLayer()`, `removeLayer()` |

```mermaid
flowchart TD

Mode["#mode<br>Current editing mode"]
ActiveEditor["#activeEditor<br>Currently active editor"]
SelectedEditors["#selectedEditors<br>Set of selected editors"]
AllLayers["#allLayers<br>Map of page layers"]
AllEditors["#allEditors<br>Map of all editors"]
Copy["copy()<br>Serialize selected editors"]
Paste["paste()<br>Deserialize and create editors"]
Undo["undo()<br>Delegate to CommandManager"]
Delete["delete()<br>Remove selected editors"]

Mode --> Copy
SelectedEditors --> Copy
AllLayers --> Paste
AllEditors --> Delete

subgraph subGraph1 ["Global Operations"]
    Copy
    Paste
    Undo
    Delete
    Copy --> Paste
end

subgraph subGraph0 ["AnnotationEditorUIManager State"]
    Mode
    ActiveEditor
    SelectedEditors
    AllLayers
    AllEditors
end
```

Sources: [src/display/editor/tools.js L536-L817](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js#L536-L817)

 [src/display/editor/tools.js L1243-L1336](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js#L1243-L1336)

## Layer Management

Each PDF page has an associated `AnnotationEditorLayer` that manages editors specific to that page. The layer handles editor lifecycle, coordinates with the underlying PDF page, and manages editor positioning and rendering.

### Layer Creation and Management

```mermaid
flowchart TD

ViewerApp["PDFViewerApplication<br>Requests layer creation"]
LayerBuilder["AnnotationEditorLayerBuilder<br>Constructs layer"]
LayerDiv["Layer DOM element<br>.annotationEditorLayer"]
UIManager["AnnotationEditorUIManager<br>Global coordinator"]
Viewport["PageViewport<br>Page dimensions & rotation"]
TextLayer["TextLayer<br>For highlight editors"]
AnnotationLayer["AnnotationLayer<br>Existing annotations"]
EditorTypes["Editor Type Registry<br>FreeTextEditor, InkEditor, etc."]
EditorInstances["Active Editor Instances<br>editors Map()"]
EditorLifecycle["Editor Lifecycle<br>add(), remove(), attach(), detach()"]

UIManager --> LayerBuilder
Viewport --> LayerBuilder
TextLayer --> LayerBuilder
AnnotationLayer --> LayerBuilder
LayerBuilder --> EditorTypes

subgraph subGraph2 ["Editor Management"]
    EditorTypes
    EditorInstances
    EditorLifecycle
    EditorTypes --> EditorInstances
    EditorInstances --> EditorLifecycle
end

subgraph subGraph1 ["Layer Dependencies"]
    UIManager
    Viewport
    TextLayer
    AnnotationLayer
end

subgraph subGraph0 ["Layer Builder Process"]
    ViewerApp
    LayerBuilder
    LayerDiv
    ViewerApp --> LayerBuilder
    LayerBuilder --> LayerDiv
end
```

Sources: [web/annotation_editor_layer_builder.js L42-L121](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_editor_layer_builder.js#L42-L121)

 [src/display/editor/annotation_editor_layer.js L96-L126](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js#L96-L126)

 [src/display/editor/annotation_editor_layer.js L506-L525](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js#L506-L525)

## Editor Types and Hierarchy

All editors inherit from the base `AnnotationEditor` class, which provides common functionality for positioning, selection, resizing, and lifecycle management.

### Editor Class Hierarchy

```mermaid
flowchart TD

AnnotationEditor["AnnotationEditor<br>Base class with common functionality"]
CommonFeatures["Common Features:<br>• Position & dimensions<br>• Selection & focus<br>• Resize handles<br>• Keyboard navigation<br>• Undo/redo integration"]
FreeTextEditor["FreeTextEditor<br>• Editable text content<br>• Font size & color<br>• Multi-line support"]
InkEditor["InkEditor<br>• Canvas-based drawing<br>• Bezier curve paths<br>• Pressure sensitivity"]
StampEditor["StampEditor<br>• Image bitmap rendering<br>• File upload & paste<br>• Aspect ratio preservation"]
HighlightEditor["HighlightEditor<br>• Text selection overlay<br>• Color highlighting<br>• Text extraction"]

AnnotationEditor --> FreeTextEditor
AnnotationEditor --> InkEditor
AnnotationEditor --> StampEditor
AnnotationEditor --> HighlightEditor

subgraph subGraph1 ["Concrete Editor Types"]
    FreeTextEditor
    InkEditor
    StampEditor
    HighlightEditor
end

subgraph subGraph0 ["Base Editor Class"]
    AnnotationEditor
    CommonFeatures
    AnnotationEditor --> CommonFeatures
end
```

### Editor Type Registration

```mermaid
flowchart TD

EditorTypes["AnnotationEditorLayer.#editorTypes<br>Map of type → class"]
TypeConstants["AnnotationEditorType<br>FREETEXT, INK, STAMP, HIGHLIGHT"]
EditorClasses["Editor Classes<br>_type & _editorType properties"]
GetCurrentType["#currentEditorType<br>Based on UI mode"]
CreateEditor["#createNewEditor()<br>Instantiate editor"]
AddToLayer["add()<br>Add to layer"]

EditorTypes --> GetCurrentType

subgraph subGraph1 ["Creation Process"]
    GetCurrentType
    CreateEditor
    AddToLayer
    GetCurrentType --> CreateEditor
    CreateEditor --> AddToLayer
end

subgraph subGraph0 ["Editor Type System"]
    EditorTypes
    TypeConstants
    EditorClasses
    TypeConstants --> EditorTypes
    EditorClasses --> EditorTypes
end
```

Sources: [src/display/editor/editor.js L42-L178](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/editor.js#L42-L178)

 [src/display/editor/annotation_editor_layer.js L86-L91](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js#L86-L91)

 [src/display/editor/annotation_editor_layer.js L599-L614](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js#L599-L614)

## Supporting Systems

The editor architecture includes several specialized manager classes that handle specific concerns across the editing system.

### Command Management

The `CommandManager` implements the Command pattern for undo/redo functionality:

```mermaid
flowchart TD

Command["Command Object<br>{cmd, undo, post, type}"]
CommandBuffer["Commands Array<br>Circular buffer"]
Position["Position Index<br>Current command position"]
Add["add()<br>Add new command"]
Undo["undo()<br>Execute undo function"]
Redo["redo()<br>Execute cmd function"]
OverwriteCheck["overwriteIfSameType<br>Optimize consecutive operations"]

OverwriteCheck --> CommandBuffer
CommandBuffer --> Undo
CommandBuffer --> Redo

subgraph subGraph1 ["Command Operations"]
    Add
    Undo
    Redo
    OverwriteCheck
    Add --> OverwriteCheck
end

subgraph subGraph0 ["Command Structure"]
    Command
    CommandBuffer
    Position
    Command --> CommandBuffer
    CommandBuffer --> Position
end
```

### Image Management

The `ImageManager` handles image resources with caching and reference counting:

```mermaid
flowchart TD

FileUpload["File Upload<br>getFromFile()"]
URLFetch["URL Fetch<br>getFromUrl()"]
CachedId["Cached ID<br>getFromId()"]
Cache["Image Cache<br>Map with metadata"]
RefCount["Reference Counting<br>Track usage"]
BitmapCreation["createImageBitmap()<br>Browser API"]
SVGHandling["SVG Special Handling<br>preserveAspectRatio"]

FileUpload --> Cache
URLFetch --> Cache
CachedId --> Cache

subgraph subGraph1 ["Image Processing"]
    Cache
    RefCount
    BitmapCreation
    SVGHandling
    Cache --> RefCount
    Cache --> BitmapCreation
    Cache --> SVGHandling
end

subgraph subGraph0 ["Image Sources"]
    FileUpload
    URLFetch
    CachedId
end
```

Sources: [src/display/editor/tools.js L239-L374](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js#L239-L374)

 [src/display/editor/tools.js L86-L231](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js#L86-L231)

## Interaction Flow

User interactions flow through multiple layers of the system, from DOM events to editor modifications and persistence.

### Event Flow Architecture

```

```

### Mode Switching Flow

```

```

Sources: [src/display/editor/annotation_editor_layer.js L150-L187](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/annotation_editor_layer.js#L150-L187)

 [src/display/editor/tools.js L1342-L1464](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/tools.js#L1342-L1464)