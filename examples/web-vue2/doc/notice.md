# PDF.js Vue 2 迁移指南

## 1. 概述

### 迁移目标
基于 PDF.js 4.4.168 版本，在 Vue 2 + Vant 2 + Vuex 3 技术栈下，构建一个专注于移动端的 PDF 阅读器组件。组件设计为高内聚、低耦合，可直接复制到其他项目中独立使用。

### 核心特性
- **零配置 PDF.js 导入**：使用 `pdfjs-dist/webpack.mjs` 避免 Worker 配置问题
- **组件化架构**：基于 PDF.js 组件系统设计，模块化可复用
- **Vue 2 深度集成**：完整的状态管理、事件系统、生命周期管理
- **Vant@2 可选集成**：项目已全局引入 Vant@2，可在合适场景选择性使用
- **高可复用性**：最小化依赖，插件化设计，完整示例

## 2. 核心架构决策

### PDF.js 集成方式
```javascript
// ✅ 推荐：零配置导入
import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';

// ❌ 避免：手动配置 Worker
// import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';
```

**优势**：
- 自动处理 Worker 路径，减少配置错误
- 避免 "Setting up fake worker" 警告
- 符合官方推荐的最佳实践

### Vue 2 组件架构设计

基于 PDF.js 组件系统和官方示例的最佳实践，采用分层架构和组件化设计：

#### 项目结构与组件层级

```
pdf-reader/                                    # PDF阅读器根目录
│
├── 📁 core/                                  # 🔧 核心层 - PDF.js封装
│   ├── pdf-application.js                   # 应用级控制器（类似PDFViewerApplication）
│   ├── pdf-services.js                      # 服务层封装（EventBus、LinkService等）
│   ├── pdf-config.js                        # 配置管理（移动端优化等）
│   └── pdf-events.js                        # 事件定义和处理
│
├── 📁 components/                            # 🎨 组件层 - Vue组件
│   │
│   ├── PdfViewer.vue                        # 🏠 主容器组件
│   │   │
│   │   ├── 📁 viewer/                       # 查看器相关组件
│   │   │   ├── PdfViewerCore.vue           # 核心查看器组件
│   │   │   ├── PdfPageContainer.vue        # 页面容器组件
│   │   │   └── PdfLoadingProgress.vue      # 加载进度组件
│   │   │
│   │   ├── 📁 toolbar/                      # 工具栏组件
│   │   │   ├── PdfTopToolbar.vue           # 顶部工具栏
│   │   │   ├── PdfBottomToolbar.vue        # 底部工具栏
│   │   │   │   ├── PdfNavigation.vue       # 导航控制
│   │   │   │   ├── PdfZoomControl.vue      # 缩放控制
│   │   │   │   └── PdfPageInput.vue        # 页码输入
│   │   │   └── PdfToolbarButton.vue        # 工具栏按钮组件
│   │   │
│   │   ├── 📁 sidebar/                      # 侧边栏组件
│   │   │   └── PdfSidebar.vue              # 侧边栏容器（可放置任意功能组件）
│   │   │
│   │   ├── 📁 features/                     # 功能组件（可独立使用）
│   │   │   ├── PdfThumbnail.vue            # 缩略图组件
│   │   │   ├── PdfOutline.vue              # 目录组件
│   │   │   ├── PdfBookmarks.vue            # 书签组件
│   │   │   └── PdfSearch.vue               # 搜索组件
│   │   │
│   │   └── 📁 dialogs/                      # 对话框组件
│   │       ├── PdfPasswordDialog.vue       # 密码输入对话框
│   │       ├── PdfErrorDialog.vue          # 错误提示对话框
│   │       └── PdfSearchDialog.vue         # 搜索对话框
│   │
│   └── 📁 shared/                           # 共享组件
│       ├── PdfButton.vue                   # 通用按钮组件
│       ├── PdfIcon.vue                     # 图标组件
│       └── PdfTooltip.vue                  # 提示组件
│
├── 📁 store/                                # 📊 状态管理
│   ├── index.js                            # Vuex模块入口
│   ├── modules/                            # 模块化状态
│   │   ├── document.js                     # 文档状态
│   │   ├── viewer.js                       # 查看器状态
│   │   ├── navigation.js                   # 导航状态
│   │   └── ui.js                           # UI状态
│   └── helpers.js                          # 状态辅助函数
│
├── 📁 mixins/                               # 🔄 混入
│   ├── pdf-component.js                    # PDF组件通用混入
│   ├── mobile-gestures.js                  # 移动端手势混入
│   └── keyboard-shortcuts.js               # 键盘快捷键混入
│
├── 📁 styles/                               # 🎨 样式（仅必要时使用）
│   ├── variables.less                      # 全局样式变量
│   ├── mixins.less                         # 样式混入
│   └── global.less                         # 全局样式（最小化）
│
├── 📁 utils/                                # 🛠️ 工具函数
│   ├── pdf-utils.js                        # PDF相关工具
│   ├── dom-utils.js                        # DOM操作工具
│   └── error-handler.js                    # 错误处理
│
├── 📁 constants/                            # 📋 常量定义
│   ├── events.js                           # 事件常量
│   └── config.js                           # 配置常量
│
└── index.js                                # 📦 组件库入口
```

