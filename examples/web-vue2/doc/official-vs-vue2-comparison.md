# PDF.js 官方实践 vs Vue2 实现对比分析

## 概述

本文档对比分析了 PDF.js 官方 web 实现与我们的 Vue2 实现，重点关注 PDF 展示、目录、跳转、缩略图等核心功能的架构设计和实现方式。

## 1. 整体架构对比

### 官方实践 (web/)
```
PDFViewerApplication (app.js)
├── EventBus (事件总线)
├── PDFViewer (pdf_viewer.js) - 主视图容器
├── PDFLinkService (pdf_link_service.js) - 链接服务
├── PDFHistory (pdf_history.js) - 历史管理
├── PDFOutlineViewer (pdf_outline_viewer.js) - 目录查看器
├── PDFThumbnailViewer (pdf_thumbnail_viewer.js) - 缩略图查看器
├── PDFSidebar (pdf_sidebar.js) - 侧边栏
├── PDFRenderingQueue (pdf_rendering_queue.js) - 渲染队列
└── 各种UI组件 (toolbar.js, secondary_toolbar.js等)
```

**特点：**
- 单一全局应用对象 `PDFViewerApplication`
- 基于 EventBus 的松耦合组件通信
- 每个功能模块独立封装为类
- 渲染队列统一管理页面渲染

### Vue2 实现 (examples/web-vue2/)
```
PdfViewer.vue (主组件)
├── PdfViewerCore.vue (核心查看器)
│   └── PdfPageContainer.vue (页面容器)
├── PdfTopToolbar.vue (顶部工具栏)
├── PdfBottomToolbar.vue (底部工具栏)
├── Vuex Store (状态管理)
│   ├── document.js (文档状态)
│   └── viewer.js (查看器状态)
└── 服务层
    ├── PdfApplication (pdf-application.js)
    ├── PdfServices (pdf-services.js)
    └── EventBridge (pdf-events.js)
```

**特点：**
- Vue 组件化架构
- Vuex 集中状态管理
- 服务层封装 PDF.js 原生功能
- 事件桥接器连接 PDF.js EventBus 和 Vue 组件

## 2. PDF 展示功能对比

### 官方实践
```javascript
// pdf_viewer.js - 主要负责页面布局和渲染管理
class PDFViewer {
  constructor(options) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.linkService = options.linkService;
    this.renderingQueue = options.renderingQueue;
    this._pages = [];
    this._currentPageNumber = 1;
    this._currentScale = 1.0;
  }

  setDocument(pdfDocument) {
    this.pdfDocument = pdfDocument;
    this._resetView();
    this._setupPages();
  }

  _setupPages() {
    // 为每一页创建 PDFPageView 实例
    for (let pageNum = 1; pageNum <= this.pagesCount; ++pageNum) {
      const pageView = new PDFPageView({
        container: this._pages[pageNum - 1],
        id: pageNum,
        scale: this._currentScale,
        defaultViewport: viewport,
        eventBus: this.eventBus,
        renderingQueue: this.renderingQueue,
        textLayerMode: this._textLayerMode,
        annotationMode: this._annotationMode
      });
      this._pages.push(pageView);
    }
  }
}
```

### Vue2 实现
```javascript
// PdfViewerCore.vue - 核心查看器组件
export default {
  data() {
    return {
      pdfServices: null,
      currentPage: 1,
      currentScale: 1.0,
      documentLoaded: false
    };
  },

  async mounted() {
    await this.initializeServices();
    if (this.src) {
      await this.loadDocument();
    }
  },

  methods: {
    async initializeServices() {
      this.pdfServices = new PdfServices(this, {
        isMobile: true,
        maxCanvasPixels: this.maxCanvasPixels,
        textLayerMode: this.textLayerMode
      });
    },

    async loadDocument() {
      const result = await this.pdfServices.loadDocument(this.src, {
        onProgress: this.onLoadProgress,
        onPassword: this.onPasswordRequired
      });
      this.documentLoaded = true;
      this.$emit('document-loaded', result);
    }
  }
}
```

**对比分析：**
- **官方**：直接使用 PDF.js 原生 API，手动管理页面生命周期
- **Vue2**：通过服务层封装，利用 Vue 响应式系统自动更新视图
- **优势**：Vue2 实现更简洁，状态管理更清晰
- **劣势**：Vue2 实现增加了抽象层，可能影响性能

