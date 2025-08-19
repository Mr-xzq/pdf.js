# Font and Character Mapping

> **Relevant source files**
> * [src/core/annotation.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/annotation.js)
> * [src/core/catalog.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/catalog.js)
> * [src/core/cmap.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js)
> * [src/core/document.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/document.js)
> * [src/core/evaluator.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js)
> * [src/core/fonts.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js)
> * [src/core/primitives.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/primitives.js)
> * [src/core/struct_tree.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/struct_tree.js)
> * [src/core/worker.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/worker.js)
> * [src/display/annotation_layer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/annotation_layer.js)
> * [src/display/api.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/api.js)
> * [src/display/canvas.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/display/canvas.js)
> * [src/shared/util.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/shared/util.js)
> * [test/annotation_layer_builder_overrides.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/annotation_layer_builder_overrides.css)
> * [test/pdfs/.gitignore](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/pdfs/.gitignore)
> * [test/test_manifest.json](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/test_manifest.json)
> * [test/unit/annotation_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/annotation_spec.js)
> * [test/unit/api_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/api_spec.js)
> * [test/unit/cmap_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/cmap_spec.js)
> * [test/unit/custom_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/custom_spec.js)
> * [test/unit/node_stream_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/node_stream_spec.js)
> * [test/unit/primitives_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/primitives_spec.js)
> * [test/unit/test_utils.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/test_utils.js)
> * [test/unit/util_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/util_spec.js)
> * [web/annotation_layer_builder.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_layer_builder.css)

This document covers the font processing and character mapping systems within PDF.js's core PDF processing engine. These systems handle the loading, parsing, and rendering of fonts embedded in PDF documents, as well as the complex mapping between character codes, glyph identifiers, and Unicode values.

For information about the broader content stream processing that uses these font systems, see [Content Stream Processing](/Mr-xzq/pdf.js-4.4.168/2.2-content-stream-processing). For details about text rendering and layout in the display layer, see [Page Rendering System](/Mr-xzq/pdf.js-4.4.168/3.3-page-rendering-system).

## Overview

The font and character mapping system is responsible for:

* Loading and parsing various font formats (Type1, TrueType, CFF, OpenType)
* Establishing mappings between character codes and glyph identifiers
* Converting character codes to Unicode values for text extraction
* Handling font substitution when fonts are missing or corrupted
* Managing character encoding transformations
* Caching font data for performance optimization

## Font Processing Architecture

```mermaid
flowchart TD

PDFDoc["PDF Document"]
FontDict["Font Dictionary"]
FontRef["Font Reference"]
PartialEvaluator["PartialEvaluator"]
FontCache["Font Cache"]
FontFactory["Font Creation"]
Type1Font["Type1Font"]
TrueTypeFont["TrueType Font"]
CFFFont["CFFFont"]
ErrorFont["ErrorFont"]
CMapFactory["CMapFactory"]
ToUnicodeMap["ToUnicodeMap"]
Encoding["Character Encoding"]
GlyphMapping["Glyph Mapping"]
CharCodeToGlyphId["charCodeToGlyphId"]
UnicodeMapping["Unicode Mapping"]

FontRef --> PartialEvaluator
FontFactory --> Type1Font
FontFactory --> TrueTypeFont
FontFactory --> CFFFont
FontFactory --> ErrorFont
PartialEvaluator --> CMapFactory
PartialEvaluator --> ToUnicodeMap
PartialEvaluator --> Encoding
CMapFactory --> GlyphMapping
ToUnicodeMap --> UnicodeMapping
Encoding --> CharCodeToGlyphId

subgraph subGraph4 ["Glyph Processing"]
    GlyphMapping
    CharCodeToGlyphId
    UnicodeMapping
    GlyphMapping --> CharCodeToGlyphId
    CharCodeToGlyphId --> UnicodeMapping
end

subgraph subGraph3 ["Character Mapping"]
    CMapFactory
    ToUnicodeMap
    Encoding
end

subgraph subGraph2 ["Font Types"]
    Type1Font
    TrueTypeFont
    CFFFont
    ErrorFont
end

subgraph subGraph1 ["Font Loading"]
    PartialEvaluator
    FontCache
    FontFactory
    PartialEvaluator --> FontCache
    PartialEvaluator --> FontFactory
end

subgraph subGraph0 ["Font Discovery"]
    PDFDoc
    FontDict
    FontRef
    PDFDoc --> FontDict
    FontDict --> FontRef
end
```

