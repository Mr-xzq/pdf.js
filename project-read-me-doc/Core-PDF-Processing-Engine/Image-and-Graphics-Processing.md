# Image and Graphics Processing

> **Relevant source files**
> * [src/core/annotation.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/annotation.js)
> * [src/core/catalog.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/catalog.js)
> * [src/core/chunked_stream.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/chunked_stream.js)
> * [src/core/colorspace.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/colorspace.js)
> * [src/core/document.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/document.js)
> * [src/core/evaluator.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js)
> * [src/core/font_renderer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/font_renderer.js)
> * [src/core/fonts.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js)
> * [src/core/function.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/function.js)
> * [src/core/image.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/image.js)
> * [src/core/jbig2.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/jbig2.js)
> * [src/core/jpg.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/jpg.js)
> * [src/core/jpx.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/jpx.js)
> * [src/core/parser.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/parser.js)
> * [src/core/pattern.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/pattern.js)
> * [src/core/pdf_manager.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/pdf_manager.js)
> * [src/core/stream.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/stream.js)
> * [src/core/worker.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/worker.js)
> * [src/display/annotation_layer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/annotation_layer.js)
> * [src/display/api.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/api.js)
> * [src/display/canvas.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js)
> * [src/display/font_loader.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/font_loader.js)
> * [src/display/pattern_helper.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/pattern_helper.js)
> * [src/shared/util.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/shared/util.js)
> * [test/annotation_layer_builder_overrides.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/annotation_layer_builder_overrides.css)
> * [test/pdfs/.gitignore](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/.gitignore)
> * [test/pdfs/issue13999.pdf.link](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/issue13999.pdf.link)
> * [test/pdfs/issue15604.pdf.link](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/issue15604.pdf.link)
> * [test/test_manifest.json](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/test_manifest.json)
> * [test/unit/annotation_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/annotation_spec.js)
> * [test/unit/api_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/api_spec.js)
> * [test/unit/colorspace_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/colorspace_spec.js)
> * [test/unit/parser_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/parser_spec.js)
> * [test/unit/util_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/util_spec.js)
> * [web/annotation_layer_builder.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_layer_builder.css)

This document covers the image decoding, color space handling, pattern processing, and graphics rendering systems within PDF.js's core PDF processing engine. This includes image format decoders (JPEG, JPEG2000, JBIG2), color space transformations, pattern rendering, and the canvas-based graphics output system.

For content stream parsing and operator processing, see [Content Stream Processing](/Mr-xzq/pdf.js-4.4.168/2.2-content-stream-processing). For font rendering, see [Font and Character Mapping](/Mr-xzq/pdf.js-4.4.168/2.3-font-and-character-mapping).

## Image Processing Pipeline

The image processing pipeline handles decoding of various image formats embedded in PDF documents and prepares them for rendering. The system supports multiple image formats including JPEG, JPEG2000, JBIG2, and inline images.

```mermaid
flowchart TD

CS["Content Stream"]
IE["Image Evaluator<br>(buildPaintImageXObject)"]
PDFImg["PDFImage<br>Constructor"]
FD["Format Detection"]
JPEG["JpegImage<br>(jpg.js)"]
JPX["JpxImage<br>(jpx.js)"]
JBIG2["Jbig2Image<br>(jbig2.js)"]
Generic["Generic Image<br>Processing"]
CS1["ColorSpace<br>Transformation"]
ColorData["Color-Corrected<br>Image Data"]
Resize["ImageResizer<br>(Optional)"]
Cache["Image Cache<br>(GlobalImageCache)"]
Canvas["Canvas Rendering<br>(CanvasGraphics)"]

PDFImg --> FD
JPEG --> CS1
JPX --> CS1
JBIG2 --> CS1
Generic --> CS1
ColorData --> Resize

subgraph subGraph3 ["Output Preparation"]
    Resize
    Cache
    Canvas
    Resize --> Cache
    Cache --> Canvas
end

subgraph subGraph2 ["Color Processing"]
    CS1
    ColorData
    CS1 --> ColorData
end

subgraph subGraph1 ["Format Detection & Decoding"]
    FD
    JPEG
    JPX
    JBIG2
    Generic
    FD --> JPEG
    FD --> JPX
    FD --> JBIG2
    FD --> Generic
end

subgraph subGraph0 ["Image Discovery"]
    CS
    IE
    PDFImg
    CS --> IE
    IE --> PDFImg
end
```