## 3. 目录功能对比

### 官方实践
```javascript
// pdf_outline_viewer.js - 继承自 BaseTreeViewer
class PDFOutlineViewer extends BaseTreeViewer {
  constructor(options) {
    super(options);
    this.linkService = options.linkService;
    this.downloadManager = options.downloadManager;

    // 监听事件
    this.eventBus._on("toggleoutlinetree", this._toggleAllTreeItems.bind(this));
    this.eventBus._on("currentoutlineitem", this._currentOutlineItem.bind(this));
  }

  render({ outline, pdfDocument }) {
    this._outline = outline || null;
    this._pdfDocument = pdfDocument || null;

    if (!outline) {
      this._dispatchEvent(0);
      return;
    }

    // 构建目录树
    const fragment = document.createDocumentFragment();
    const queue = [{ parent: fragment, items: outline }];
    
    while (queue.length > 0) {
      const levelData = queue.shift();
      for (const item of levelData.items) {
        const div = this._createOutlineItem(item);
        levelData.parent.appendChild(div);
        
        if (item.items?.length > 0) {
          queue.push({ parent: div, items: item.items });
        }
      }
    }
    
    this.container.appendChild(fragment);
    this._dispatchEvent(outline.length);
  }

  _createOutlineItem(item) {
    const element = document.createElement("div");
    element.className = "treeItem";
    
    const a = document.createElement("a");
    a.href = this.linkService.getDestinationHash(item.dest);
    a.title = removeNullCharacters(item.title);
    a.onclick = () => {
      this.linkService.goToDestination(item.dest);
      return false;
    };
    
    element.appendChild(a);
    return element;
  }
}
```

### Vue2 实现
目前 Vue2 实现中目录功能尚未完全实现，但基于现有架构，应该是这样的设计：

```javascript
// 预期的 PdfOutlineViewer.vue 组件
export default {
  name: 'PdfOutlineViewer',
  
  computed: {
    ...mapDocumentState(['pdfDocument']),
    ...mapDocumentGetters(['outline'])
  },

  methods: {
    ...mapViewerActions(['goToPage']),

    onOutlineItemClick(item) {
      if (item.dest) {
        // 通过服务层处理目标跳转
        this.pdfServices.goToDestination(item.dest);
      }
    },

    renderOutlineTree(outline) {
      // 使用 Vue 模板递归渲染目录树
      return outline.map(item => ({
        ...item,
        children: item.items ? this.renderOutlineTree(item.items) : []
      }));
    }
  }
}
```

**对比分析：**
- **官方**：手动 DOM 操作，直接使用 EventBus 通信
- **Vue2**：声明式模板，通过 Vuex 状态管理
- **优势**：Vue2 实现更易维护，支持响应式更新
- **劣势**：需要额外的状态同步逻辑

## 4. 跳转功能对比

### 官方实践
```javascript
// pdf_link_service.js - 专门的链接服务
class PDFLinkService {
  constructor({ eventBus, externalLinkTarget, externalLinkRel, ignoreDestinationZoom }) {
    this.eventBus = eventBus;
    this.externalLinkTarget = externalLinkTarget;
    this.externalLinkRel = externalLinkRel;
    this._ignoreDestinationZoom = ignoreDestinationZoom;
    
    this.pdfDocument = null;
    this.pdfViewer = null;
    this.pdfHistory = null;
  }

  async goToDestination(dest) {
    if (!this.pdfDocument) return;
    
    let namedDest, explicitDest, pageNumber;
    if (typeof dest === "string") {
      namedDest = dest;
      explicitDest = await this.pdfDocument.getDestination(dest);
    } else {
      explicitDest = await dest;
    }

    if (!Array.isArray(explicitDest)) {
      console.error(`goToDestination: "${explicitDest}" is not a valid destination`);
      return;
    }

    const [destRef] = explicitDest;
    if (destRef && typeof destRef === "object") {
      pageNumber = await this.pdfDocument.getPageIndex(destRef) + 1;
    } else if (Number.isInteger(destRef)) {
      pageNumber = destRef + 1;
    }

    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > this.pagesCount) {
      console.error(`goToDestination: "${pageNumber}" is not a valid page number.`);
      return;
    }

    // 更新历史记录
    if (this.pdfHistory) {
      this.pdfHistory.updateCurrentBookmark(namedDest, pageNumber);
    }

    // 跳转到页面
    this.pdfViewer.scrollPageIntoView({
      pageNumber,
      destArray: explicitDest,
      ignoreDestinationZoom: this._ignoreDestinationZoom,
    });
  }

  goToPage(pageNumber) {
    if (!this.pdfDocument) return;
    
    pageNumber = Math.max(1, Math.min(pageNumber, this.pagesCount));
    this.pdfViewer.currentPageNumber = pageNumber;
    
    if (this.pdfHistory) {
      this.pdfHistory.updateCurrentBookmark(null, pageNumber);
    }
  }
}
```