Sources: [src/core/evaluator.js L209-L262](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js#L209-L262)

 [src/core/fonts.js L464-L523](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L464-L523)

 [src/core/cmap.js L1-L50](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js#L1-L50)

## Font Processing Pipeline

The font processing follows a multi-stage pipeline handled primarily by the `PartialEvaluator` class:

```mermaid
flowchart TD

FontRef["Font Reference"]
FontDict["Font Dictionary"]
FontFile["Font File Data"]
FontType["Font Type Detection"]
FontParser["Font Parser"]
FontProperties["Font Properties"]
CMapLoad["CMap Loading"]
EncodingSetup["Encoding Setup"]
ToUnicodeSetup["ToUnicode Setup"]
FontObject["Font Object"]
GlyphData["Glyph Data"]
Metrics["Font Metrics"]

FontFile --> FontType
FontProperties --> CMapLoad
FontProperties --> EncodingSetup
FontProperties --> ToUnicodeSetup
CMapLoad --> FontObject
EncodingSetup --> FontObject
ToUnicodeSetup --> FontObject

subgraph subGraph3 ["Font Object Creation"]
    FontObject
    GlyphData
    Metrics
    FontObject --> GlyphData
    FontObject --> Metrics
end

subgraph subGraph2 ["Character Mapping Setup"]
    CMapLoad
    EncodingSetup
    ToUnicodeSetup
end

subgraph subGraph1 ["Font Parsing"]
    FontType
    FontParser
    FontProperties
    FontType --> FontParser
    FontParser --> FontProperties
end

subgraph subGraph0 ["Font Resolution"]
    FontRef
    FontDict
    FontFile
    FontRef --> FontDict
    FontDict --> FontFile
end
```

The pipeline involves several key steps:

1. **Font Discovery**: The `PartialEvaluator` encounters font references in PDF content streams
2. **Font Loading**: Font dictionaries and embedded font files are retrieved from the PDF
3. **Type Detection**: The system determines the font format using functions like `isTrueTypeFile`, `isType1File`, `isCFFFile`
4. **Font Parsing**: Appropriate parsers extract font data and properties
5. **Character Mapping**: CMaps, encodings, and ToUnicode maps are established
6. **Font Object Creation**: A `Font` instance is created with all necessary mapping data

Sources: [src/core/evaluator.js L1275-L1400](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js#L1275-L1400)

 [src/core/fonts.js L382-L410](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L382-L410)

 [src/core/fonts.js L1200-L1350](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L1200-L1350)

## Character Code Mapping System

The character mapping system handles the complex transformation from PDF character codes to renderable glyphs:

```mermaid
flowchart TD

CharCode["Character Code<br>(from PDF content)"]
SingleByte["Single Byte<br>(0-255)"]
MultiByte["Multi Byte<br>(CID fonts)"]
CMap["CMap<br>(CID → Unicode)"]
Encoding["Font Encoding<br>(Code → Glyph Name)"]
ToUnicode["ToUnicode Map<br>(Code → Unicode)"]
Differences["Encoding Differences"]
GlyphName["Glyph Name"]
GlyphId["Glyph ID"]
CID["Character ID"]
Unicode["Unicode Value"]
FontChar["Font Character"]
GlyphData["Glyph Object"]

SingleByte --> Encoding
MultiByte --> CMap
Encoding --> GlyphName
CMap --> CID
Differences --> GlyphName
GlyphId --> FontChar
CharCode --> ToUnicode
ToUnicode --> Unicode

subgraph subGraph3 ["Final Output"]
    Unicode
    FontChar
    GlyphData
    FontChar --> GlyphData
    Unicode --> GlyphData
end

subgraph subGraph2 ["Intermediate Representations"]
    GlyphName
    GlyphId
    CID
    GlyphName --> GlyphId
    CID --> GlyphId
end

subgraph subGraph1 ["Mapping Layers"]
    CMap
    Encoding
    ToUnicode
    Differences
    Encoding --> Differences
end

subgraph subGraph0 ["Input Character Codes"]
    CharCode
    SingleByte
    MultiByte
    CharCode --> SingleByte
    CharCode --> MultiByte
end
```

The mapping process involves multiple potential paths depending on the font type and available mapping information:

* **Simple Fonts**: Use encoding dictionaries to map character codes to glyph names
* **CID Fonts**: Use CMaps to map character codes to Character IDs, then to glyphs
* **ToUnicode Maps**: Provide direct character code to Unicode mapping for text extraction
* **Encoding Differences**: Override specific mappings in the base encoding

Sources: [src/core/fonts.js L475-L523](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L475-L523)

 [src/core/cmap.js L350-L450](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js#L350-L450)

 [src/core/to_unicode_map.js L1-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/to_unicode_map.js#L1-L100)

## CMap Processing

CMaps (Character Maps) are crucial for handling CID fonts and complex character encodings:

| CMap Component | Purpose | Implementation |
| --- | --- | --- |
| `CMapFactory` | Creates and caches CMap instances | [src/core/cmap.js L550-L650](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js#L550-L650) |
| `IdentityCMap` | Provides 1:1 character mapping | [src/core/cmap.js L700-L750](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js#L700-L750) |
| `BinaryCMapReader` | Reads compressed binary CMaps | [src/core/binary_cmap.js L1-L50](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/binary_cmap.js#L1-L50) |
| Built-in CMaps | Standard Adobe CMaps | [src/core/cmap.js L29-L200](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js#L29-L200) |

The CMap system supports both built-in CMaps (like Adobe-GB1-UCS2) and custom CMaps embedded in PDF documents. The `PartialEvaluator` fetches built-in CMaps using the `fetchBuiltInCMap` method, which can load them from either URLs or the main thread.

```mermaid
flowchart TD

BuiltIn["Built-in CMaps"]
Embedded["Embedded CMaps"]
URL["Remote CMaps"]
CMapFactory["CMapFactory.create()"]
BinaryReader["BinaryCMapReader"]
CMapParser["CMap Parser"]
CMapInstance["CMap Instance"]
CodespaceRanges["Codespace Ranges"]
CharMappings["Character Mappings"]

BuiltIn --> CMapFactory
Embedded --> CMapFactory
URL --> BinaryReader
CMapParser --> CMapInstance

subgraph subGraph2 ["CMap Objects"]
    CMapInstance
    CodespaceRanges
    CharMappings
    CMapInstance --> CodespaceRanges
    CMapInstance --> CharMappings
end

subgraph subGraph1 ["CMap Loading"]
    CMapFactory
    BinaryReader
    CMapParser
    CMapFactory --> CMapParser
    BinaryReader --> CMapParser
end

subgraph subGraph0 ["CMap Sources"]
    BuiltIn
    Embedded
    URL
end
```

Sources: [src/core/cmap.js L550-L600](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cmap.js#L550-L600)

 [src/core/evaluator.js L377-L406](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/evaluator.js#L377-L406)

 [src/core/binary_cmap.js L1-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/binary_cmap.js#L1-L100)

## Unicode Mapping and Text Extraction

The Unicode mapping system enables proper text extraction from PDF content:

```mermaid
flowchart TD

ToUnicodeMap["ToUnicode Map<br>(from PDF)"]
GlyphList["Standard Glyph List"]
CMapUnicode["CMap Unicode Range"]
FontEncoding["Font Encoding"]
PrioritySystem["Priority Resolution"]
FallbackLogic["Fallback Logic"]
UnicodeAdjustment["Unicode Adjustment"]
CharCode["Character Code"]
GlyphUnicode["Glyph Unicode"]
TextContent["Text Content"]

ToUnicodeMap --> PrioritySystem
GlyphList --> FallbackLogic
CMapUnicode --> PrioritySystem
FontEncoding --> FallbackLogic
CharCode --> PrioritySystem
UnicodeAdjustment --> GlyphUnicode

subgraph subGraph2 ["Character Processing"]
    CharCode
    GlyphUnicode
    TextContent
    GlyphUnicode --> TextContent
end

subgraph subGraph1 ["Mapping Resolution"]
    PrioritySystem
    FallbackLogic
    UnicodeAdjustment
    PrioritySystem --> UnicodeAdjustment
    FallbackLogic --> UnicodeAdjustment
end

subgraph subGraph0 ["Unicode Sources"]
    ToUnicodeMap
    GlyphList
    CMapUnicode
    FontEncoding
end
```

The Unicode resolution follows a priority system:

1. **ToUnicode Map**: Highest priority if present in the PDF
2. **CMap Unicode Ranges**: For CID fonts with Unicode CMaps
3. **Standard Glyph List**: Maps glyph names to Unicode values
4. **Encoding Fallbacks**: Uses standard encodings as last resort

Functions like `adjustType1ToUnicode` and `adjustTrueTypeToUnicode` handle font-specific Unicode mapping adjustments.

Sources: [src/core/fonts.js L185-L241](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L185-L241)

 [src/core/to_unicode_map.js L50-L150](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/to_unicode_map.js#L50-L150)

 [src/core/unicode.js L1-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/unicode.js#L1-L100)

## Font Substitution and Error Handling

When fonts are missing or corrupted, PDF.js employs a robust substitution system:

```mermaid
flowchart TD

MissingFont["Missing Font"]
CorruptFont["Corrupt Font Data"]
UnsupportedFormat["Unsupported Format"]
FontSubstitution["getFontSubstitution()"]
SystemFonts["System Font Lookup"]
StandardFonts["Standard Font Data"]
ErrorFont["ErrorFont Creation"]
FontName["Font Name Analysis"]
FontFlags["Font Flags"]
FontFamily["Font Family"]
FontWeight["Font Weight"]
HelveticaFallback["Helvetica"]
TimesFallback["Times"]
CourierFallback["Courier"]
SymbolFallback["Symbol Fonts"]

MissingFont --> FontSubstitution
CorruptFont --> ErrorFont
UnsupportedFormat --> FontSubstitution
FontSubstitution --> FontName
FontSubstitution --> FontFlags
FontFamily --> HelveticaFallback
FontFamily --> TimesFallback
FontFamily --> CourierFallback
FontFamily --> SymbolFallback
StandardFonts --> HelveticaFallback

subgraph subGraph3 ["Fallback Fonts"]
    HelveticaFallback
    TimesFallback
    CourierFallback
    SymbolFallback
end

subgraph subGraph2 ["Font Properties"]
    FontName
    FontFlags
    FontFamily
    FontWeight
    FontName --> FontFamily
    FontFlags --> FontWeight
end

subgraph subGraph1 ["Substitution Logic"]
    FontSubstitution
    SystemFonts
    StandardFonts
    ErrorFont
    SystemFonts --> StandardFonts
end

subgraph subGraph0 ["Font Issues"]
    MissingFont
    CorruptFont
    UnsupportedFormat
end
```

The substitution system analyzes font properties like:

* Font name and family classification
* Font flags (serif, sans-serif, monospace, symbolic)
* Font weight and style information
* Character set requirements

Sources: [src/core/font_substitutions.js L1-L100](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/font_substitutions.js#L1-L100)

 [src/core/fonts.js L2800-L3000](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L2800-L3000)

 [src/core/standard_fonts.js L1-L200](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/standard_fonts.js#L1-L200)

## Glyph Processing and Private Use Areas

To avoid rendering issues with problematic Unicode ranges, PDF.js remaps character codes to private use areas:

```mermaid
flowchart TD

OriginalCharCode["Original Character Code"]
ProblematicUnicode["Problematic Unicode Range"]
RenderingIssues["Potential Rendering Issues"]
AdjustMapping["adjustMapping()"]
PrivateUseAreas["Private Use Areas<br>(U+E000-U+F8FF)<br>(U+100000-U+10FFFD)"]
NewCharCode["New Character Code"]
CharCodeToGlyphId["charCodeToGlyphId Map"]
ToFontChar["toFontChar Map"]
FontFile["Generated Font File"]

RenderingIssues --> AdjustMapping
NewCharCode --> CharCodeToGlyphId
OriginalCharCode --> ToFontChar

subgraph subGraph2 ["Font Generation"]
    CharCodeToGlyphId
    ToFontChar
    FontFile
    CharCodeToGlyphId --> FontFile
    ToFontChar --> FontFile
end

subgraph subGraph1 ["Remapping Process"]
    AdjustMapping
    PrivateUseAreas
    NewCharCode
    AdjustMapping --> PrivateUseAreas
    PrivateUseAreas --> NewCharCode
end

subgraph subGraph0 ["Original Mapping"]
    OriginalCharCode
    ProblematicUnicode
    RenderingIssues
    OriginalCharCode --> ProblematicUnicode
    ProblematicUnicode --> RenderingIssues
end
```

This remapping process ensures that:

* Characters render correctly across different browsers and platforms
* Font shaping issues are avoided
* Print functionality maintains proper Unicode mappings
* Text extraction continues to work properly

Sources: [src/core/fonts.js L475-L523](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L475-L523)

 [src/core/fonts.js L69-L72](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/fonts.js#L69-L72)