#### 组件层级关系图

```
PdfViewer (主容器) 🏠
├── PdfApplication (应用控制器) 🔧
│   ├── EventBus (事件总线)
│   ├── LinkService (链接服务)
│   └── FindController (搜索控制)
├── PdfViewerCore (核心查看器) 📖
│   ├── PdfPageContainer (页面容器)
│   └── PdfLoadingProgress (加载进度)
├── PdfTopToolbar (顶部工具栏) ⬆️
├── PdfBottomToolbar (底部工具栏) ⬇️
│   ├── PdfNavigation (导航控制)
│   │   └── PdfPageInput (页码输入)
│   └── PdfZoomControl (缩放控制)
├── PdfSidebar (侧边栏容器) 📋
│   └── [可放置任意功能组件]
├── Features (独立功能组件) ⚡
│   ├── PdfThumbnail (缩略图) - 可放置在任意位置
│   ├── PdfOutline (目录) - 可放置在任意位置
│   ├── PdfBookmarks (书签) - 可放置在任意位置
│   └── PdfSearch (搜索) - 可放置在任意位置
└── Dialogs (对话框层) 💬
    ├── PdfPasswordDialog (密码对话框)
    ├── PdfErrorDialog (错误对话框)
    └── PdfSearchDialog (搜索对话框)
```

#### 架构设计原则

**🏗️ 分层架构**：
- **Core层**：封装PDF.js原生API，提供Vue友好的接口
- **Components层**：Vue组件，专注UI和交互
- **Store层**：状态管理，遵循单一数据源原则
- **Utils层**：工具函数，提供通用功能

**🎯 组件职责分离**：
- **容器组件**：负责数据和状态管理（PdfViewer、PdfSidebar）
- **展示组件**：负责UI渲染和用户交互（PdfToolbarButton、PdfIcon）
- **功能组件**：独立的功能实现，可灵活放置（PdfThumbnail、PdfOutline、PdfBookmarks、PdfSearch）
- **控制组件**：负责特定操作控制（PdfNavigation、PdfZoomControl）

**📱 移动端优先**：

- 专门的移动端配置和工具
- 手势支持和触摸优化
- 响应式设计考虑

**🔄 组件通信模式**：
- **父子组件**：Props down, Events up
- **跨组件通信**：Vuex状态管理 + EventBus事件总线
- **PDF.js集成**：通过Core层封装，EventBus桥接原生事件

### 状态管理设计
```javascript
// store/pdf-viewer.js - 使用命名空间模块
const pdfViewerModule = {
  namespaced: true,
  state: {
    pdfDocument: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    loading: false,
    showSidebar: false,
    sidebarMode: 'thumbs',
    outline: null
  }
  // ... mutations, actions, getters
};

// 导出命名空间辅助函数
export const {
  mapState: mapPdfState,
  mapGetters: mapPdfGetters,
  mapMutations: mapPdfMutations,
  mapActions: mapPdfActions
} = createNamespacedHelpers('pdfViewer');
```

## 3. 迁移经验总结

### 成功实践

#### 1. 官方组件引入策略与取舍原则

**核心原则：功能内聚性 > UI灵活性 > 维护成本**

**✅ 推荐引入的官方组件**：
```javascript
// 功能内聚且与UI无关的核心组件
import {
  EventBus,           // 事件总线 - 纯逻辑，无UI依赖
  PDFLinkService,     // 链接服务 - 导航逻辑，UI可自定义
  PDFFindController,  // 搜索控制器 - 搜索逻辑，UI完全分离
  PDFHistory,         // 历史记录 - 纯数据管理
  GenericL10n         // 国际化 - 平台无关的本地化
} from 'pdfjs-dist/legacy/web/pdf_viewer';
```