### Vue2 实现
```javascript
// pdf-services.js - 服务层封装跳转功能
export class PdfServices {
  async goToDestination(dest) {
    if (!this.application || !this.application.pdfDocument) {
      throw new Error('PDF 文档未加载');
    }

    try {
      // 使用官方 LinkService
      await this.application.linkService.goToDestination(dest);

      // 同步状态到 Vuex
      const currentPage = this.application.linkService.page;
      this.vueComponent.$store.commit('pdfReader/viewer/SET_CURRENT_PAGE', currentPage);

      // 触发 Vue 事件
      this.vueComponent.$emit('page-changed', {
        pageNumber: currentPage,
        source: 'destination'
      });
    } catch (error) {
      console.error('跳转到目标失败:', error);
      throw error;
    }
  }

  async goToPage(pageNumber) {
    if (!this.application || !this.application.pdfDocument) {
      throw new Error('PDF 文档未加载');
    }

    try {
      // 验证页码
      const totalPages = this.application.pdfDocument.numPages;
      pageNumber = Math.max(1, Math.min(pageNumber, totalPages));

      // 使用官方 LinkService
      this.application.linkService.goToPage(pageNumber);

      // 同步状态到 Vuex
      this.vueComponent.$store.commit('pdfReader/viewer/SET_CURRENT_PAGE', pageNumber);

      // 触发 Vue 事件
      this.vueComponent.$emit('page-changed', {
        pageNumber,
        source: 'navigation'
      });
    } catch (error) {
      console.error('跳转到页面失败:', error);
      throw error;
    }
  }
}
```

**对比分析：**
- **官方**：直接操作 PDF.js 原生 API，性能最优
- **Vue2**：通过服务层封装，增加了状态同步逻辑
- **优势**：Vue2 实现提供了统一的状态管理和事件处理
- **劣势**：增加了额外的抽象层和状态同步开销

## 5. 缩略图功能对比

