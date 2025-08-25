# 用户界面组件

> **相关源文件**
> * [web/toolbar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/toolbar.js)
> * [web/secondary_toolbar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/secondary_toolbar.js)
> * [web/pdf_sidebar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_sidebar.js)
> * [web/pdf_find_bar.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_find_bar.js)
> * [web/pdf_thumbnail_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_thumbnail_viewer.js)
> * [web/pdf_outline_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_outline_viewer.js)
> * [web/pdf_attachment_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_attachment_viewer.js)
> * [web/pdf_layer_viewer.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_layer_viewer.js)
> * [web/annotation_editor_params.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_editor_params.js)
> * [web/viewer.html](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.html)
> * [web/viewer.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.css)

用户界面组件系统提供完整的 PDF 查看器用户界面，包括工具栏、侧边栏、搜索栏和各种交互控件。这些组件协同工作，为用户提供直观、功能丰富的 PDF 查看体验。

有关应用程序架构的信息，请参阅 [应用程序架构](/Mr-xzq/pdf.js-4.4.168/3.1-application-architecture)。有关页面渲染的详细信息，请参阅 [页面渲染系统](/Mr-xzq/pdf.js-4.4.168/3.3-page-rendering-system)。

## UI 组件架构概述

用户界面采用模块化设计，每个组件负责特定的功能区域：

### 主要 UI 组件结构

```mermaid
flowchart TD

ViewerContainer["查看器容器<br>(viewer.html)"]
Toolbar["主工具栏<br>(toolbar.js)"]
SecondaryToolbar["辅助工具栏<br>(secondary_toolbar.js)"]
Sidebar["侧边栏<br>(pdf_sidebar.js)"]
FindBar["搜索栏<br>(pdf_find_bar.js)"]
EditorParams["编辑器参数<br>(annotation_editor_params.js)"]
MainContainer["主容器<br>(文档显示区域)"]
ThumbnailViewer["缩略图查看器<br>(pdf_thumbnail_viewer.js)"]
OutlineViewer["大纲查看器<br>(pdf_outline_viewer.js)"]
AttachmentViewer["附件查看器<br>(pdf_attachment_viewer.js)"]
LayerViewer["图层查看器<br>(pdf_layer_viewer.js)"]

ViewerContainer --> Toolbar
ViewerContainer --> SecondaryToolbar
ViewerContainer --> Sidebar
ViewerContainer --> FindBar
ViewerContainer --> EditorParams
ViewerContainer --> MainContainer
Sidebar --> ThumbnailViewer
Sidebar --> OutlineViewer
Sidebar --> AttachmentViewer
Sidebar --> LayerViewer

subgraph subGraph2 ["侧边栏组件"]
    ThumbnailViewer
    OutlineViewer
    AttachmentViewer
    LayerViewer
end

subgraph subGraph1 ["工具栏组件"]
    Toolbar
    SecondaryToolbar
    FindBar
    EditorParams
end

subgraph subGraph0 ["主要容器"]
    ViewerContainer
    Sidebar
    MainContainer
end
```

## 主工具栏组件

主工具栏提供最常用的 PDF 查看功能：

### 工具栏架构

```mermaid
flowchart TD

Toolbar["Toolbar<br>(主工具栏控制器)"]
FileActions["文件操作<br>(打开、下载、打印)"]
NavigationControls["导航控件<br>(上一页、下一页、页码)"]
ZoomControls["缩放控件<br>(放大、缩小、适应)"]
ViewModeControls["视图模式<br>(单页、双页、滚动)"]
RotationControls["旋转控件<br>(顺时针、逆时针)"]
PresentationMode["演示模式<br>(全屏查看)"]
SidebarToggle["侧边栏切换<br>(显示/隐藏)"]
SearchToggle["搜索切换<br>(查找功能)"]

Toolbar --> FileActions
Toolbar --> NavigationControls
Toolbar --> ZoomControls
Toolbar --> ViewModeControls
Toolbar --> RotationControls
Toolbar --> PresentationMode
Toolbar --> SidebarToggle
Toolbar --> SearchToggle

subgraph subGraph2 ["视图控制"]
    ViewModeControls
    RotationControls
    PresentationMode
end

subgraph subGraph1 ["导航控制"]
    NavigationControls
    ZoomControls
end

subgraph subGraph0 ["基础功能"]
    FileActions
    SidebarToggle
    SearchToggle
end
```

**主工具栏功能**:

- **文件操作**: 打开文件、下载、打印、文档属性
- **页面导航**: 首页、末页、上一页、下一页、跳转到指定页
- **缩放控制**: 放大、缩小、适应页面、适应宽度、实际大小
- **视图模式**: 单页视图、双页视图、连续滚动
- **页面旋转**: 顺时针旋转、逆时针旋转
- **界面控制**: 侧边栏切换、搜索栏切换、演示模式

