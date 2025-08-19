# PDF.js Vue 2 组件集成技术方案

## 项目概述

基于 PDF.js 4.4.168 版本，在 Vue 2 + Vant 2 + Vue CLI 5 技术栈下，构建一个专注于移动端的 PDF 阅读器组件。组件设计为高内聚、低耦合，可直接复制到其他项目中独立使用。

## 核心架构分析

### PDF.js 三层架构设计

基于 `project-read-me-doc` 源码分析，PDF.js 采用三层架构设计：

#### 1. 核心层 (Core Layer)
- **位置**: `src/core/`
- **职责**: PDF 解析、内容流处理、字体/图像处理
- **关键组件**:
  - `WorkerMessageHandler`: 工作线程消息处理器
  - `PartialEvaluator`: 内容流评估器
  - `PDFManager`: 文档管理器（LocalPdfManager/NetworkPdfManager）
  - `Document`: PDF 文档对象

#### 2. 显示层 (Display Layer)  
- **位置**: `src/display/`
- **职责**: 提供浏览器端 API，处理渲染管道
- **关键组件**:
  - `getDocument()`: 主要入口函数 (`src/display/api.js`)
  - `PDFDocumentProxy`: 文档代理对象
  - `PDFPageProxy`: 页面代理对象
  - 工厂模式类: `DOMCanvasFactory`, `DOMSVGFactory`

#### 3. 查看器层 (Viewer Layer)
- **位置**: `web/`
- **职责**: 完整的 PDF 查看器应用
- **关键组件**:
  - `PDFViewerApplication`: 应用控制器 (`web/app.js`)
  - `PDFViewer`: 文档容器 (`web/pdf_viewer.js`)
  - `PDFPageView`: 单页渲染器 (`web/pdf_page_view.js`)

### 页面渲染系统架构

#### 多层渲染架构
```
PDFPageView (容器)
├── canvasWrapper (z-index: 0) - PDF 视觉内容
├── textLayer (z-index: 1) - 文本选择层
├── annotationLayer (z-index: 2) - 表单和链接
└── annotationEditorLayer (z-index: 3) - 注释编辑
```

#### 组件层级关系
- `PDFViewer` → 管理多个 `PDFPageView`
- `PDFPageView` → 协调各个图层构建器
- `LayerBuilder` → 创建和管理特定图层
- `PDFRenderingQueue` → 优化渲染性能

### 事件驱动的组件通信

#### EventBus 模式
基于 PDF.js 的 `EventBus` 设计，组件间采用事件驱动通信：

```javascript
// 核心事件类型
const PDF_EVENTS = {
  DOCUMENT_LOADED: 'documentloaded',
  PAGE_CHANGING: 'pagechanging', 
  PAGE_RENDERED: 'pagerendered',
  SCALE_CHANGING: 'scalechanging',
  TEXT_LAYER_RENDERED: 'textlayerrendered'
};
```

### 工厂模式的平台抽象

#### 适配移动端的工厂类
```javascript
// 移动端优化的工厂类
class MobileCanvasFactory extends pdfjsLib.DOMCanvasFactory {
  create(width, height) {
    // 移动端 Canvas 尺寸限制
    const maxSize = 1024 * 1024; // 1M像素限制
    if (width * height > maxSize) {
      const scale = Math.sqrt(maxSize / (width * height));
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    return super.create(width, height);
  }
}
```

## Vue 2 组件架构设计

### 基于 PDF.js 组件系统的 Vue 2 适配

#### 组件结构设计
```
VuePdfViewer/                   # 基于 PDF.js Component System
├── components/
│   ├── PdfViewer.vue           # 基于 PDFViewer 的 Vue 包装
│   ├── PdfPageView.vue         # 基于 PDFPageView 的页面组件
│   ├── PdfTopToolbar.vue       # 顶部工具栏（搜索功能）
│   ├── PdfBottomToolbar.vue    # 底部工具栏（主要功能）
│   ├── PdfThumbnail.vue        # 基于 PDFThumbnailViewer
│   └── PdfOutline.vue          # 基于 PDFOutlineViewer
├── core/
│   ├── pdf-viewer-core.js      # 封装 PDF.js 核心 API
│   ├── mobile-factory.js       # 移动端工厂类
│   └── event-bus.js            # Vue 事件总线适配
├── store/
│   └── pdf-viewer.js           # Vuex 状态管理
├── mixins/
│   ├── pdf-component.js        # 通用 PDF 组件 mixin
│   └── mobile-gestures.js      # 移动端手势处理
├── styles/
│   └── pdf-viewer.less         # 基于 web/viewer.css 简化
└── index.js                    # 组件入口和 install 方法
```