### 官方实践
```javascript
// pdf_thumbnail_viewer.js - 缩略图查看器
class PDFThumbnailViewer {
  constructor(options) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.linkService = options.linkService;
    this.renderingQueue = options.renderingQueue;
    this._thumbnails = [];
    this._currentPageNumber = 1;
  }

  setDocument(pdfDocument) {
    this.pdfDocument = pdfDocument;
    this._resetView();
    this._setupThumbnails();
  }

  _setupThumbnails() {
    const fragment = document.createDocumentFragment();

    for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
      const thumbnail = new PDFThumbnailView({
        container: fragment,
        eventBus: this.eventBus,
        id: pageNum,
        defaultViewport: viewport.clone({ scale: THUMBNAIL_SCALE }),
        linkService: this.linkService,
        renderingQueue: this.renderingQueue
      });

      this._thumbnails.push(thumbnail);
    }

    this.container.appendChild(fragment);
  }

  scrollThumbnailIntoView(pageNumber) {
    if (!this._thumbnails[pageNumber - 1]) return;

    const thumbnail = this._thumbnails[pageNumber - 1];
    scrollIntoView(thumbnail.div, this.container, {
      top: THUMBNAIL_SCROLL_MARGIN
    });
  }
}

// pdf_thumbnail_view.js - 单个缩略图视图
class PDFThumbnailView {
  constructor(options) {
    this.id = options.id;
    this.renderingId = "thumbnail" + options.id;
    this.pageLabel = options.pageLabel || null;
    this.pdfPage = null;
    this.rotation = 0;
    this.viewport = options.defaultViewport;
    this.pdfPageRotate = options.defaultViewport.rotation;

    this.eventBus = options.eventBus;
    this.linkService = options.linkService;
    this.renderingQueue = options.renderingQueue;

    this.renderingState = RenderingStates.INITIAL;
    this.resume = null;

    this.div = this._createContainer();
    options.container.appendChild(this.div);
  }

  _createContainer() {
    const div = document.createElement("div");
    div.className = "thumbnail";
    div.setAttribute("data-page-number", this.id);

    const ring = document.createElement("div");
    ring.className = "thumbnailSelectionRing";

    const borderAdjustment = 2 * THUMBNAIL_CANVAS_BORDER_WIDTH;
    ring.style.width = this.viewport.width + borderAdjustment + "px";
    ring.style.height = this.viewport.height + borderAdjustment + "px";

    div.appendChild(ring);

    ring.addEventListener("click", this._onClick.bind(this));

    return div;
  }

  _onClick() {
    this.linkService.goToPage(this.id);
  }

  async draw() {
    if (this.renderingState !== RenderingStates.INITIAL) {
      console.error("Must be in new state before drawing");
      return this.renderingState;
    }

    const { pdfPage } = this;
    if (!pdfPage) {
      this.renderingState = RenderingStates.FINISHED;
      throw new Error("pdfPage is not loaded");
    }

    this.renderingState = RenderingStates.RUNNING;

    const [canvas, ctx] = TempImageFactory.getCanvas(
      this.viewport.width,
      this.viewport.height
    );

    const renderContext = {
      canvasContext: ctx,
      viewport: this.viewport,
      optionalContentConfigPromise: this._optionalContentConfigPromise,
    };

    const renderTask = pdfPage.render(renderContext);

    try {
      await renderTask.promise;
      this._convertCanvasToImage(canvas);
      this.renderingState = RenderingStates.FINISHED;
    } catch (error) {
      this.renderingState = RenderingStates.FINISHED;
      throw error;
    }
  }

  _convertCanvasToImage(canvas) {
    const reducedCanvas = this._reduceImage(canvas);
    const image = document.createElement("img");

    image.className = "thumbnailImage";
    image.setAttribute("data-loaded", true);
    image.src = reducedCanvas.toDataURL();

    this.div.appendChild(image);
  }
}
```

### Vue2 实现
目前 Vue2 实现中缩略图功能在 Vuex store 中有基础状态定义，但组件实现尚未完成：

```javascript
// store/modules/viewer.js - 缩略图状态管理
const state = {
  // 缩略图相关
  thumbnails: {},
  thumbnailSize: 120,
  thumbnailScale: 0.5,
  loadingThumbnails: new Set(),
};

const mutations = {
  SET_THUMBNAIL(state, { pageNumber, thumbnail }) {
    Vue.set(state.thumbnails, pageNumber, thumbnail);
  },

  SET_LOADING_THUMBNAIL(state, { pageNumber, loading }) {
    if (loading) {
      state.loadingThumbnails.add(pageNumber);
    } else {
      state.loadingThumbnails.delete(pageNumber);
    }
  },

  CLEAR_THUMBNAILS(state) {
    state.thumbnails = {};
    state.loadingThumbnails.clear();
  }
};

const actions = {
  async generateThumbnail({ commit, rootState }, pageNumber) {
    const { pdfDocument } = rootState.pdfReader.document;
    if (!pdfDocument) return;

    commit('SET_LOADING_THUMBNAIL', { pageNumber, loading: true });

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      const thumbnail = {
        canvas,
        dataUrl: canvas.toDataURL(),
        width: viewport.width,
        height: viewport.height
      };

      commit('SET_THUMBNAIL', { pageNumber, thumbnail });
    } catch (error) {
      console.error(`生成第 ${pageNumber} 页缩略图失败:`, error);
    } finally {
      commit('SET_LOADING_THUMBNAIL', { pageNumber, loading: false });
    }
  }
};
```

预期的缩略图组件实现：

