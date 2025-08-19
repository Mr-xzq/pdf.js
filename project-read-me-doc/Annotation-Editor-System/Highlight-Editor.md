# Highlight Editor

> **Relevant source files**
> * [l10n/en-US/viewer.ftl](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/l10n/en-US/viewer.ftl)
> * [src/display/draw_layer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/draw_layer.js)
> * [src/display/editor/alt_text.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/alt_text.js)
> * [src/display/editor/color_picker.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/color_picker.js)
> * [src/display/editor/highlight.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js)
> * [src/display/editor/outliner.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/outliner.js)
> * [src/display/editor/toolbar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/toolbar.js)
> * [test/draw_layer_test.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/draw_layer_test.css)
> * [test/integration/highlight_editor_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/highlight_editor_spec.mjs)
> * [web/draw_layer_builder.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/draw_layer_builder.css)

The Highlight Editor provides interactive text highlighting functionality within PDF documents, supporting both text-bound highlights (following PDF text selection) and free-form highlights (hand-drawn shapes). This system handles color selection, outline generation, SVG rendering, and user interaction patterns for creating, editing, and managing highlight annotations.

For information about the broader annotation editor framework, see [Editor Architecture](/Mr-xzq/pdf.js-4.4.168/4.1-editor-architecture). For details about other annotation types, see [Annotation and Form Handling](/Mr-xzq/pdf.js-4.4.168/3.4-annotation-and-form-handling).

## Architecture Overview

The Highlight Editor consists of several interconnected components that handle different aspects of the highlighting workflow:

```mermaid
flowchart TD

HT["HighlightToolbar<br>floating button"]
CP["ColorPicker<br>color selection"]
ET["EditorToolbar<br>editor controls"]
HE["HighlightEditor<br>main editor class"]
HL["highlight.js"]
O["Outliner<br>text highlights"]
FO["FreeOutliner<br>free highlights"]
HO["HighlightOutline"]
FHO["FreeHighlightOutline"]
DL["DrawLayer<br>SVG management"]
SVG["SVG Elements<br>highlight & outline"]
TL["Text Layer<br>selection detection"]
TS["Text Selection<br>DOM ranges"]

HT --> HE
CP --> HE
HE --> ET
HE --> O
HE --> FO
HE --> DL
HO --> DL
FHO --> DL
TS --> HE

subgraph subGraph4 ["Text Layer Integration"]
    TL
    TS
    TL --> TS
end

subgraph subGraph3 ["Rendering Layer"]
    DL
    SVG
    DL --> SVG
end

subgraph subGraph2 ["Outline Generation"]
    O
    FO
    HO
    FHO
    O --> HO
    FO --> FHO
end

subgraph subGraph1 ["Core Editor"]
    HE
    HL
end

subgraph subGraph0 ["User Interface Layer"]
    HT
    CP
    ET
end
```