#### 核心组件设计

**PdfViewer.vue - 主容器组件**
```vue
<template>
  <div class="vue-pdf-viewer">
    <!-- 顶部工具栏 -->
    <pdf-top-toolbar v-if="showToolbar" />
    
    <!-- PDF 视图容器 -->
    <div class="viewer-container" ref="viewerContainer">
      <div class="pdf-viewer" ref="pdfViewer"></div>
    </div>
    
    <!-- 侧边栏 -->
    <div class="sidebar-container" v-show="showSidebar">
      <pdf-thumbnail v-show="sidebarMode === 'thumbs'" />
      <pdf-outline v-show="sidebarMode === 'outline'" />
    </div>
    
    <!-- 底部工具栏 -->
    <pdf-bottom-toolbar v-if="showToolbar" />
    
    <!-- 加载状态 -->
    <van-loading v-if="loading">正在加载PDF...</van-loading>
  </div>
</template>

<script>
export default {
  name: 'PdfViewer',
  props: {
    src: { type: String, required: true },
    showToolbar: { type: Boolean, default: true },
    maxCanvasPixels: { type: Number, default: 0 }
  },
  async mounted() {
    this.pdfViewerCore = new PdfViewerCore({
      container: this.$refs.viewerContainer
    });
    await this.loadDocument(this.src);
  }
};
</script>
```

### 状态管理设计

#### Vuex 模块 - 基于 PDF.js 状态模式

```javascript
// store/pdf-viewer.js - 状态管理模块
const pdfViewerModule = {
  namespaced: true,
  
  state: {
    pdfDocument: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    loading: false,
    showSidebar: false,
    sidebarMode: 'thumbs', // 'thumbs' | 'outline'
    outline: null
  },
  
  mutations: {
    SET_PDF_DOCUMENT(state, document) {
      state.pdfDocument = document;
      state.totalPages = document?.numPages || 0;
    },
    SET_CURRENT_PAGE(state, page) {
      state.currentPage = page;
    },
    SET_SCALE(state, scale) {
      state.scale = Math.max(0.25, Math.min(5.0, scale));
    },
    TOGGLE_SIDEBAR(state, mode) {
      if (state.sidebarMode === mode && state.showSidebar) {
        state.showSidebar = false;
      } else {
        state.showSidebar = true;
        state.sidebarMode = mode;
      }
    }
    // ... 其他 mutations
  },
  
  actions: {
    async loadDocument({ commit }, src) {
      commit('SET_LOADING', true);
      const document = await getDocument(src).promise;
      commit('SET_PDF_DOCUMENT', document);
      commit('SET_LOADING', false);
    },
    goToPage({ commit }, pageNumber) {
      commit('SET_CURRENT_PAGE', pageNumber);
    },
    setScale({ commit }, scale) {
      commit('SET_SCALE', scale);
    },
    toggleSidebar({ commit }, mode) {
      commit('TOGGLE_SIDEBAR', mode);
    }
    // ... 其他 actions
  }
};
```

### 核心逻辑封装

#### pdf-viewer-core.js - 基于 PDF.js 组件系统