```vue
<!-- PdfThumbnailViewer.vue -->
<template>
  <div class="pdf-thumbnail-viewer">
    <div class="thumbnail-container">
      <div
        v-for="pageNum in totalPages"
        :key="pageNum"
        class="thumbnail-item"
        :class="{ active: pageNum === currentPage }"
        @click="onThumbnailClick(pageNum)"
      >
        <div class="thumbnail-wrapper">
          <img
            v-if="thumbnails[pageNum]"
            :src="thumbnails[pageNum].dataUrl"
            :alt="`第 ${pageNum} 页`"
            class="thumbnail-image"
          />
          <div v-else-if="loadingThumbnails.has(pageNum)" class="thumbnail-loading">
            <div class="loading-spinner"></div>
          </div>
          <div v-else class="thumbnail-placeholder" @click="loadThumbnail(pageNum)">
            <span>{{ pageNum }}</span>
          </div>
        </div>
        <div class="thumbnail-label">{{ pageNum }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'PdfThumbnailViewer',

  computed: {
    ...mapState('pdfReader/document', ['totalPages']),
    ...mapState('pdfReader/viewer', ['currentPage', 'thumbnails', 'loadingThumbnails']),
  },

  mounted() {
    // 预加载当前页面和相邻页面的缩略图
    this.preloadThumbnails();
  },

  watch: {
    currentPage: {
      handler: 'preloadThumbnails',
      immediate: false
    }
  },

  methods: {
    ...mapActions('pdfReader/viewer', ['generateThumbnail']),
    ...mapActions('pdfReader/viewer', ['goToPage']),

    onThumbnailClick(pageNumber) {
      this.goToPage(pageNumber);
    },

    async loadThumbnail(pageNumber) {
      await this.generateThumbnail(pageNumber);
    },

    preloadThumbnails() {
      // 预加载当前页面前后各2页的缩略图
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      for (let i = start; i <= end; i++) {
        if (!this.thumbnails[i] && !this.loadingThumbnails.has(i)) {
          this.loadThumbnail(i);
        }
      }
    }
  }
}
</script>
```

**对比分析：**
- **官方**：使用临时 Canvas 和图像优化，内存管理更精细
- **Vue2**：基于 Vuex 状态管理，支持懒加载和预加载策略
- **优势**：Vue2 实现更灵活，支持动态加载和缓存策略
- **劣势**：Vue2 实现可能消耗更多内存，需要额外的状态管理

## 6. 事件系统对比

### 官方实践
```javascript
// event_utils.js - 事件总线实现
class EventBus {
  constructor() {
    this._listeners = Object.create(null);
  }

  on(eventName, listener, options = null) {
    this._on(eventName, listener, {
      external: true,
      once: options?.once,
      signal: options?.signal,
    });
  }

  off(eventName, listener, options = null) {
    this._off(eventName, listener);
  }

  dispatch(eventName, data, options = null) {
    const eventListeners = this._listeners[eventName];
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }

    for (const { listener, external, once } of eventListeners.slice(0)) {
      if (once) {
        this._off(eventName, listener);
      }
      listener(data);
    }
  }

  _on(eventName, listener, options = null) {
    let eventListeners = this._listeners[eventName];
    if (!eventListeners) {
      eventListeners = this._listeners[eventName] = [];
    }
    eventListeners.push({
      listener,
      external: options?.external === true,
      once: options?.once === true,
    });
  }

  _off(eventName, listener) {
    const eventListeners = this._listeners[eventName];
    if (!eventListeners) {
      return;
    }
    for (let i = 0, ii = eventListeners.length; i < ii; i++) {
      if (eventListeners[i].listener === listener) {
        eventListeners.splice(i, 1);
        return;
      }
    }
  }
}
```