**Sources:** [src/display/editor/highlight.js L1-L831](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L1-L831)

 [src/display/editor/toolbar.js L148-L235](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/toolbar.js#L148-L235)

 [src/display/editor/outliner.js L1-L850](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/outliner.js#L1-L850)

 [src/display/draw_layer.js L24-L245](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/draw_layer.js#L24-L245)

## HighlightEditor Class Structure

The `HighlightEditor` class serves as the central coordinator for all highlighting functionality:

```mermaid
flowchart TD

SHM["startHighlighting()<br>begin free drawing"]
HMM["#highlightMove()<br>mouse tracking"]
EHM["#endHighlight()<br>complete drawing"]
DM["deserialize()<br>load from data"]
AF["#anchorNode<br>#anchorOffset"]
FF["#focusNode<br>#focusOffset"]
BF["#boxes<br>text rectangles"]
CF["#colorPicker<br>ColorPicker instance"]
HF["#highlightOutlines<br>HighlightOutline"]
FF2["#focusOutlines<br>outline for selection"]
IF["#isFreeHighlight<br>boolean flag"]
TF["#thickness<br>line thickness"]
CM["#createOutlines()<br>text highlight paths"]
CFM["#createFreeOutlines()<br>free highlight paths"]
UCM["#updateColor()<br>color changes"]
UTM["#updateThickness()<br>thickness changes"]
SCM["#setCaret()<br>text selection"]
SBM["#serializeBoxes()<br>PDF coordinates"]

AF --> CM
FF --> CM
BF --> CM
CF --> UCM
HF --> CFM
IF --> CFM
TF --> UTM

subgraph subGraph1 ["Key Methods"]
    CM
    CFM
    UCM
    UTM
    SCM
    SBM
end

subgraph subGraph0 ["HighlightEditor Fields"]
    AF
    FF
    BF
    CF
    HF
    FF2
    IF
    TF
end

subgraph subGraph2 ["Static Methods"]
    SHM
    HMM
    EHM
    DM
    SHM --> HMM
    HMM --> EHM
    EHM --> DM
end
```

**Sources:** [src/display/editor/highlight.js L31-L125](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L31-L125)

 [src/display/editor/highlight.js L697-L770](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L697-L770)

 [src/display/editor/highlight.js L772-L828](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L772-L828)

## Text vs Free Highlights

The system supports two distinct highlighting modes with different creation and rendering approaches:

| Feature | Text Highlights | Free Highlights |
| --- | --- | --- |
| **Creation** | Double-click on text | Mouse drag drawing |
| **Anchor Points** | `#anchorNode`, `#focusNode` | Mouse coordinates |
| **Outliner** | `Outliner` class | `FreeOutliner` class |
| **Movement** | Not draggable | Not draggable |
| **Shape** | Follows text layout | Arbitrary path |
| **Thickness** | Fixed | Configurable |

### Text Highlight Creation

Text highlights are created by detecting text selections and converting them to highlight boxes:

```mermaid
sequenceDiagram
  participant User
  participant Text Layer
  participant HighlightEditor
  participant Outliner
  participant DrawLayer

  User->>Text Layer: Double-click text
  Text Layer->>HighlightEditor: Selection event with DOM ranges
  HighlightEditor->>HighlightEditor: Extract
  HighlightEditor->>Outliner: new Outliner(
  Outliner->>Outliner: Generate outline paths
  HighlightEditor->>DrawLayer: highlight(outlines, color)
  DrawLayer->>DrawLayer: Create SVG elements
```

### Free Highlight Creation

Free highlights are created through mouse drawing with real-time path updates:

```mermaid
sequenceDiagram
  participant User
  participant HighlightEditor
  participant FreeOutliner
  participant DrawLayer

  User->>HighlightEditor: Mouse down (pointerdown)
  HighlightEditor->>FreeOutliner: new FreeOutliner(startPoint)
  HighlightEditor->>DrawLayer: highlight() with isPathUpdatable=true
  loop [Mouse Movement]
    User->>HighlightEditor: Mouse move
    HighlightEditor->>FreeOutliner: add(point)
    FreeOutliner->>DrawLayer: updatePath() if point added
  end
  User->>HighlightEditor: Mouse up
  HighlightEditor->>HighlightEditor: finalizeLine()
  HighlightEditor->>HighlightEditor: Create HighlightEditor instance
```

**Sources:** [src/display/editor/highlight.js L151-L175](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L151-L175)

 [src/display/editor/highlight.js L697-L770](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L697-L770)

 [src/display/editor/outliner.js L18-L262](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/outliner.js#L18-L262)

 [src/display/editor/outliner.js L346-L849](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/outliner.js#L346-L849)

## Color Management System

The color picker provides both individual editor controls and global default settings:

```mermaid
flowchart TD

HC["highlightColors<br>Map(name, hex)"]
DC["_defaultColor<br>static field"]
HCN["highlightColorNames<br>color lookup"]
ICP["Individual Editor<br>HIGHLIGHT_COLOR"]
MCP["Main Toolbar<br>HIGHLIGHT_DEFAULT_COLOR"]
CPB["colorPicker button"]
CPD["dropdown menu"]
CPS["color swatches"]

HC --> ICP
HC --> MCP
DC --> ICP
ICP --> CPB
MCP --> CPB

subgraph subGraph2 ["UI Components"]
    CPB
    CPD
    CPS
    CPB --> CPD
    CPD --> CPS
end

subgraph subGraph1 ["ColorPicker Modes"]
    ICP
    MCP
end

subgraph subGraph0 ["Color Configuration"]
    HC
    DC
    HCN
end
```

Color changes trigger command-pattern updates for undo/redo support:

```mermaid
sequenceDiagram
  participant ColorPicker
  participant HighlightEditor
  participant DrawLayer
  participant UIManager

  ColorPicker->>HighlightEditor: ​
  HighlightEditor->>HighlightEditor: Create undo/redo commands
  HighlightEditor->>DrawLayer: changeColor(
  HighlightEditor->>UIManager: updateUI(this)
  HighlightEditor->>HighlightEditor: _reportTelemetry(color_changed)
```

**Sources:** [src/display/editor/color_picker.js L69-L84](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/color_picker.js#L69-L84)

 [src/display/editor/highlight.js L320-L344](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L320-L344)

 [src/display/editor/highlight.js L250-L266](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L250-L266)

## Outline Generation and Rendering

The outline generation system converts highlight areas into SVG paths using sweep line algorithms:

```mermaid
flowchart TD

TB["Text Boxes<br>x,y,width,height"]
VE["Vertical Edges<br>[x,y1,y2,isLeft]"]
IV["Intervals<br>active ranges"]
SL["Sort edges by x coordinate"]
BE["Break edges by intervals"]
LI["Left edge: insert interval"]
RI["Right edge: remove interval"]
OVE["Outline Vertical Edges"]
HP["Horizontal Pairs"]
SP["SVG Path String"]

VE --> SL
LI --> IV
IV --> RI
RI --> OVE

subgraph subGraph2 ["Path Generation"]
    OVE
    HP
    SP
    OVE --> HP
    HP --> SP
end

subgraph subGraph1 ["Sweep Line Algorithm"]
    SL
    BE
    LI
    RI
    SL --> BE
    BE --> LI
end

subgraph subGraph0 ["Input Processing"]
    TB
    VE
    IV
    TB --> VE
end
```

The `DrawLayer` manages SVG elements with proper layering and CSS class management:

| SVG Element | Purpose | CSS Classes |
| --- | --- | --- |
| `svg.highlight` | Main highlight shape | `.highlight`, `.free` (if applicable) |
| `svg.highlightOutline` | Selection outline | `.highlightOutline`, `.selected`, `.hovered` |
| `clipPath` | Editor clipping | Used by editor div |
| `path` | Shape definition | Referenced by `use` elements |

**Sources:** [src/display/editor/outliner.js L88-L176](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/outliner.js#L88-L176)

 [src/display/draw_layer.js L89-L120](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/draw_layer.js#L89-L120)

 [src/display/draw_layer.js L122-L175](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/draw_layer.js#L122-L175)

 [web/draw_layer_builder.css L41-L111](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/draw_layer_builder.css#L41-L111)

## User Interaction Patterns

The highlight editor supports comprehensive keyboard and mouse interactions:

### Keyboard Navigation

```mermaid
flowchart TD

CPK["ArrowUp/Down<br>previous/next color"]
CPS["Space/Enter<br>select color"]
ESC["Escape<br>close dropdown"]
AL["ArrowLeft<br>move to anchor"]
AR["ArrowRight<br>move to focus"]
AU["ArrowUp<br>move to anchor"]
AD["ArrowDown<br>move to focus"]
CB["Caret movement<br>through highlighted text"]
SS["Shift+Selection<br>create highlights"]

AL --> CB
AR --> CB
AU --> CB
AD --> CB

subgraph subGraph2 ["Caret Browsing"]
    CB
    SS
    CB --> SS
end

subgraph subGraph0 ["Text Highlight Controls"]
    AL
    AR
    AU
    AD
end

subgraph subGraph1 ["Color Picker Navigation"]
    CPK
    CPS
    ESC
    CPK --> CPS
    CPS --> ESC
end
```

### Mouse Interactions

| Interaction | Text Highlights | Free Highlights |
| --- | --- | --- |
| **Double-click** | Create from selection | N/A |
| **Click + drag** | N/A | Draw highlight path |
| **Single click** | Select existing highlight | Select existing highlight |
| **Hover** | Show outline | Show outline |
| **Click outside** | Deselect | Deselect |

**Sources:** [src/display/editor/highlight.js L88-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L88-L100)

 [src/display/editor/highlight.js L597-L625](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L597-L625)

 [test/integration/highlight_editor_spec.mjs L665-L721](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/highlight_editor_spec.mjs#L665-L721)

 [test/integration/highlight_editor_spec.mjs L991-L1169](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/highlight_editor_spec.mjs#L991-L1169)

## Serialization and Data Flow

Highlights are serialized to PDF annotation format with coordinate transformation:

```mermaid
sequenceDiagram
  participant HighlightEditor
  participant PDF Coordinates

  HighlightEditor->>PDF Coordinates: Convert
  PDF Coordinates->>PDF Coordinates: Transform page coordinates
  HighlightEditor->>HighlightEditor: Convert outlines to PDF space
  HighlightEditor->>HighlightEditor: Apply rotation matrix
  HighlightEditor->>PDF Coordinates: {annotationType: 9, quadPoints, outlines}
  note over HighlightEditor,PDF Coordinates: annotationType 9 = HIGHLIGHT
```

The serialization includes:

| Field | Type | Purpose |
| --- | --- | --- |
| `annotationType` | Number | Always 9 for highlights |
| `color` | Array | RGB values [r,g,b] |
| `opacity` | Number | Transparency level |
| `thickness` | Number | Line thickness for free highlights |
| `quadPoints` | Float32Array | Text boxes in PDF coordinates |
| `outlines` | Array | SVG path data for rendering |
| `rect` | Array | Bounding rectangle |
| `rotation` | Number | Page rotation angle |

**Sources:** [src/display/editor/highlight.js L801-L823](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L801-L823)

 [src/display/editor/highlight.js L669-L691](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L669-L691)

 [src/display/editor/highlight.js L693-L695](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L693-L695)

 [src/display/editor/highlight.js L772-L799](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/editor/highlight.js#L772-L799)