**❌ 不推荐引入的官方组件**：
```javascript
// UI固化且难以自定义的组件
// PDFViewer          - 8000+行代码，UI高度耦合
// PDFThumbnailViewer - UI固化，难以适配移动端
// PDFOutlineViewer   - 样式固定，无法自定义交互
// PDFSidebar         - 布局固化，不适合移动端设计
```

**取舍决策矩阵**：

| 组件类型 | 功能内聚性 | UI耦合度 | 自定义需求 | 决策 | 理由 |
|---------|-----------|----------|-----------|------|------|
| **EventBus** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ✅ 引入 | 纯逻辑，无UI依赖 |
| **PDFLinkService** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ✅ 引入 | 导航逻辑内聚，UI可分离 |
| **PDFFindController** | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ✅ 引入 | 搜索逻辑复杂，UI完全自定义 |
| **PDFViewer** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ 自实现 | UI高度耦合，移动端需求大 |
| **PDFThumbnailViewer** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ 自实现 | UI固化，移动端适配困难 |
| **PDFOutlineViewer** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ 自实现 | 交互固定，自定义需求高 |

**自实现策略**：
```javascript
// 数据获取与UI渲染分离
class PdfDataService {
  // 只负责数据获取，不涉及UI
  async getThumbnailData(pageNumber, options = {}) {
    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: options.scale || 0.2 });
    // 返回渲染数据，UI层自行处理
    return { page, viewport, canvas: this.createCanvas(viewport) };
  }

  async getOutlineData() {
    const outline = await this.pdfDocument.getOutline();
    // 返回结构化数据，包含页码映射
    return this.processOutlineData(outline);
  }
}

// Vue组件专注UI和交互
// PdfThumbnail.vue - 完全自定义的缩略图UI
// PdfOutline.vue - 适配移动端的目录交互
```

**经验总结**：

1. **优先考虑功能内聚性**：
   - 功能边界清晰、职责单一的组件优先引入
   - 避免引入功能杂糅、职责不清的大型组件

2. **评估UI耦合程度**：
   - UI逻辑与业务逻辑分离良好的组件可以引入
   - UI高度耦合的组件建议自实现

3. **考虑自定义扩展需求**：
   - 移动端UI需要大量自定义的组件不建议引入
   - 标准桌面端UI可以接受的组件可以考虑引入

4. **维护成本权衡**：
   - 复杂逻辑（如搜索算法）优先使用官方实现
   - 简单UI逻辑优先自实现，便于维护和扩展

#### 2. 工具栏布局重新设计
```
修改前：单一工具栏在顶部
修改后：
┌─────────────────────┐
│   顶部工具栏 (搜索)    │
├─────────────────────┤
│   PDF 内容区域       │
├─────────────────────┤
│   底部工具栏 (功能)    │
└─────────────────────┘
```

**功能分配**：
- **顶部**：搜索等扩展功能（占位设计）
- **底部**：缩略图、目录、导航、缩放等核心功能

#### 3. Vue 2 样式设计策略

**核心原则：组件内样式优先，必要时才抽取**

```vue
<!-- ✅ 推荐：组件内样式 -->
<template>
  <div class="pdf-viewer">
    <div class="pdf-viewer__toolbar">...</div>
    <div class="pdf-viewer__content">...</div>
  </div>
</template>

<style lang="less" scoped>
.pdf-viewer {
  width: 100%;
  height: 100%;

  &__toolbar {
    height: 48px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
  }

  &__content {
    flex: 1;
    overflow: hidden;
  }
}
</style>
```

**样式抽取原则**：
- **全局变量**：颜色、尺寸等设计令牌才抽取到 `variables.less`
- **复用混入**：多个组件共用的样式逻辑抽取到 `mixins.less`
- **重置样式**：PDF 查看器特有的全局重置样式抽取到 `global.less`
- **组件样式**：优先使用 Vue 单文件组件的 `<style scoped>`

**抽取示例**：
```less
// styles/variables.less - 仅设计令牌
@primary-color: #1890ff;
@border-color: #e8e8e8;
@toolbar-height: 48px;
@sidebar-width: 280px;

// styles/mixins.less - 复用逻辑
.flex-center() {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-touch() {
  min-height: 44px;
  min-width: 44px;
}
```