```javascript
// core/pdf-viewer-core.js - 核心逻辑封装
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { EventBus, PDFViewer, PDFLinkService } from 'pdfjs-dist/web/pdf_viewer';

GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

export class PdfViewerCore {
  constructor(options = {}) {
    this.container = options.container;
    this.eventBus = new EventBus();
    this._initializeViewer();
  }

  _initializeViewer() {
    this.pdfLinkService = new PDFLinkService({ eventBus: this.eventBus });
    this.pdfViewer = new PDFViewer({
      container: this.container,
      eventBus: this.eventBus,
      linkService: this.pdfLinkService,
      maxCanvasPixels: 0 // 移动端 CSS 缩放
    });
  }

  async loadDocument(src) {
    const loadingTask = getDocument({ url: src });
    this.pdfDocument = await loadingTask.promise;
    this.pdfViewer.setDocument(this.pdfDocument);
    return this.pdfDocument;
  }

  get currentPageNumber() {
    return this.pdfViewer.currentPageNumber;
  }

  set currentPageNumber(pageNumber) {
    this.pdfViewer.currentPageNumber = pageNumber;
  }
}
```

## 移动端优化策略

### 基于 mobile-viewer 示例的移动端适配

参考 `examples/mobile-viewer/` 的实现，针对移动端进行专门优化：

#### 性能优化配置
```javascript
// 移动端优化的 PDF.js 配置
const mobileConfig = {
  // 内存优化
  maxCanvasPixels: 0,           // 禁用 Canvas 缩放，使用 CSS 缩放
  maxImageSize: 1024 * 1024,    // 限制图像大小为 1M 像素
  
  // 文本层简化
  textLayerMode: 0,             // 禁用文本层以提升性能
  
  // 功能简化
  enableScripting: false,       // 禁用 PDF JavaScript
  annotationMode: 1,            // 仅启用表单注释
  
  // 渲染优化
  useOnlyCssZoom: true,         // 仅使用 CSS 缩放
  removePageBorders: true       // 移除页面边框
};
```

#### 移动端手势处理
```javascript
// mixins/mobile-gestures.js - 移动端手势处理
export default {
  methods: {
    initTouchGestures() {
      const container = this.$refs.viewerContainer;
      container.addEventListener('touchstart', this.onTouchStart);
      container.addEventListener('touchmove', this.onTouchMove);
    },
    
    onTouchStart(evt) {
      if (evt.touches.length === 2) {
        this.initialDistance = this.getTouchDistance(evt.touches);
        this.initialScale = this.pdfViewerCore.currentScale;
      }
    },
    
    onTouchMove(evt) {
      if (evt.touches.length === 2) {
        const distance = this.getTouchDistance(evt.touches);
        const scaleChange = distance / this.initialDistance;
        this.pdfViewerCore.currentScale = this.initialScale * scaleChange;
      }
    },
    
    getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }
};
```

#### 移动端 UI 适配

**PdfTopToolbar.vue - 顶部工具栏**
```vue
<template>
  <div class="pdf-top-toolbar">
    <!-- 搜索按钮（占位，后续扩展功能） -->
    <van-button 
      icon="search" 
      type="default" 
      size="small"
      @click="handleSearch"
      :disabled="!isSearchEnabled">
      搜索
    </van-button>
  </div>
</template>

<script>
export default {
  name: 'PdfTopToolbar',
  computed: {
    // 搜索功能目前作为扩展功能，暂时禁用
    isSearchEnabled() {
      return false; // 后续扩展时启用
    }
  },
  methods: {
    handleSearch() {
      // 占位方法，后续实现搜索功能
      this.$toast('搜索功能正在开发中...');
    }
  }
};
</script>
```