### Vue2 实现
```javascript
// pdf-events.js - 事件桥接器
export class EventBridge {
  constructor(eventBus, vueComponent) {
    this.eventBus = eventBus;
    this.vueComponent = vueComponent;
    this.registeredEvents = new Map();
  }

  register() {
    // 注册 PDF.js 事件到 Vue 组件
    this.registerEvent('pagechanging', this.onPageChanging.bind(this));
    this.registerEvent('scalechanging', this.onScaleChanging.bind(this));
    this.registerEvent('pagerendered', this.onPageRendered.bind(this));
    this.registerEvent('documentloaded', this.onDocumentLoaded.bind(this));
    this.registerEvent('documenterror', this.onDocumentError.bind(this));
  }

  registerEvent(eventName, handler) {
    this.eventBus.on(eventName, handler);
    this.registeredEvents.set(eventName, handler);
  }

  unregister() {
    // 清理所有注册的事件监听器
    for (const [eventName, handler] of this.registeredEvents) {
      this.eventBus.off(eventName, handler);
    }
    this.registeredEvents.clear();
  }

  onPageChanging(event) {
    // 同步到 Vuex store
    this.vueComponent.$store.commit('pdfReader/viewer/SET_CURRENT_PAGE', event.pageNumber);

    // 触发 Vue 事件
    this.vueComponent.$emit('page-changed', {
      pageNumber: event.pageNumber,
      source: event.source || 'unknown'
    });
  }

  onScaleChanging(event) {
    // 同步到 Vuex store
    this.vueComponent.$store.commit('pdfReader/viewer/SET_SCALE', event.scale);

    // 触发 Vue 事件
    this.vueComponent.$emit('scale-changed', {
      scale: event.scale,
      source: event.source || 'unknown'
    });
  }

  onPageRendered(event) {
    // 更新渲染状态
    this.vueComponent.$store.commit('pdfReader/viewer/SET_PAGE_RENDERED', {
      pageNumber: event.pageNumber,
      rendered: true
    });

    // 触发 Vue 事件
    this.vueComponent.$emit('page-rendered', event);
  }

  onDocumentLoaded(event) {
    // 更新文档状态
    this.vueComponent.$store.commit('pdfReader/document/SET_DOCUMENT_LOADED', event);

    // 触发 Vue 事件
    this.vueComponent.$emit('document-loaded', event);
  }

  onDocumentError(event) {
    // 更新错误状态
    this.vueComponent.$store.commit('pdfReader/document/SET_ERROR', event.error);

    // 触发 Vue 事件
    this.vueComponent.$emit('document-error', event);
  }
}
```

**对比分析：**
- **官方**：纯 JavaScript 事件系统，性能最优，直接通信
- **Vue2**：事件桥接器模式，连接 PDF.js EventBus 和 Vue 组件系统
- **优势**：Vue2 实现提供了统一的状态管理和响应式更新
- **劣势**：增加了事件传递的复杂性和性能开销

## 7. 性能优化对比

### 官方实践的优化策略
1. **渲染队列管理**：`PDFRenderingQueue` 统一管理页面渲染优先级
   ```javascript
   // pdf_rendering_queue.js
   class PDFRenderingQueue {
     constructor() {
       this.pdfViewer = null;
       this.pdfThumbnailViewer = null;
       this.onIdle = null;
       this.highestPriorityPage = null;
       this.idleTimeout = null;
       this.printing = false;
       this.isThumbnailViewEnabled = false;
     }
   
     renderHighestPriority(currentlyVisiblePages) {
       if (this.idleTimeout) {
         clearTimeout(this.idleTimeout);
         this.idleTimeout = null;
       }
   
       if (this.pdfViewer.forceRendering(currentlyVisiblePages)) {
         return;
       }
       if (this.pdfThumbnailViewer && this.isThumbnailViewEnabled) {
         if (this.pdfThumbnailViewer.forceRendering()) {
           return;
         }
       }
       if (this.onIdle) {
         this.idleTimeout = setTimeout(this.onIdle.bind(this), CLEANUP_TIMEOUT);
       }
     }
   }
   ```

2. **视口裁剪**：只渲染可见区域的页面
   ```javascript
   // pdf_viewer.js
   _getVisiblePages() {
     const pageViews = this._pages;
     const firstVisiblePage = this._getFirstVisiblePage();
     const lastVisiblePage = this._getLastVisiblePage();
   
     if (firstVisiblePage.view === lastVisiblePage.view) {
       return [firstVisiblePage];
     }
   
     const visible = [];
     for (let i = firstVisiblePage.id; i <= lastVisiblePage.id; i++) {
       visible.push(pageViews[i - 1]);
     }
     return visible;
   }
   ```

3. **Canvas 复用**：`TempImageFactory` 复用临时 Canvas
   ```javascript
   // pdf_thumbnail_view.js
   class TempImageFactory {
     static #tempCanvas = null;
   
     static getCanvas(width, height) {
       const tempCanvas = (this.#tempCanvas ||= document.createElement("canvas"));
       tempCanvas.width = width;
       tempCanvas.height = height;
       return [tempCanvas, tempCanvas.getContext("2d")];
     }
   
     static destroyCanvas() {
       const tempCanvas = this.#tempCanvas;
       if (tempCanvas) {
         tempCanvas.width = 0;
         tempCanvas.height = 0;
       }
       this.#tempCanvas = null;
     }
   }
   ```

4. **内存管理**：及时清理不需要的页面资源
5. **懒加载**：按需加载页面内容和缩略图

