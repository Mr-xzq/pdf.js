# xzq-pdf-js 示例分析文档

本文档详细分析了 xzq-pdf-js 项目中的各个示例，为创建 Vue 2 + Vue CLI 5 集成提供技术参考。

## 目录结构概览

```
examples/
├── learning/           # 基础学习示例
├── components/         # PDF.js 组件示例
├── mobile-viewer/      # 移动端查看器
├── node/              # Node.js 环境示例
├── text-only/         # 纯文本渲染示例
├── webpack/           # Webpack 集成示例
├── image_decoders/    # 图像解码器示例
└── web-vue2/          # Vue 2 实现（本次分析排除）
```

## 1. Learning 目录 - 基础学习示例

### 1.1 helloworld.html - 最基础的 PDF 渲染示例

**功能描述：**
- 展示最简单的 PDF 文档加载和渲染
- 将 PDF 第一页渲染到 Canvas 元素上
- 支持高 DPI 屏幕显示

**PDF.js 集成要点：**
- 使用 `pdfjsLib.getDocument()` 加载 PDF 文档
- 通过 `pdf.getPage(1)` 获取第一页
- 使用 `page.getViewport()` 设置视口和缩放
- 通过 `page.render()` 将页面渲染到 Canvas

**核心代码模式：**
```javascript
// 设置 Worker 路径
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

// 加载文档
const loadingTask = pdfjsLib.getDocument(url);
const pdf = await loadingTask.promise;

// 获取页面并渲染
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.5 });
const renderContext = {
  canvasContext: context,
  transform,
  viewport,
};
page.render(renderContext);
```

### 1.2 helloworld64.html - Base64 编码 PDF 示例

**功能描述：**
- 演示如何处理 Base64 编码的 PDF 数据
- 使用内嵌的 PDF 数据而非外部文件

**技术特点：**
- 使用 `atob()` 解码 Base64 数据
- 通过 `{ data: pdfData }` 参数传递二进制数据
- 其他渲染流程与基础示例相同

### 1.3 prevnext.html - 页面导航示例

**功能描述：**
- 实现多页 PDF 的前后翻页功能
- 显示当前页码和总页数
- 处理页面渲染队列，避免并发渲染问题

**核心功能：**
- 页面渲染队列管理（`pageRendering` 和 `pageNumPending`）
- 前后页导航按钮事件处理
- 页码显示和验证

## 2. Components 目录 - PDF.js 高级组件示例

### 2.1 simpleviewer.html/mjs - 简单查看器组件

**功能描述：**
- 使用 PDF.js 内置的 `PDFViewer` 组件
- 提供完整的 PDF 查看功能，包括缩放、搜索等
- 支持超链接、表单和脚本功能

**PDF.js 集成架构：**
```javascript
// 核心组件初始化
const eventBus = new pdfjsViewer.EventBus();
const pdfLinkService = new pdfjsViewer.PDFLinkService({ eventBus });
const pdfFindController = new pdfjsViewer.PDFFindController({ eventBus, linkService: pdfLinkService });
const pdfScriptingManager = new pdfjsViewer.PDFScriptingManager({ eventBus });

const pdfViewer = new pdfjsViewer.PDFViewer({
  container,
  eventBus,
  linkService: pdfLinkService,
  findController: pdfFindController,
  scriptingManager: pdfScriptingManager,
});
```

**关键配置：**
- CMAP 支持：`cMapUrl` 和 `cMapPacked` 用于处理特殊字符编码
- XFA 支持：`enableXfa: true` 启用 XML 表单架构
- 沙箱支持：`SANDBOX_BUNDLE_SRC` 用于安全的脚本执行

### 2.2 pageviewer.html/mjs - 单页查看器

**功能描述：**
- 使用 `PDFPageView` 组件渲染单个页面
- 适用于只需要显示特定页面的场景

**技术实现：**
```javascript
const pdfPageView = new pdfjsViewer.PDFPageView({
  container,
  id: PAGE_TO_VIEW,
  scale: SCALE,
  defaultViewport: pdfPage.getViewport({ scale: SCALE }),
  eventBus,
});
pdfPageView.setPdfPage(pdfPage);
pdfPageView.draw();
```

### 2.3 singlepageviewer.html/mjs - 单页模式查看器

**功能描述：**
- 使用 `PDFSinglePageViewer` 组件
- 一次只显示一页，适合移动端或空间受限的场景
- 保持完整的查看器功能（搜索、链接等）

## 3. Mobile-viewer 目录 - 移动端优化查看器

**功能描述：**
- 专为移动设备优化的 PDF 查看器
- 包含触摸友好的控制界面
- 优化的性能配置

**移动端优化配置：**
```javascript
const MAX_CANVAS_PIXELS = 0; // 仅使用 CSS 缩放
const TEXT_LAYER_MODE = 0;   // 禁用文本层
const MAX_IMAGE_SIZE = 1024 * 1024; // 限制图像大小
```

**架构特点：**
- 使用应用程序对象模式 (`PDFViewerApplication`)
- 集成进度条显示
- 响应式布局设计

## 4. Node.js 目录 - 服务端示例

### 4.1 getinfo.mjs - PDF 信息提取

**功能描述：**
- 在 Node.js 环境中提取 PDF 元数据和文本内容
- 演示服务端 PDF 处理能力

**核心功能：**

- 文档元数据提取：`doc.getMetadata()`
- 文本内容提取：`page.getTextContent()`
- 页面信息获取：`page.getViewport()`

### 4.2 pdf2png/ - PDF 转图片

**功能描述：**
- 将 PDF 页面转换为 PNG 图片
- 使用 Node.js Canvas 库进行渲染

**技术实现：**
- 自定义 `NodeCanvasFactory` 类
- 使用 `canvas` 库创建服务端 Canvas
- 支持标准字体和 CMAP

## 5. Text-only 目录 - 纯文本渲染

**功能描述：**
- 将 PDF 文本内容渲染为 SVG
- 不渲染图像，只处理文本元素
- 适用于文本提取和轻量级显示

**技术特点：**
- 使用 `page.getTextContent()` 获取文本
- 通过 SVG 元素重建文本布局
- 保持原始字体和位置信息

## 6. Webpack 目录 - 构建工具集成

**功能描述：**
- 演示如何在 Webpack 项目中集成 PDF.js
- 处理 Worker 文件的打包

**关键配置：**
```javascript
// webpack.config.js
module.exports = {
  entry: {
    main: "./main.mjs",
    "pdf.worker": "pdfjs-dist/build/pdf.worker.mjs",
  },
  // ...
};
```

**注意事项：**
- 必须单独打包 Worker 文件
- 需要正确设置 `workerSrc` 路径
- 压缩时需保持类名和函数名不变

## 7. Image_decoders 目录 - 图像解码器

**功能描述：**
- 演示 PDF.js 的独立图像解码功能
- 可以单独使用 JPEG 解码器处理图像

**技术实现：**
- 使用 `pdfjsImageDecoders.JpegImage`
- 独立于完整 PDF.js 库的轻量级解决方案