**PdfBottomToolbar.vue - 底部工具栏**
```vue
<template>
  <div class="pdf-bottom-toolbar">
    <!-- 缩略图按钮 -->
    <van-button 
      icon="photo-o" 
      @click="showThumbnails"
      :type="sidebarMode === 'thumbs' ? 'primary' : 'default'">
      缩略图
    </van-button>
    
    <!-- 目录按钮 -->
    <van-button 
      icon="list-switch" 
      @click="showOutline"
      :type="sidebarMode === 'outline' ? 'primary' : 'default'">
      目录
    </van-button>
    
    <!-- 上一页 -->
    <van-button 
      icon="arrow-left" 
      @click="prevPage"
      :disabled="currentPage <= 1">
      上一页
    </van-button>
    
    <!-- 页码显示 -->
    <div class="page-info">
      <span>{{ currentPage }} / {{ totalPages }}</span>
    </div>
    
    <!-- 下一页 -->
    <van-button 
      icon="arrow" 
      @click="nextPage"
      :disabled="currentPage >= totalPages">
      下一页
    </van-button>
    
    <!-- 缩小 -->
    <van-button 
      icon="minus" 
      @click="zoomOut"
      :disabled="scale <= 0.25">
      缩小
    </van-button>
    
    <!-- 缩放比例显示 -->
    <div class="scale-info">
      <span>{{ Math.round(scale * 100) }}%</span>
    </div>
    
    <!-- 放大 -->
    <van-button 
      icon="plus" 
      @click="zoomIn"
      :disabled="scale >= 5.0">
      放大
    </van-button>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'PdfBottomToolbar',
  computed: {
    ...mapState('pdfViewer', ['currentPage', 'totalPages', 'scale', 'sidebarMode'])
  },
  methods: {
    // MVP 核心功能
    showThumbnails() {
      this.$store.dispatch('pdfViewer/toggleSidebar', 'thumbs');
    },
    showOutline() {
      this.$store.dispatch('pdfViewer/toggleSidebar', 'outline');
    },
    prevPage() {
      this.$store.dispatch('pdfViewer/goToPage', this.currentPage - 1);
    },
    nextPage() {
      this.$store.dispatch('pdfViewer/goToPage', this.currentPage + 1);
    },
    zoomOut() {
      this.$store.dispatch('pdfViewer/setScale', this.scale / 1.2);
    },
    zoomIn() {
      this.$store.dispatch('pdfViewer/setScale', this.scale * 1.2);
    }
  }
};
</script>
```

## 依赖处理策略

### 基于 PDF.js 组件系统的依赖管理

#### 1. 核心依赖
```json
{
  "dependencies": {
    "pdfjs-dist": "^4.4.168",
    "vant": "^2.x",
    "vuex": "^3.x"
  },
  "devDependencies": {
    "less": "^4.x",
    "less-loader": "^10.x"
  }
}
```

#### 2. PDF.js 模块化导入
```javascript
// 核心 API 导入
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// 查看器组件导入
import { 
  EventBus,
  PDFViewer,
  PDFLinkService,
  PDFThumbnailViewer,
  PDFOutlineViewer
} from 'pdfjs-dist/web/pdf_viewer';
```

#### 3. Worker 配置
```javascript
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';
```

#### 4. 样式处理策略
```less
// styles/pdf-viewer.less - 基于项目样式规范
@primary-color: #1890ff;
@background-color: #f5f5f5;
@toolbar-height: 48px;

.vue-pdf-viewer {
  width: 100%;
  height: 100vh;
  background-color: @background-color;
  display: flex;
  flex-direction: column;
  
  // 顶部工具栏
  .pdf-top-toolbar {
    height: @toolbar-height;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  
  // PDF 视图容器
  .viewer-container {
    flex: 1;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  // 底部工具栏
  .pdf-bottom-toolbar {
    height: @toolbar-height;
    padding: 8px 16px;
    background: #fff;
    border-top: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 8px;
    
    .page-info, .scale-info {
      font-size: 14px;
      color: #666;
      min-width: 60px;
      text-align: center;
    }
  }
  
  // 侧边栏
  .sidebar-container {
    position: fixed;
    top: @toolbar-height;
    right: 0;
    bottom: @toolbar-height;
    width: 280px;
    background: #fff;
    box-shadow: -2px 0 8px rgba(0,0,0,0.1);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    
    &.show {
      transform: translateX(0);
    }
  }
}
```

## 核心 API 集成

### 基于 getDocument API 的文档加载

#### 1. 文档加载流程
基于 `getDocument()` API 的文档加载：

```javascript
async loadDocument(src) {
  const loadingTask = getDocument({
    url: src,
    maxImageSize: 1024 * 1024,  // 移动端优化
    isEvalSupported: false
  });
  
  loadingTask.onProgress = (progress) => {
    this.$emit('load-progress', progress);
  };
  
  try {
    const pdfDocument = await loadingTask.promise;
    this.pdfViewer.setDocument(pdfDocument);
    return pdfDocument;
  } catch (error) {
    this.$emit('load-error', error);
    throw error;
  }
}
```

#### 2. 工作线程通信
基于 `WorkerMessageHandler` 的通信：