来源: [web/toolbar.js L89-L234](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/toolbar.js#L89-L234)

## 侧边栏组件系统

侧边栏提供文档导航和信息查看功能：

### 侧边栏架构

```mermaid
flowchart TD

PDFSidebar["PDFSidebar<br>(侧边栏控制器)"]
SidebarViews["侧边栏视图<br>(标签页切换)"]
ThumbnailView["缩略图视图<br>(页面预览)"]
OutlineView["大纲视图<br>(书签导航)"]
AttachmentView["附件视图<br>(文件附件)"]
LayerView["图层视图<br>(可选内容)"]
SidebarResizer["大小调整器<br>(拖拽调整)"]
ViewerContainer["查看器容器<br>(主显示区域)"]

PDFSidebar --> SidebarViews
SidebarViews --> ThumbnailView
SidebarViews --> OutlineView
SidebarViews --> AttachmentView
SidebarViews --> LayerView
PDFSidebar --> SidebarResizer
PDFSidebar --> ViewerContainer

subgraph subGraph1 ["侧边栏视图"]
    ThumbnailView
    OutlineView
    AttachmentView
    LayerView
end

subgraph subGraph0 ["侧边栏控制"]
    PDFSidebar
    SidebarViews
    SidebarResizer
    ViewerContainer
end
```

### 缩略图查看器

缩略图查看器提供页面预览和快速导航：

```mermaid
flowchart TD

ThumbnailViewer["PDFThumbnailViewer<br>(缩略图查看器)"]
ThumbnailContainer["缩略图容器<br>(滚动列表)"]
ThumbnailViews["PDFThumbnailView[]<br>(单个缩略图)"]
RenderingQueue["渲染队列<br>(优先级管理)"]
LinkService["链接服务<br>(页面跳转)"]
EventBus["事件总线<br>(状态同步)"]

ThumbnailViewer --> ThumbnailContainer
ThumbnailViewer --> ThumbnailViews
ThumbnailViewer --> RenderingQueue
ThumbnailViewer --> LinkService
ThumbnailViewer --> EventBus

subgraph subGraph1 ["渲染管理"]
    RenderingQueue
    LinkService
    EventBus
end

subgraph subGraph0 ["视图组件"]
    ThumbnailContainer
    ThumbnailViews
end
```

**缩略图特性**:
- **懒加载**: 只渲染可见的缩略图
- **点击导航**: 点击缩略图跳转到对应页面
- **当前页高亮**: 显示当前查看页面的状态
- **渲染优化**: 使用低分辨率快速渲染

来源: [web/pdf_thumbnail_viewer.js L127-L289](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_thumbnail_viewer.js#L127-L289)

## 搜索功能组件

搜索系统提供全文搜索和高亮显示功能：

### 搜索组件架构

```mermaid
flowchart TD

FindBar["PDFFindBar<br>(搜索栏 UI)"]
FindController["PDFFindController<br>(搜索控制器)"]
SearchInput["搜索输入框<br>(关键词输入)"]
SearchOptions["搜索选项<br>(大小写、整词)"]
NavigationButtons["导航按钮<br>(上一个、下一个)"]
ResultCounter["结果计数器<br>(匹配数量)"]
HighlightService["高亮服务<br>(结果标记)"]
TextLayer["文本层<br>(搜索目标)"]

FindBar --> SearchInput
FindBar --> SearchOptions
FindBar --> NavigationButtons
FindBar --> ResultCounter
FindBar --> FindController
FindController --> HighlightService
FindController --> TextLayer

subgraph subGraph2 ["搜索处理"]
    FindController
    HighlightService
    TextLayer
end

subgraph subGraph1 ["搜索控制"]
    SearchOptions
    NavigationButtons
    ResultCounter
end

subgraph subGraph0 ["搜索界面"]
    FindBar
    SearchInput
end
```

**搜索功能特性**:
- **实时搜索**: 输入时即时显示搜索结果
- **高亮显示**: 在文档中高亮显示所有匹配项
- **导航控制**: 在搜索结果间快速跳转
- **搜索选项**: 支持大小写敏感、整词匹配等选项
- **结果统计**: 显示匹配数量和当前位置

来源: [web/pdf_find_bar.js L89-L178](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_find_bar.js#L89-L178)

 [web/pdf_find_controller.js L127-L345](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/pdf_find_controller.js#L127-L345)

## 注释编辑器组件

注释编辑器提供 PDF 注释的创建、编辑和管理功能：

### 注释编辑器架构

```mermaid
flowchart TD

EditorParams["AnnotationEditorParams<br>(编辑器参数面板)"]
EditorToolbar["编辑器工具栏<br>(编辑工具)"]
FreeTextEditor["自由文本编辑器<br>(文本注释)"]
InkEditor["墨迹编辑器<br>(手绘注释)"]
StampEditor["印章编辑器<br>(图章注释)"]
HighlightEditor["高亮编辑器<br>(文本高亮)"]
EditorManager["编辑器管理器<br>(状态管理)"]
AnnotationStorage["注释存储<br>(数据持久化)"]

EditorParams --> EditorToolbar
EditorToolbar --> FreeTextEditor
EditorToolbar --> InkEditor
EditorToolbar --> StampEditor
EditorToolbar --> HighlightEditor
EditorParams --> EditorManager
EditorManager --> AnnotationStorage

subgraph subGraph2 ["数据管理"]
    EditorManager
    AnnotationStorage
end

subgraph subGraph1 ["编辑器类型"]
    FreeTextEditor
    InkEditor
    StampEditor
    HighlightEditor
end

subgraph subGraph0 ["编辑器界面"]
    EditorParams
    EditorToolbar
end
```

**注释编辑功能**:
- **文本注释**: 添加自由文本、备注和标签
- **手绘注释**: 支持触摸和鼠标绘制
- **图章注释**: 预定义和自定义图章
- **高亮标记**: 文本高亮、下划线、删除线
- **属性编辑**: 颜色、字体、透明度等属性调整

来源: [web/annotation_editor_params.js L89-L234](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/annotation_editor_params.js#L89-L234)

## 响应式设计和移动端适配

UI 组件系统支持响应式设计，适应不同设备和屏幕尺寸：

### 响应式架构

```mermaid
flowchart TD

ResponsiveDesign["响应式设计"]
BreakpointSystem["断点系统<br>(屏幕尺寸检测)"]
MobileLayout["移动端布局<br>(垂直排列)"]
TabletLayout["平板布局<br>(混合模式)"]
DesktopLayout["桌面布局<br>(完整功能)"]
TouchOptimization["触摸优化<br>(手势支持)"]
AdaptiveUI["自适应 UI<br>(动态调整)"]

ResponsiveDesign --> BreakpointSystem
BreakpointSystem --> MobileLayout
BreakpointSystem --> TabletLayout
BreakpointSystem --> DesktopLayout
ResponsiveDesign --> TouchOptimization
ResponsiveDesign --> AdaptiveUI

subgraph subGraph1 ["布局模式"]
    MobileLayout
    TabletLayout
    DesktopLayout
end

subgraph subGraph0 ["适配策略"]
    BreakpointSystem
    TouchOptimization
    AdaptiveUI
end
```

**移动端优化特性**:

1. **触摸友好**: 增大按钮尺寸，优化触摸目标
2. **手势支持**: 双指缩放、滑动翻页、长按菜单
3. **简化界面**: 隐藏非必要功能，突出核心操作
4. **自适应布局**: 根据屏幕方向和尺寸调整布局
5. **性能优化**: 减少动画效果，优化渲染性能

### CSS 媒体查询示例

```css
/* 移动端样式 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    padding: 8px;
  }

  .toolbarButton {
    min-height: 44px; /* 触摸友好尺寸 */
    margin: 2px;
  }

  .sidebarContainer {
    width: 100%;
    position: absolute;
    z-index: 100;
  }
}

/* 平板样式 */
@media (min-width: 769px) and (max-width: 1024px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .sidebarContainer {
    width: 300px;
    position: relative;
  }
}
```

来源: [web/viewer.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/web/viewer.css)

 [examples/mobile-viewer/viewer.css](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/examples/mobile-viewer/viewer.css)

## 可访问性支持

UI 组件系统包含完整的可访问性支持：

### 可访问性特性

```mermaid
flowchart TD

AccessibilitySupport["可访问性支持"]
KeyboardNavigation["键盘导航<br>(Tab 键支持)"]
ScreenReaderSupport["屏幕阅读器<br>(ARIA 标签)"]
HighContrastMode["高对比度模式<br>(视觉辅助)"]
FocusManagement["焦点管理<br>(逻辑顺序)"]
SemanticMarkup["语义标记<br>(HTML 结构)"]

AccessibilitySupport --> KeyboardNavigation
AccessibilitySupport --> ScreenReaderSupport
AccessibilitySupport --> HighContrastMode
AccessibilitySupport --> FocusManagement
AccessibilitySupport --> SemanticMarkup

subgraph subGraph1 ["视觉辅助"]
    HighContrastMode
    FocusManagement
    SemanticMarkup
end

subgraph subGraph0 ["交互辅助"]
    KeyboardNavigation
    ScreenReaderSupport
end
```

**可访问性功能**:
- **键盘导航**: 完整的键盘操作支持
- **屏幕阅读器**: ARIA 标签和语义化标记
- **高对比度**: 支持系统高对比度模式
- **焦点指示**: 清晰的焦点视觉反馈
- **语义结构**: 正确的 HTML 语义标记

这些 UI 组件共同构成了一个功能完整、用户友好的 PDF 查看器界面，支持从基础查看到高级编辑的各种使用场景。