### Vue2 实现的优化策略
1. **服务层缓存**：在 `PdfServices` 中缓存常用对象
   ```javascript
   // pdf-services.js
   export class PdfServices {
     constructor(vueComponent, options = {}) {
       this.vueComponent = vueComponent;
       this.options = options;
   
       // 缓存常用对象
       this.pageCache = new Map();
       this.viewportCache = new Map();
       this.renderTaskCache = new Map();
     }
   
     async getPage(pageNumber) {
       if (this.pageCache.has(pageNumber)) {
         return this.pageCache.get(pageNumber);
       }
   
       const page = await this.application.pdfDocument.getPage(pageNumber);
       this.pageCache.set(pageNumber, page);
       return page;
     }
   
     getViewport(pageNumber, scale) {
       const cacheKey = `${pageNumber}-${scale}`;
       if (this.viewportCache.has(cacheKey)) {
         return this.viewportCache.get(cacheKey);
       }
   
       const page = this.pageCache.get(pageNumber);
       if (page) {
         const viewport = page.getViewport({ scale });
         this.viewportCache.set(cacheKey, viewport);
         return viewport;
       }
       return null;
     }
   }
   ```

2. **Vuex 状态优化**：避免不必要的状态更新
   ```javascript
   // store/modules/viewer.js
   const mutations = {
     SET_CURRENT_PAGE(state, pageNumber) {
       // 避免相同值的重复更新
       if (state.currentPage !== pageNumber) {
         state.currentPage = pageNumber;
       }
     },
   
     SET_SCALE(state, scale) {
       // 使用精度控制避免浮点数问题
       const roundedScale = Math.round(scale * 100) / 100;
       if (state.scale !== roundedScale) {
         state.scale = roundedScale;
       }
     }
   };
   ```

3. **组件懒加载**：按需加载 PDF 相关组件
4. **事件防抖**：在事件桥接器中实现防抖机制
5. **移动端优化**：针对移动设备的特殊配置

## 8. 最佳实践建议

### 基于官方实践的改进建议

1. **渲染队列集成**
   - 在 Vue2 实现中集成官方的 `PDFRenderingQueue`
   - 优化页面渲染的优先级管理
   ```javascript
   // 建议在 PdfServices 中集成渲染队列
   export class PdfServices {
     async initialize() {
       // 创建渲染队列
       const pdfjsViewer = await import('pdfjs-dist/legacy/web/pdf_viewer.mjs');
       this.renderingQueue = new pdfjsViewer.PDFRenderingQueue();
       this.renderingQueue.setViewer(this.pdfViewer);
     }
   }
   ```

2. **内存管理优化**
   - 学习官方的 Canvas 复用策略
   - 实现更精细的资源清理机制
   ```javascript
   // 建议实现类似的临时资源管理
   class VueCanvasFactory {
     static tempCanvas = null;
   
     static getCanvas(width, height) {
       if (!this.tempCanvas) {
         this.tempCanvas = document.createElement('canvas');
       }
       this.tempCanvas.width = width;
       this.tempCanvas.height = height;
       return this.tempCanvas;
     }
   
     static cleanup() {
       if (this.tempCanvas) {
         this.tempCanvas.width = 0;
         this.tempCanvas.height = 0;
         this.tempCanvas = null;
       }
     }
   }
   ```

3. **事件系统简化**
   - 减少不必要的事件桥接
   - 直接使用 PDF.js EventBus 处理核心功能
   ```javascript
   // 建议简化事件桥接，只处理必要的状态同步
   export class EventBridge {
     register() {
       // 只桥接需要同步到 Vuex 的关键事件
       this.registerEvent('pagechanging', this.syncPageState.bind(this));
       this.registerEvent('scalechanging', this.syncScaleState.bind(this));
       // 其他事件直接在组件中监听
     }
   }
   ```

4. **组件架构优化**
   - 参考官方的模块化设计
   - 将复杂组件拆分为更小的功能单元
   ```vue
   <!-- 建议拆分为更细粒度的组件 -->
   <template>
     <div class="pdf-viewer">
       <pdf-toolbar />
       <div class="pdf-content">
         <pdf-sidebar>
           <pdf-outline-panel />
           <pdf-thumbnail-panel />
           <pdf-attachment-panel />
         </pdf-sidebar>
         <pdf-main-view>
           <pdf-page-container
             v-for="page in visiblePages"
             :key="page.id"
             :page="page"
           />
         </pdf-main-view>
       </div>
     </div>
   </template>
   ```