```javascript
// 工作线程通信封装
export class WorkerTransport {
  constructor() {
    this.worker = new PDFWorker({ name: 'pdf-worker' });
    this.messageHandler = new MessageHandler('main', 'worker', this.worker.port);
    this.setupMessageHandlers();
  }
  
  setupMessageHandlers() {
    this.messageHandler.on('documentloaded', this.onDocumentLoaded);
    this.messageHandler.on('pagerendered', this.onPageRendered);
  }
  
  async getDocument(params) {
    return this.messageHandler.sendWithPromise('GetDocRequest', params);
  }
}
```

### 基于 PDFDocumentProxy 的文档操作

#### 文档属性访问
```javascript
// 基于 PDFDocumentProxy 的文档信息获取
export const DocumentService = {
  async getDocumentInfo(pdfDocument) {
    const [info, outline] = await Promise.all([
      pdfDocument.getMetadata(),
      pdfDocument.getOutline()
    ]);
    
    return {
      numPages: pdfDocument.numPages,
      info: info.info,
      outline
    };
  },
  
  async getPageLabels(pdfDocument) {
    try {
      return await pdfDocument.getPageLabels();
    } catch {
      return Array.from({ length: pdfDocument.numPages }, (_, i) => `${i + 1}`);
    }
  }
};
```

### 基于 PDFPageProxy 的页面渲染

#### 页面渲染管道
```javascript
// 基于 PDFPageView 的页面渲染实现
export class VuePdfPageView {
  constructor(options) {
    this.id = options.id;
    this.pdfPage = null;
    this.viewport = null;
    this.renderingState = RenderingStates.INITIAL;
  }
  
  async draw() {
    this.renderingState = RenderingStates.RUNNING;
    
    // 创建视口
    this.viewport = this.pdfPage.getViewport({ scale: this.scale });
    
    // 创建 Canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 渲染 PDF 内容
    const renderContext = {
      canvasContext: context,
      viewport: this.viewport,
      enableWebGL: false
    };
    
    await this.pdfPage.render(renderContext).promise;
    
    // 渲染文本层和注释层
    await this.renderTextLayer();
    await this.renderAnnotationLayer();
    
    this.renderingState = RenderingStates.FINISHED;
  }
  
  async renderTextLayer() {
    const textContent = await this.pdfPage.getTextContent();
    await TextLayer.render({ textContentSource: textContent, container: this.textLayer });
  }
  
  async renderAnnotationLayer() {
    const annotations = await this.pdfPage.getAnnotations();
    await AnnotationLayer.render({ annotations, div: this.annotationLayer });
  }
}
```

### 错误处理和资源管理

#### 统一错误处理
```javascript
export const ErrorHandler = {
  handlePdfError(error) {
    switch (error.name) {
      case 'InvalidPDFException':
        return { userMessage: 'PDF 文件格式无效', action: 'retry' };
      case 'MissingPDFException':
        return { userMessage: '找不到 PDF 文件', action: 'check_url' };
      case 'PasswordException':
        return { userMessage: '需要密码', action: 'request_password' };
      default:
        return { userMessage: '加载失败', action: 'report' };
    }
  }
};
```

#### 资源清理
```javascript
export class ResourceManager {
  async cleanup(components) {
    const tasks = [];
    
    if (components.loadingTask) tasks.push(components.loadingTask.destroy());
    if (components.pdfDocument) tasks.push(components.pdfDocument.destroy());
    if (components.worker) tasks.push(components.worker.destroy());
    
    await Promise.all(tasks);
  }
}

## 组件 API 设计

### 基于 PDF.js 事件系统的 Vue API

#### Props 设计
```javascript
// PdfViewer.vue - 主要 Props
props: {
  src: { type: String, required: true },               // PDF 文件路径
  showToolbar: { type: Boolean, default: true },       // 显示工具栏
  maxCanvasPixels: { type: Number, default: 0 },       // CSS 缩放模式
  textLayerMode: { type: Number, default: 1 },         // 文本层模式
  initialPage: { type: Number, default: 1 },           // 初始页码
  enableGestures: { type: Boolean, default: true },    // 手势支持
  theme: { type: String, default: 'light' }            // 主题
}
```

#### Events 设计 - 基于 PDF.js EventBus

```javascript
// Vue 事件 API - 映射 PDF.js 原生事件
const events = {
  'document-loaded': 'documentloaded',       // 文档加载完成
  'page-changed': 'pagechanged',             // 页面切换
  'scale-changed': 'scalechanged',           // 缩放变化
  'load-progress': 'loadprogress',           // 加载进度
  'load-error': 'loaderror',                 // 加载错误
  'password-required': 'passwordrequired'    // 需要密码
};