#### 4. 数据与UI分离的自实现策略
```javascript
// 核心原则：数据获取与UI渲染完全分离

// 数据层 - 只负责PDF.js API调用
class PdfDataService {
  async getThumbnailData(pageNumber, options = {}) {
    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: options.scale || 0.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    return {
      canvas,
      width: viewport.width,
      height: viewport.height,
      pageNumber
    };
  }

  async getOutlineData() {
    const outline = await this.pdfDocument.getOutline();
    return this.processOutlineWithPageNumbers(outline);
  }
}

// UI层 - Vue组件专注展示和交互
// PdfThumbnail.vue - 自定义缩略图UI，支持移动端手势
// PdfOutline.vue - 自定义目录交互，适配移动端导航
```

**自实现优势**：
- **完全的UI控制权**：样式、布局、交互完全可定制
- **灵活的组件放置**：功能组件可以放置在任意位置，不受固定布局限制
- **移动端优化**：针对触摸操作和小屏幕优化
- **性能可控**：可以根据需求调整渲染质量和缓存策略
- **扩展性强**：易于添加自定义功能（如手势、动画等）

### 关键决策

#### 1. 官方组件引入决策原则
- **功能内聚性优先**：选择职责单一、边界清晰的组件
- **UI耦合度评估**：避免UI高度耦合的组件，优选逻辑组件
- **自定义需求权衡**：移动端UI需求高的组件建议自实现
- **维护成本考虑**：复杂算法逻辑优先使用官方实现

#### 2. 开发流程管理
- **MVP功能聚焦**：优先实现核心功能，扩展功能分阶段开发
- **移动端优先**：设计和开发过程中优先考虑移动端体验
- **迭代式优化**：通过实际使用反馈持续优化组件设计

### 性能优化

1. **内存管理**：
   - Canvas 1M像素限制
   - 图像大小限制
   - CSS缩放模式

2. **渲染优化**：
   - 简化文本层配置
   - 禁用非必要功能
   - 移动端手势优化

## 4. 重要注意事项

### 关键注意事项

**技术集成**：
- ❌ 不要手动配置 `GlobalWorkerOptions.workerSrc`，使用零配置导入
- ❌ 不要使用错误的 `mapActions` 语法：`'action as alias'`

**组件选择**：
- ❌ 不要盲目依赖UI固化的官方组件（PDFViewer、PDFThumbnailViewer等）
- ✅ 优先选择功能内聚、UI分离的组件（EventBus、PDFLinkService等）

**开发流程**：
- ❌ 不要在MVP阶段实现扩展样式功能
- ❌ 不要在组件data中重复定义Vuex状态

### 核心规范

#### Vuex 状态管理
```javascript
// ✅ 正确：使用命名空间辅助函数
import { mapPdfState, mapPdfActions } from '../store/pdf-viewer.js';
computed: {
  ...mapPdfState(['currentPage', 'totalPages']),
  ...mapPdfGetters(['scalePercent'])
},
methods: {
  ...mapPdfActions({
    loadDocumentAction: 'loadDocument'  // 正确的重命名方式
  })
}

// ❌ 错误：重复定义状态或错误语法
data() { return { currentPage: 1 } },  // 与Vuex重复
...mapActions(['loadDocument as loadDocumentAction'])  // 错误语法
```

#### 组件设计规范
- **高内聚低耦合**：组件职责单一，依赖关系清晰
- **数据与UI分离**：业务逻辑与展示逻辑分离
- **移动端优先**：针对触摸操作和小屏幕优化
- **可扩展设计**：为自定义功能预留架构空间

#### 样式开发规范
- **组件内优先**：优先使用 Vue 单文件组件的 `<style scoped>`
- **按需抽取**：只有真正需要复用或全局的样式才抽取到 `.less` 文件
- **BEM命名**：组件内使用 BEM 命名规范，如 `.pdf-viewer__toolbar`
- **变量使用**：全局设计令牌使用 Less 变量，组件特有样式直接写值
- **移动端适配**：触摸目标最小 44px，考虑手指操作便利性

## 5. 组件使用指南

### 安装和配置

#### 1. 依赖说明
```bash
# 核心依赖（项目已配置）
npm install pdfjs-dist@4.4.168 vant@2 vuex@3

# 开发依赖
npm install less less-loader
```