Sources: [src/core/evaluator.js L575-L650](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js#L575-L650)

 [src/core/image.js L35-L1007](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/image.js#L35-L1007)

 [src/core/jpg.js L1-L1500](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/jpg.js#L1-L1500)

 [src/core/jpx.js L1-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/jpx.js#L1-L100)

### PDFImage Class Architecture

The `PDFImage` class in [src/core/image.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/image.js)

 serves as the central coordinator for image processing. It handles format detection, delegates to appropriate decoders, and manages color space transformations.

```mermaid
flowchart TD

Constructor["PDFImage<br>constructor()"]
CreatePixels["createPixels()"]
GetBytes["getBytes()"]
DrawableFromSource["drawableFromSource()"]
JpegDecoder["JpegImage<br>(jpg.js)"]
JpxDecoder["JpxImage<br>(jpx.js)"]
Jbig2Decoder["Jbig2Image<br>(jbig2.js)"]
ImageResizer["ImageResizer"]
ColorSpaceHandler["ColorSpace"]
ImageUtils["convertToRGBA()<br>convertBlackAndWhiteToRGBA()"]

CreatePixels --> JpegDecoder
CreatePixels --> JpxDecoder
CreatePixels --> Jbig2Decoder
CreatePixels --> ImageResizer
CreatePixels --> ColorSpaceHandler
CreatePixels --> ImageUtils

subgraph subGraph2 ["Processing Components"]
    ImageResizer
    ColorSpaceHandler
    ImageUtils
end

subgraph subGraph1 ["Format-Specific Decoders"]
    JpegDecoder
    JpxDecoder
    Jbig2Decoder
end

subgraph subGraph0 ["PDFImage Class"]
    Constructor
    CreatePixels
    GetBytes
    DrawableFromSource
    Constructor --> CreatePixels
end
```

Sources: [src/core/image.js L80-L150](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/image.js#L80-L150)

 [src/core/image.js L200-L400](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/image.js#L200-L400)

 [src/core/image_resizer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/image_resizer.js)

## Color Space System

PDF.js implements a comprehensive color space system supporting DeviceGray, DeviceRGB, DeviceCMYK, ICCBased, Indexed, Pattern, Separation, and DeviceN color spaces. Each color space provides methods for converting colors to RGB for display.

### Color Space Class Hierarchy

```mermaid
flowchart TD

ColorSpace["ColorSpace<br>(Abstract Base)"]
DeviceGray["DeviceGrayCS"]
DeviceRGB["DeviceRgbCS"]
DeviceCMYK["DeviceCmykCS"]
ICCBased["ICCBasedCS"]
Indexed["IndexedCS"]
Pattern["PatternCS"]
Separation["SeparationCS"]
DeviceN["DeviceNCS"]
CalGray["CalGrayCS"]
CalRGB["CalRgbCS"]
Lab["LabCS"]

ColorSpace --> DeviceGray
ColorSpace --> DeviceRGB
ColorSpace --> DeviceCMYK
ColorSpace --> ICCBased
ColorSpace --> Indexed
ColorSpace --> Pattern
ColorSpace --> Separation
ColorSpace --> DeviceN
ColorSpace --> CalGray
ColorSpace --> CalRGB
ColorSpace --> Lab

subgraph subGraph2 ["Special Color Spaces"]
    ICCBased
    Indexed
    Pattern
    Separation
    DeviceN
    CalGray
    CalRGB
    Lab
end

subgraph subGraph1 ["Device Color Spaces"]
    DeviceGray
    DeviceRGB
    DeviceCMYK
end

subgraph subGraph0 ["Base Color Space"]
    ColorSpace
end
```

Sources: [src/core/colorspace.js L100-L300](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/colorspace.js#L100-L300)

 [src/core/colorspace.js L400-L800](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/colorspace.js#L400-L800)

 [src/core/colorspace.js L1000-L1500](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/colorspace.js#L1000-L1500)

### Color Space Processing Flow

```mermaid
flowchart TD

PDFColor["PDF Color Values"]
Parser["ColorSpace.parse()"]
Resources["Color Space Resources"]
Factory["ColorSpace.parse()"]
Cache["ColorSpace Cache"]
Instance["Color Space Instance"]
GetRGB["getRgb()"]
GetRGBItem["getRgbItem()"]
Convert["Color Conversion"]
RGBOutput["RGB Values"]
Canvas["CanvasGraphics"]
Pattern["Pattern Rendering"]

Parser --> Factory
Instance --> GetRGB
Instance --> GetRGBItem
Instance --> Convert
RGBOutput --> Canvas
RGBOutput --> Pattern

subgraph subGraph3 ["Rendering Integration"]
    Canvas
    Pattern
end

subgraph subGraph2 ["Color Transformation"]
    GetRGB
    GetRGBItem
    Convert
    RGBOutput
    Convert --> RGBOutput
end

subgraph subGraph1 ["Color Space Factory"]
    Factory
    Cache
    Instance
    Factory --> Cache
    Cache --> Instance
end

subgraph subGraph0 ["Input Processing"]
    PDFColor
    Parser
    Resources
    PDFColor --> Parser
    Resources --> Parser
end
```

Sources: [src/core/colorspace.js L1-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/colorspace.js#L1-L100)

 [src/core/colorspace.js L300-L400](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/colorspace.js#L300-L400)

 [src/display/canvas.js L2000-L2200](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L2000-L2200)

## Pattern System

PDF patterns include tiling patterns and shading patterns. The pattern system coordinates between the core pattern definitions and the display layer rendering implementation.

### Pattern Class Structure

```mermaid
flowchart TD

Pattern["Pattern<br>(Base Class)"]
TilingPattern["TilingPattern"]
ShadingPattern["ShadingPattern"]
FunctionShading["FunctionBasedShading"]
AxialShading["AxialShading"]
RadialShading["RadialShading"]
FreeFormShading["FreeFormGouraudShadedTriangleShading"]
LatticeShading["LatticeFormGouraudShadedTriangleShading"]
CoonsPatch["CoonsPatchMeshShading"]
TensorPatch["TensorProductPatchMeshShading"]
PatternHelper["TilingPattern<br>(pattern_helper.js)"]
ShadingHelper["getShadingPattern()<br>(pattern_helper.js)"]
CanvasPattern["Canvas Pattern<br>Rendering"]

ShadingPattern --> FunctionShading
ShadingPattern --> AxialShading
ShadingPattern --> RadialShading
ShadingPattern --> FreeFormShading
ShadingPattern --> LatticeShading
ShadingPattern --> CoonsPatch
ShadingPattern --> TensorPatch
TilingPattern --> PatternHelper
ShadingPattern --> ShadingHelper

subgraph subGraph2 ["Display Integration"]
    PatternHelper
    ShadingHelper
    CanvasPattern
    PatternHelper --> CanvasPattern
    ShadingHelper --> CanvasPattern
end

subgraph subGraph1 ["Shading Types"]
    FunctionShading
    AxialShading
    RadialShading
    FreeFormShading
    LatticeShading
    CoonsPatch
    TensorPatch
end

subgraph subGraph0 ["Core Pattern Classes"]
    Pattern
    TilingPattern
    ShadingPattern
    Pattern --> TilingPattern
    Pattern --> ShadingPattern
end
```

Sources: [src/core/pattern.js L50-L200](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/pattern.js#L50-L200)

 [src/core/pattern.js L400-L800](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/pattern.js#L400-L800)

 [src/display/pattern_helper.js L1-L500](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/pattern_helper.js#L1-L500)

### Pattern Processing Pipeline

```mermaid
flowchart TD

Resources["Pattern Resources"]
PE["Pattern Evaluator"]
ContentStream["Content Stream"]
PTF["Pattern Type<br>Factory"]
Tiling["getTilingPatternIR()"]
Shading["Shading.parseShading()"]
TilingIR["Tiling Pattern IR"]
ShadingIR["Shading Pattern IR"]
TilingHelper["TilingPattern<br>(display layer)"]
ShadingHelper["getShadingPattern<br>(display layer)"]
CanvasAPI["Canvas Pattern<br>APIs"]

PE --> PTF
Tiling --> TilingIR
Shading --> ShadingIR
TilingIR --> TilingHelper
ShadingIR --> ShadingHelper

subgraph subGraph3 ["Display Rendering"]
    TilingHelper
    ShadingHelper
    CanvasAPI
    TilingHelper --> CanvasAPI
    ShadingHelper --> CanvasAPI
end

subgraph subGraph2 ["IR Generation"]
    TilingIR
    ShadingIR
end

subgraph subGraph1 ["Pattern Creation"]
    PTF
    Tiling
    Shading
    PTF --> Tiling
    PTF --> Shading
end

subgraph subGraph0 ["Pattern Discovery"]
    Resources
    PE
    ContentStream
    Resources --> PE
    ContentStream --> PE
end
```

Sources: [src/core/evaluator.js L1500-L1800](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js#L1500-L1800)

 [src/core/pattern.js L1000-L1200](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/pattern.js#L1000-L1200)

 [src/display/pattern_helper.js L200-L400](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/pattern_helper.js#L200-L400)

## Graphics Rendering System

The `CanvasGraphics` class in [src/display/canvas.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js)

 handles the rendering of all graphics operations to HTML5 Canvas. It processes operator lists generated by the core engine and executes drawing commands.

### CanvasGraphics Architecture

```mermaid
flowchart TD

OpList["OperatorList"]
Execute["executeOperatorList()"]
OpHandler["Operator Handlers"]
GState["Graphics State<br>Stack"]
Transform["Transformation<br>Matrix"]
ClipPath["Clipping Path"]
ColorState["Color State"]
Path["Path Operations<br>(moveTo, lineTo, etc.)"]
Text["Text Operations<br>(showText, etc.)"]
Image["Image Operations<br>(paintImageXObject)"]
Pattern["Pattern Operations<br>(shadingFill)"]
CanvasAPI["HTML5 Canvas<br>Context"]
Output["Rendered Output"]

OpHandler --> GState
OpHandler --> Path
OpHandler --> Text
OpHandler --> Image
OpHandler --> Pattern
Path --> CanvasAPI
Text --> CanvasAPI
Image --> CanvasAPI
Pattern --> CanvasAPI

subgraph subGraph3 ["Canvas Integration"]
    CanvasAPI
    Output
    CanvasAPI --> Output
end

subgraph subGraph2 ["Drawing Operations"]
    Path
    Text
    Image
    Pattern
end

subgraph subGraph1 ["Graphics State Management"]
    GState
    Transform
    ClipPath
    ColorState
    GState --> Transform
    GState --> ClipPath
    GState --> ColorState
end

subgraph subGraph0 ["Operator Processing"]
    OpList
    Execute
    OpHandler
    OpList --> Execute
    Execute --> OpHandler
end
```

Sources: [src/display/canvas.js L1000-L1200](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L1000-L1200)

 [src/display/canvas.js L2000-L2500](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L2000-L2500)

 [src/display/canvas.js L3000-L3500](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L3000-L3500)

### Image Rendering Operations

The graphics system handles multiple types of image rendering operations, each optimized for different use cases:

| Operation | Method | Purpose |
| --- | --- | --- |
| `paintImageXObject` | `paintImageXObject()` | Render standard images |
| `paintImageMaskXObject` | `paintImageMaskXObject()` | Render image masks |
| `paintInlineImageXObject` | `paintInlineImageXObject()` | Render inline images |
| `paintImageXObjectRepeat` | `paintImageXObjectRepeat()` | Optimized repeated images |
| `paintSolidColorImageMask` | `paintSolidColorImageMask()` | Solid color masks |

Sources: [src/display/canvas.js L4000-L4500](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L4000-L4500)

 [src/display/canvas.js L4500-L5000](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L4500-L5000)

 [src/shared/util.js L245-L342](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/shared/util.js#L245-L342)

### Graphics State and Transformation

```mermaid
flowchart TD

Save["save()"]
Stack["State Stack"]
Restore["restore()"]
Current["Current State"]
CTM["Current Transform<br>Matrix"]
Transform["transform()"]
SetTransform["setTransform()"]
LineWidth["Line Width"]
LineCap["Line Cap"]
FillStyle["Fill Style"]
StrokeStyle["Stroke Style"]
GlobalAlpha["Global Alpha"]
CanvasTransform["Canvas Transform"]
CanvasProps["Canvas Properties"]

Current --> CTM
Current --> LineWidth
Current --> LineCap
Current --> FillStyle
Current --> StrokeStyle
Current --> GlobalAlpha
CTM --> CanvasTransform
LineWidth --> CanvasProps
LineCap --> CanvasProps
FillStyle --> CanvasProps
StrokeStyle --> CanvasProps
GlobalAlpha --> CanvasProps

subgraph subGraph3 ["Canvas Application"]
    CanvasTransform
    CanvasProps
end

subgraph subGraph2 ["Rendering Properties"]
    LineWidth
    LineCap
    FillStyle
    StrokeStyle
    GlobalAlpha
end

subgraph subGraph1 ["Transformation Matrix"]
    CTM
    Transform
    SetTransform
    Transform --> CTM
    SetTransform --> CTM
end

subgraph subGraph0 ["Graphics State Stack"]
    Save
    Stack
    Restore
    Current
    Save --> Stack
    Stack --> Restore
    Stack --> Current
end
```

Sources: [src/display/canvas.js L500-L800](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L500-L800)

 [src/display/canvas.js L1500-L1800](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js#L1500-L1800)

 [src/display/display_utils.js L200-L400](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/display_utils.js#L200-L400)