// 事件参数示例
const eventParams = {
  'document-loaded': { numPages: Number, info: Object },
  'page-changed': { pageNumber: Number, previous: Number },
  'load-progress': { loaded: Number, total: Number }
};
```

#### Methods 设计 - 基于 PDFViewer API

```javascript
// PdfViewer.vue - 公共方法
methods: {
  // 文档操作
  async loadDocument(src) {
    return this.pdfViewerCore.loadDocument(src);
  },
  
  // 页面导航
  goToPage(pageNumber) {
    this.pdfViewerCore.currentPageNumber = pageNumber;
  },
  
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  },
  
  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  },
  
  // 缩放控制
  setScale(scale) {
    this.pdfViewerCore.currentScale = scale;
  },
  
  zoomIn() {
    this.setScale(this.scale * 1.2);
  },
  
  zoomOut() {
    this.setScale(this.scale / 1.2);
  },
  
  // 侧边栏控制
  toggleSidebar(mode = 'thumbs') {
    this.$store.dispatch('pdfViewer/toggleSidebar', mode);
  },
  
  // 搜索功能
  search(query, options = {}) {
    this.findController.executeCommand('find', { query, ...options });
  },
  
  // 资源清理
  async cleanup() {
    await ResourceManager.cleanup(this.components);
  }
}
```

#### Computed Properties

```javascript
computed: {
  ...mapState('pdfViewer', ['loading', 'currentPage', 'totalPages', 'scale']),
  ...mapGetters('pdfViewer', ['isDocumentLoaded']),
  
  viewerClasses() {
    return {
      'vue-pdf-viewer': true,
      'mobile-mode': this.$vant.isMobile,
      'loading': this.loading
    };
  },
  
  canGoNext() {
    return this.currentPage < this.totalPages;
  },
  
  scalePercent() {
    return Math.round(this.scale * 100);
  }
}
```

## 组件使用方式和技术决策

### 基于 PDF.js Component System 的集成方式

#### 1. 安装和引入
```bash
# 安装核心依赖
npm install pdfjs-dist@4.4.168
npm install vant@2
npm install vuex@3

# 开发依赖
npm install less less-loader
```

#### 2. 在 Vue 项目中集成
```javascript
// main.js - Vue 项目入口
import Vue from 'vue';
import Vuex from 'vuex';
import Vant from 'vant';
import 'vant/lib/index.css';

// 引入 PDF 查看器组件
import PdfViewer from '@/components/VuePdfViewer';

Vue.use(Vuex);
Vue.use(Vant);
Vue.component('PdfViewer', PdfViewer);

// 创建 Vuex store
const store = new Vuex.Store({
  modules: {
    // PDF 查看器模块会动态注册
  }
});

new Vue({
  store,
  render: h => h(App)
}).$mount('#app');
```

#### 3. 使用示例
```vue
<template>
  <div class="app">
    <!-- 完整的 PDF 查看器 -->
    <pdf-viewer
      :src="pdfUrl"
      :show-toolbar="true"
      @document-loaded="onDocumentLoaded"
      @load-error="onLoadError"
      @page-changed="onPageChanged"
    />
  </div>
</template>

<script>
export default {
  data() {
    return { pdfUrl: '/assets/sample.pdf' };
  },
  
  methods: {
    onDocumentLoaded(event) {
      this.$toast.success(`PDF 加载完成，共 ${event.numPages} 页`);
    },
    
    onLoadError(error) {
      this.$toast.fail('PDF 加载失败');
    },
    
    onPageChanged(event) {
      console.log('当前页码:', event.pageNumber);
    }
  }
};
</script>