#### 2. Vant@2 集成状态
```javascript
// main.js - 项目中已配置
import Vue from 'vue';
import Vuex from 'vuex';
import Vant from 'vant';
import 'vant/lib/index.css';

// 引入 PDF 查看器组件
import PdfViewer from './webToVue2/vue2';

Vue.use(Vuex);
Vue.use(Vant);

// 创建 Vuex store
const store = new Vuex.Store({
  modules: {
    // PDF 查看器模块会动态注册
  }
});

// 安装 PDF 查看器插件
Vue.use(PdfViewer, { store });

new Vue({
  store,
  render: h => h(App)
}).$mount('#app');
```

### Vant@2 使用原则

#### 核心原则
- **可选使用**：不强制使用 Vant 组件，根据实际需求选择
- **功能优先**：优先保证 PDF 核心功能，UI 组件作为增强
- **场景适配**：在合适的场景下使用 Vant 组件提升体验

#### 推荐使用场景
```javascript
// ✅ 推荐：标准交互组件
<van-dialog v-model="showPasswordDialog">
  <van-field v-model="password" type="password" placeholder="请输入密码" />
</van-dialog>

// ✅ 推荐：操作反馈
this.$toast.success('PDF 加载成功');

// ✅ 推荐：列表展示
<van-list>
  <van-cell v-for="item in outline" :key="item.id" :title="item.title" />
</van-list>

// 🟡 可选：根据设计需求决定
<van-nav-bar title="PDF 阅读器" left-arrow @click-left="goBack" />
```

#### 不推荐场景
```javascript
// ❌ 避免：核心 PDF 渲染逻辑
// 不要用 Vant 组件替换 PDF 核心渲染功能

// ❌ 避免：过度依赖
// 不要为了使用而使用，保持组件的独立性
```

### 基本使用方法

#### 1. 基础用法
```vue
<template>
  <div class="app">
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
    return {
      pdfUrl: '/assets/sample.pdf'
    };
  },

  methods: {
    onDocumentLoaded(event) {
      this.$toast.success(`PDF 加载完成，共 ${event.numPages} 页`);
    },

    onLoadError(error) {
      this.$toast.fail('PDF 加载失败');
      console.error('PDF 加载错误:', error);
    },

    onPageChanged(event) {
      console.log('当前页码:', event.pageNumber);
    }
  }
};
</script>

<style lang="less" scoped>
.app {
  height: 100vh;
  overflow: hidden;

  // 使用全局变量（如果需要）
  // background: @background-color;
}
</style>
```

#### 2. 功能组件灵活使用
```vue
<template>
  <div class="app">
    <!-- 主PDF查看器 -->
    <pdf-viewer :src="pdfUrl" />

    <!-- 功能组件可以放置在任意位置 -->
    <div class="custom-layout">
      <!-- 顶部放置缩略图 -->
      <pdf-thumbnail
        v-if="showThumbnails"
        :pdf-document="pdfDocument"
        @thumbnail-click="goToPage"
        class="top-thumbnails"
      />

      <!-- 左侧放置目录 -->
      <pdf-outline
        v-if="showOutline"
        :pdf-document="pdfDocument"
        @outline-click="goToPage"
        class="left-outline"
      />

      <!-- 右侧放置书签 -->
      <pdf-bookmarks
        v-if="showBookmarks"
        :bookmarks="userBookmarks"
        @bookmark-click="goToPage"
        class="right-bookmarks"
      />

      <!-- 底部放置搜索 -->
      <pdf-search
        v-if="showSearch"
        :pdf-document="pdfDocument"
        @search-result="highlightResult"
        class="bottom-search"
      />
    </div>
  </div>
</template>

<style lang="less" scoped>
.custom-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.top-thumbnails {
  height: 120px;
  overflow-x: auto;
  border-bottom: 1px solid #e8e8e8;
}

.left-outline {
  position: fixed;
  left: 0;
  top: 120px;
  width: 280px;
  height: calc(100% - 200px);
  background: #fff;
  border-right: 1px solid #e8e8e8;
}

.right-bookmarks {
  position: fixed;
  right: 0;
  top: 120px;
  width: 280px;
  height: calc(100% - 200px);
  background: #fff;
  border-left: 1px solid #e8e8e8;
}

.bottom-search {
  height: 80px;
  border-top: 1px solid #e8e8e8;
  background: #f5f5f5;
}
</style>
```