### Vue2 实现的优势保持

1. **响应式状态管理**
   - 保持 Vuex 的集中状态管理优势
   - 利用 Vue 的响应式系统简化 UI 更新
   ```javascript
   // 保持清晰的状态管理结构
   const store = {
     modules: {
       pdfReader: {
         namespaced: true,
         modules: {
           document: documentModule,  // 文档相关状态
           viewer: viewerModule,      // 查看器状态
           ui: uiModule              // UI 状态
         }
       }
     }
   };
   ```

2. **组件化架构**
   - 保持 Vue 组件的可复用性
   - 利用 Vue 的生命周期管理资源
   ```vue
   <script>
   export default {
     mounted() {
       this.initializePdfServices();
     },
   
     beforeDestroy() {
       this.cleanupResources();
     },
   
     methods: {
       cleanupResources() {
         // 利用 Vue 生命周期自动清理资源
         if (this.pdfServices) {
           this.pdfServices.cleanup();
         }
       }
     }
   }
   </script>
   ```

3. **开发体验**
   - 保持 Vue 的开发工具支持
   - 利用 Vue 的调试和热重载功能

## 9. 总结

官方 PDF.js web 实现和我们的 Vue2 实现各有优势：

### 官方实践优势：
- **性能最优**：直接使用原生 API，无额外抽象层开销
- **内存管理精细**：资源利用率高，适合大文档处理
- **架构成熟**：经过大量实际应用验证，稳定性高
- **功能完整**：支持所有 PDF.js 特性，包括高级功能

### Vue2 实现优势：
- **开发效率高**：代码可维护性好，开发体验佳
- **状态管理清晰**：响应式更新自动，状态同步简单
- **组件化架构**：易于扩展和定制，模块复用性强
- **生态系统集成**：与现有 Vue 项目无缝集成

### 建议的改进方向：

1. **性能优化**
   - 在保持 Vue2 架构优势的基础上，学习官方的性能优化策略
   - 集成官方的渲染队列和内存管理机制
   - 优化事件系统，减少不必要的抽象层

2. **功能完善**
   - 逐步完善目录、缩略图等功能的实现
   - 参考官方实现添加搜索、注释等高级功能
   - 完善移动端适配和响应式设计

3. **架构优化**
   - 优化服务层设计，减少状态同步开销
   - 改进组件拆分，提高代码复用性
   - 加强错误处理和边界情况处理

4. **最佳实践融合**
   - 将官方的最佳实践融入 Vue2 实现
   - 保持 Vue 生态系统的优势
   - 建立完善的测试和文档体系

### 结论

Vue2 实现在开发效率和可维护性方面具有明显优势，适合快速开发和定制化需求。通过学习官方实践的性能优化策略，可以在保持 Vue2 架构优势的同时，显著提升性能表现。

建议在后续开发中：
- 保持 Vue2 的组件化和状态管理优势
- 逐步集成官方的性能优化策略
- 完善功能实现，提升用户体验
- 建立完善的测试和文档体系

这样可以打造一个既具有优秀性能，又具有良好开发体验的 PDF 阅读器解决方案。

## 附录：关键文件对照表

| 功能模块 | 官方实现 | Vue2 实现 | 说明 |
|---------|---------|-----------|------|
| 主应用 | `app.js` | `PdfViewer.vue` | 应用入口和协调器 |
| PDF 查看器 | `pdf_viewer.js` | `PdfViewerCore.vue` | 核心查看功能 |
| 页面视图 | `pdf_page_view.js` | `PdfPageContainer.vue` | 单页渲染 |
| 链接服务 | `pdf_link_service.js` | `pdf-services.js` | 跳转和导航 |
| 目录查看器 | `pdf_outline_viewer.js` | 待实现 | 文档目录 |
| 缩略图查看器 | `pdf_thumbnail_viewer.js` | 待实现 | 页面缩略图 |
| 事件总线 | `event_utils.js` | `pdf-events.js` | 事件通信 |
| 渲染队列 | `pdf_rendering_queue.js` | 待集成 | 渲染优化 |
| 状态管理 | 分散在各组件 | Vuex store | 集中状态管理 |

通过这个对比分析，我们可以更好地理解两种实现方式的差异，并制定合适的改进策略。