<style>
.app {
  height: 100vh;
  overflow: hidden;
}
</style>
```

### 技术决策总结

基于 `project-read-me-doc` 源码分析的技术决策：

#### 1. 架构决策
- **三层架构**: 遵循 PDF.js 的 Core/Display/Viewer 分层设计
- **组件系统**: 基于 PDF.js Component System，而非完整 Web Viewer
- **事件驱动**: 采用 EventBus 模式，保持与 PDF.js 原生事件系统的兼容性
- **工厂模式**: 使用移动端优化的工厂类，实现平台抽象

#### 2. 移动端优化决策
- **性能优先**: 基于 `examples/mobile-viewer` 的配置策略
- **内存管理**: 限制 Canvas 像素、图像大小，使用 CSS 缩放
- **简化功能**: 禁用脚本执行、减少文本层开销
- **手势支持**: 实现双指缩放、滑动导航

#### 3. Vue 集成决策
- **状态管理**: Vuex 模块化设计，动态注册，避免全局污染
- **生命周期**: 严格管理资源创建和销毁，防止内存泄漏
- **事件映射**: PDF.js 原生事件映射为 Vue 事件，保持 API 一致性

#### 4. 依赖管理决策
- **核心依赖**: 基于 `pdfjs-dist` NPM 包，版本锁定 4.4.168
- **按需导入**: 仅导入必要的 PDF.js 组件，减少打包体积
- **工作线程**: 独立的 Worker 配置，避免阻塞主线程

## MVP 核心特性

- PDF 文档加载和渲染
- 基本页面导航（前进、后退、跳转）
- 缩放控制（放大、缩小）
- 缩略图显示和导航
- 目录解析和跳转
- 上下滑动阅读方式（连续滚动模式）

### 基于 PDF.js 核心 API

1. **文档加载**
   - 基于 `getDocument()` API 的文档加载
   - 支持 URL、TypedArray、自定义传输等多种数据源
2. **多层渲染系统**
   - Canvas 层：PDF 视觉内容渲染
   - Text 层：文本选择和搜索支持
   - 基于 `PDFPageView` 的页面渲染管道
3. **页面导航**
   - 基于 `PDFViewer.currentPageNumber` 的页面控制
   - 支持程序化导航和用户交互导航
   - 页面状态同步和事件通知
4. **缩放系统**
   - 基于 `PDFViewer.currentScale` 的缩放控制
   - 支持数值缩放、适应宽度、适应页面等模式
5. **侧边栏功能**
   - 基于 `PDFThumbnailViewer` 的缩略图
   - 基于 `PDFOutlineViewer` 的目录导航


## 后续扩展方向

### 1. 移动端优化增强
基于 `examples/mobile-viewer` 的深度优化：
- CSS 缩放模式，减少内存占用
- 触摸手势支持，优化移动端体验
- 性能配置，适配低端设备
- 移动端双指缩放手势完善
- 响应式侧边栏布局
- 完整的进度监听和错误处理

### 2. 搜索功能增强
基于 `PDFFindController` 实现：
- 全文搜索和高亮显示
- 搜索结果导航
- 搜索选项配置（大小写、整词匹配）

### 3. 注释系统
基于 `AnnotationEditorLayerBuilder` 实现：
- 高亮注释、文本注释
- 手绘注释（移动端）
- 注释数据的保存和加载

### 4. 性能优化
- 基于 `PDFRenderingQueue` 的渲染优化
- 虚拟滚动，优化大文档性能
- 页面预渲染和缓存策略

### 5. 无障碍功能
基于 `StructTreeLayerBuilder` 实现：
- 屏幕阅读器支持
- 键盘导航
- 高对比度模式

### 6. 国际化支持
基于 `GenericL10n` 实现：
- 多语言界面
- RTL 语言支持
- 本地化日期和数字格式

### 7. 高级功能
- 基于 `PDFPrintService` 的打印功能
- 文档对比和合并
- 数字签名验证
- 表单填写和提交

这个技术方案充分利用了 PDF.js 的组件化架构，在保持完整功能的同时，实现了移动端优化和 Vue 2 的深度集成。