#### 3. 高级配置
```vue
<template>
  <pdf-viewer
    :src="pdfUrl"
    :show-toolbar="true"
    :max-canvas-pixels="0"
    :text-layer-mode="1"
    :initial-page="5"
    :enable-gestures="true"
    @document-loaded="onDocumentLoaded"
    @page-changed="onPageChanged"
    @scale-changed="onScaleChanged"
    @load-progress="onLoadProgress"
    @password-required="onPasswordRequired"
  />
</template>
```

### API 参考

#### Props
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| src | String | - | PDF 文件路径（必需） |
| showToolbar | Boolean | true | 显示工具栏 |
| maxCanvasPixels | Number | 0 | Canvas 最大像素数，0 表示使用 CSS 缩放 |
| textLayerMode | Number | 1 | 文本层模式：0=禁用，1=启用，2=增强 |
| initialPage | Number | 1 | 初始页码 |
| enableGestures | Boolean | true | 启用手势支持 |

#### Events
| 事件名 | 参数 | 说明 |
|--------|------|------|
| document-loaded | { numPages, info } | 文档加载完成 |
| page-changed | { pageNumber, previous } | 页面切换 |
| scale-changed | { scale, previous } | 缩放变化 |
| load-progress | { loaded, total } | 加载进度 |
| load-error | error | 加载错误 |
| password-required | - | 需要密码 |

#### Methods
| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| loadDocument | src: String | Promise | 加载 PDF 文档 |
| goToPage | pageNumber: Number | - | 跳转到指定页面 |
| nextPage | - | - | 下一页 |
| prevPage | - | - | 上一页 |
| setScale | scale: Number | - | 设置缩放比例 |
| zoomIn | - | - | 放大 |
| zoomOut | - | - | 缩小 |
| toggleSidebar | mode?: String | - | 切换侧边栏 |

#### 使用 Vuex 状态
```javascript
import { mapPdfState, mapPdfGetters, mapPdfActions } from './webToVue2/vue2/store/pdf-viewer.js';

export default {
  computed: {
    ...mapPdfState(['currentPage', 'totalPages', 'scale', 'loading']),
    ...mapPdfGetters(['isDocumentLoaded', 'canGoNext', 'canGoPrev', 'scalePercent'])
  },

  methods: {
    ...mapPdfActions(['loadDocument', 'goToPage', 'nextPage', 'prevPage', 'setScale'])
  }
};
```

## 6. 后续扩展方向

### 功能扩展计划

#### 1. 搜索功能增强
- 全文搜索和高亮显示
- 搜索结果导航
- 搜索选项配置（大小写、整词匹配）

#### 2. 移动端优化增强
- 完善双指缩放手势
- 响应式侧边栏布局
- 完整的进度监听和错误处理
- 低端设备性能优化

#### 3. 注释系统
- 高亮注释、文本注释
- 手绘注释（移动端）
- 注释数据的保存和加载

#### 4. 高级功能
- 打印功能
- 文档对比和合并
- 数字签名验证
- 表单填写和提交

### 优化建议

#### 1. 性能优化
- 虚拟滚动，优化大文档性能
- 页面预渲染和缓存策略
- 基于 PDFRenderingQueue 的渲染优化

#### 2. 用户体验
- 无障碍功能支持
- 键盘导航
- 高对比度模式

#### 3. 样式系统扩展
- **主题系统**：基于 CSS 变量的主题切换（暗色主题等）
- **响应式设计**：从移动端优先扩展到桌面端适配
- **组件库集成**：与现有 UI 组件库（如 Element UI）的样式统一
- **样式抽取优化**：根据实际使用情况，合理抽取复用样式

#### 4. 国际化
- 多语言界面
- RTL 语言支持
- 本地化日期和数字格式

## 总结

本指南提供了基于 PDF.js 4.4.168 的 Vue 2 移动端 PDF 阅读器组件的完整迁移方案，涵盖了架构设计、组件选择、开发规范和扩展规划。

**核心价值**：
- 明确的官方组件引入策略和取舍原则
- 经过验证的分层架构和组件设计模式
- 完整的开发规范和最佳实践指导
- 面向未来的可扩展架构设计

按照本指南进行迁移，可以构建出高质量、可维护、易扩展的 PDF 阅读器组件。