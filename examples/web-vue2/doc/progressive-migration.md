# PDF.js Vue 2 渐进式迁移指南

## 迁移概述

本文档将 PDF.js Vue 2 迁移过程分解为 6 个渐进式阶段，每个阶段都有明确的目标、任务清单和验收标准，便于逐步执行和验证。

### 项目结构说明
- **实现目录**：`examples/web-vue2/src/components/pdf-reader/`
- **PDF.js 库**：`pdfjs-dist/`（本地完整版本 4.4.168）
- **相对路径**：从 pdf-reader 到 pdfjs-dist 的路径为 `../../../../../pdfjs-dist/`

### 迁移策略
- **渐进式开发**：每个阶段都能产出可运行的版本
- **风险控制**：每个阶段完成后进行验证，确保稳定性
- **功能优先级**：优先实现核心功能，后续扩展高级功能
- **本地库优势**：使用本地 PDF.js 库，避免网络依赖和版本冲突
- **Vant@2 可选集成**：在合适的场景下使用 Vant@2 组件，提升开发效率和用户体验

## 阶段 1：环境搭建与基础架构 🏗️

### 目标
建立项目基础架构，完成 PDF.js 的零配置集成，搭建基本的 Vue 2 项目结构。

### 任务清单

#### 1.1 项目初始化
- [ ] 在现有 Vue 2 项目中使用 PDF 组件目录：`examples/web-vue2/src/components/pdf-reader/`
- [ ] 使用本地 PDF.js 库：`pdfjs-dist/` 目录（已包含完整的 PDF.js 4.4.168）
- [ ] 安装其他依赖
  ```bash
  npm install vant@2 vuex@3
  npm install less less-loader --save-dev
  ```
- [ ] 确认 Vant@2 组件库已全局引入（项目中已配置）
  ```javascript
  // main.js - 已配置
  import Vant from 'vant';
  import 'vant/lib/index.css';
  Vue.use(Vant);
  ```

#### 1.2 目录结构搭建
- [ ] 在 `examples/web-vue2/src/components/pdf-reader/` 中创建基础目录结构
  ```
  pdf-reader/                    # examples/web-vue2/src/components/pdf-reader/
  ├── core/                     # PDF.js 封装层
  ├── components/               # Vue 组件
  ├── store/                    # Vuex 状态管理
  ├── styles/                   # 样式文件
  ├── utils/                    # 工具函数
  ├── constants/                # 常量定义
  └── index.js                  # 组件入口
  ```

#### 1.3 PDF.js 零配置集成
- [ ] 创建 `core/pdf-config.js` - 基础配置
- [ ] 创建 `core/pdf-services.js` - 服务层封装
- [ ] 使用本地 PDF.js 库：`import * as pdfjsLib from '../../../../../pdfjs-dist/webpack.mjs'`
- [ ] 验证 PDF.js 能正常加载（无 Worker 警告）

#### 1.4 基础组件框架
- [ ] 创建 `components/PdfViewer.vue` - 主容器组件（基础框架）
- [ ] 创建 `index.js` - 组件入口文件
- [ ] 实现 Vue.use() 插件安装方式

### 验收标准
- [ ] 项目能正常启动，无依赖错误
- [ ] PDF.js 能正常导入，控制台无 Worker 相关警告
- [ ] 基础组件能正常注册和使用
- [ ] 能加载一个简单的 PDF 文件（即使没有 UI）



## 阶段 2：核心查看器实现 📖

### 目标
实现 PDF 文档的基本加载、显示和页面导航功能。

### 任务清单

#### 2.1 核心服务层
- [ ] 完善 `core/pdf-application.js` - 应用控制器
- [ ] 实现 `core/pdf-events.js` - 事件定义和处理
- [ ] 集成官方推荐组件：EventBus、PDFLinkService

#### 2.2 基础查看器组件
- [ ] 实现 `components/viewer/PdfViewerCore.vue` - 核心查看器
- [ ] 实现 `components/viewer/PdfPageContainer.vue` - 页面容器
- [ ] 实现 `components/viewer/PdfLoadingProgress.vue` - 加载进度

#### 2.3 状态管理基础
- [ ] 创建 `store/modules/document.js` - 文档状态
- [ ] 创建 `store/modules/viewer.js` - 查看器状态
- [ ] 实现命名空间辅助函数导出

#### 2.4 基本功能实现
- [ ] PDF 文档加载和渲染
- [ ] 基础页面导航（上一页、下一页）
- [ ] 简单的缩放控制
- [ ] 错误处理和加载状态

### 验收标准
- [ ] 能成功加载和显示 PDF 文档
- [ ] 页面导航功能正常（前进、后退）
- [ ] 基础缩放功能正常
- [ ] 加载状态和错误处理正常
- [ ] Vuex 状态管理正常工作

## 阶段 3：工具栏与基础交互 🛠️

### 目标
实现工具栏组件和基础的用户交互功能。

### 任务清单

#### 3.1 工具栏组件
- [ ] 实现 `components/toolbar/PdfTopToolbar.vue` - 顶部工具栏
- [ ] 实现 `components/toolbar/PdfBottomToolbar.vue` - 底部工具栏
- [ ] 实现 `components/shared/PdfButton.vue` - 通用按钮组件
- [ ] 可选：在合适场景使用 Vant@2 组件（如 `van-button`、`van-icon`、`van-popup`）

#### 3.2 控制组件
- [ ] 实现 `components/controls/PdfNavigation.vue` - 导航控制
- [ ] 实现 `components/controls/PdfZoomControl.vue` - 缩放控制
- [ ] 实现 `components/controls/PdfPageInput.vue` - 页码输入
- [ ] 可选：使用 Vant@2 组件优化体验（如 `van-field` 页码输入、`van-stepper` 缩放控制）

#### 3.3 状态管理扩展
- [ ] 完善 `store/modules/ui.js` - UI 状态管理
- [ ] 实现工具栏显示/隐藏控制
- [ ] 实现页面跳转和缩放状态同步

#### 3.4 基础样式
- [ ] 创建 `styles/variables.less` - 样式变量
- [ ] 实现基础工具栏样式
- [ ] 实现移动端适配的基础样式

### 验收标准
- [ ] 工具栏正常显示和交互
- [ ] 页面导航控制正常
- [ ] 缩放控制正常
- [ ] 页码输入和跳转正常
- [ ] 移动端触摸操作正常

## 阶段 4：功能组件实现 ⚡

### 目标
实现独立的功能组件：缩略图、目录、书签等，支持灵活放置。

### 任务清单

#### 4.1 功能组件开发
- [ ] 实现 `components/features/PdfThumbnail.vue` - 缩略图组件
- [ ] 实现 `components/features/PdfOutline.vue` - 目录组件
- [ ] 实现 `components/features/PdfBookmarks.vue` - 书签组件
- [ ] 实现 `components/sidebar/PdfSidebar.vue` - 侧边栏容器
- [ ] 可选：使用 Vant@2 组件提升体验（如 `van-sidebar`、`van-list`、`van-grid`）

#### 4.2 数据服务层
- [ ] 实现缩略图数据获取逻辑
- [ ] 实现目录数据解析逻辑
- [ ] 实现书签数据管理逻辑
- [ ] 确保数据与 UI 完全分离

#### 4.3 状态管理完善
- [ ] 完善 `store/modules/navigation.js` - 导航状态
- [ ] 实现功能组件的状态管理
- [ ] 实现组件间的数据同步

#### 4.4 灵活布局支持
- [ ] 支持功能组件的任意位置放置
- [ ] 实现组件的显示/隐藏控制
- [ ] 提供多种布局模式示例
- [ ] 可选：使用 Vant@2 布局组件简化开发（如 `van-row`、`van-col`、`van-divider`）

### 验收标准
- [ ] 缩略图正常生成和显示
- [ ] 目录正常解析和导航
- [ ] 书签功能正常
- [ ] 功能组件可以灵活放置在不同位置
- [ ] 侧边栏容器正常工作

## 阶段 5：移动端优化与手势支持 📱

### 目标
针对移动端进行专门优化，实现手势支持和移动端特有功能。

### 任务清单

#### 5.1 移动端配置优化
- [ ] 实现移动端专用配置
  ```javascript
  const mobileConfig = {
    maxCanvasPixels: 0,           // CSS-only zooming
    textLayerMode: 1,             // 启用文本层
    maxImageSize: 1024 * 1024,    // 1M像素限制
  };
  ```

#### 5.2 手势支持
- [ ] 创建 `mixins/mobile-gestures.js` - 手势混入
- [ ] 实现双指缩放手势
- [ ] 实现滑动翻页手势
- [ ] 实现长按菜单

#### 5.3 移动端 UI 优化
- [ ] 优化工具栏的移动端布局
- [ ] 实现触摸友好的按钮尺寸
- [ ] 优化侧边栏的移动端交互
- [ ] 实现移动端专用的加载动画

#### 5.4 性能优化
- [ ] 实现 Canvas 渲染优化
- [ ] 实现图像压缩和缓存
- [ ] 优化内存使用
- [ ] 实现懒加载机制

### 验收标准
- [ ] 双指缩放手势正常工作
- [ ] 滑动翻页手势正常工作
- [ ] 移动端 UI 交互流畅
- [ ] 性能在移动设备上表现良好
- [ ] 内存使用控制在合理范围

## 阶段 6：完善与扩展功能 🚀

### 目标
完善组件功能，添加高级特性，完成文档和示例。

### 任务清单

#### 6.1 高级功能
- [ ] 实现 `components/features/PdfSearch.vue` - 搜索组件
- [ ] 实现 `components/dialogs/PdfPasswordDialog.vue` - 密码对话框
- [ ] 实现 `components/dialogs/PdfErrorDialog.vue` - 错误对话框
- [ ] 实现打印功能（可选）
- [ ] 可选：使用 Vant@2 高级组件增强功能（如 `van-search`、`van-dialog`、`van-toast`）

#### 6.2 完善样式系统
- [ ] 完善 `styles/index.less` - 主样式文件
- [ ] 实现主题支持（可选）
- [ ] 优化响应式设计
- [ ] 完善动画效果

#### 6.3 文档和示例
- [ ] 创建完整的使用示例
- [ ] 编写 API 文档
- [ ] 创建不同布局的演示
- [ ] 编写最佳实践指南

#### 6.4 测试和优化
- [ ] 编写单元测试
- [ ] 进行性能测试
- [ ] 兼容性测试
- [ ] 用户体验优化

### 验收标准
- [ ] 所有功能正常工作
- [ ] 文档完整清晰
- [ ] 示例丰富实用
- [ ] 测试覆盖率达标
- [ ] 性能指标达标

## 总体时间规划

| 阶段 | 预估时间 | 累计时间 | 里程碑 |
|------|----------|----------|--------|
| 阶段 1 | 1-2 天 | 1-2 天 | 基础架构完成 |
| 阶段 2 | 3-4 天 | 4-6 天 | 核心功能可用 |
| 阶段 3 | 2-3 天 | 6-9 天 | 基础交互完成 |
| 阶段 4 | 4-5 天 | 10-14 天 | 功能组件完成 |
| 阶段 5 | 3-4 天 | 13-18 天 | 移动端优化完成 |
| 阶段 6 | 3-4 天 | 16-22 天 | 项目完成 |

**总预估时间：16-22 天**

## 风险控制

### 每阶段验证点
- 每个阶段完成后必须通过验收标准
- 发现问题及时回退到上一个稳定版本
- 重要功能变更需要进行回归测试

### 常见风险及应对
1. **PDF.js 版本兼容性问题**：严格使用指定版本 4.4.168
2. **移动端性能问题**：及时进行性能测试和优化
3. **组件复杂度过高**：保持组件职责单一，及时重构

### 质量保证
- 每个阶段都要有可运行的演示
- 关键功能要有测试用例
- 代码要符合项目规范

## 详细执行指导

### 阶段 1 详细步骤

#### 1.1 项目初始化详细步骤
```bash
# 1. 进入项目目录
cd examples/web-vue2

# 2. 安装依赖（PDF.js 使用本地版本）
npm install vant@2 vuex@3
npm install less less-loader@7 --save-dev

# 3. 创建 PDF 组件目录结构
mkdir -p src/components/pdf-reader/{core,components,store,styles,utils,constants}
mkdir -p src/components/pdf-reader/components/{viewer,toolbar,sidebar,features,controls,dialogs,shared}
```

#### 1.2 核心文件创建模板

**core/pdf-config.js**
```javascript
// PDF.js 基础配置
export const PDF_CONFIG = {
  // 移动端优化配置
  maxCanvasPixels: 0,           // 使用 CSS 缩放
  maxImageSize: 1024 * 1024,    // 1M像素限制
  textLayerMode: 1,             // 启用文本层
  enableScripting: false,       // 禁用 PDF JavaScript
  annotationMode: 1             // 仅启用表单注释
};

// Worker 配置（使用本地 PDF.js 库）
export async function initializePdfJs() {
  // 路径说明：从 pdf-reader/core/ 到项目根目录的 pdfjs-dist/
  // examples/web-vue2/src/components/pdf-reader/core/ -> pdfjs-dist/
  const pdfjsLib = await import('../../../../../pdfjs-dist/webpack.mjs');
  return pdfjsLib;
}
```

**components/PdfViewer.vue**
```vue
<template>
  <div class="pdf-viewer">
    <div class="pdf-viewer__container">
      <!-- 阶段1：基础容器 -->
      <div v-if="loading" class="pdf-viewer__loading">
        加载中...
      </div>
      <div v-else-if="error" class="pdf-viewer__error">
        {{ error }}
      </div>
      <div v-else class="pdf-viewer__content">
        <!-- 后续阶段会在这里添加内容 -->
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PdfViewer',
  props: {
    src: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      error: null
    };
  },
  async mounted() {
    await this.loadPdf();
  },
  methods: {
    async loadPdf() {
      try {
        this.loading = true;
        this.error = null;

        // 基础 PDF.js 集成测试（使用本地库）
        const pdfjsLib = await import('../../../../../pdfjs-dist/webpack.mjs');
        const loadingTask = pdfjsLib.getDocument(this.src);
        const pdf = await loadingTask.promise;

        console.log('PDF 加载成功，页数：', pdf.numPages);
        this.loading = false;
      } catch (err) {
        this.error = `PDF 加载失败: ${err.message}`;
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-viewer {
  width: 100%;
  height: 100%;

  &__container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &__loading,
  &__error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    font-size: 16px;
  }

  &__error {
    color: #f56c6c;
  }
}
</style>
```

#### 1.3 验证脚本
创建 `examples/web-vue2/src/views/Stage1Test.vue` 用于验证阶段1成果：

```vue
<template>
  <div class="stage1-test">
    <h2>阶段1验证 - 基础架构</h2>
    <pdf-viewer :src="pdfUrl" />
  </div>
</template>

<script>
import PdfViewer from '../components/pdf-reader/components/PdfViewer.vue';

export default {
  name: 'Stage1Test',
  components: {
    PdfViewer
  },
  data() {
    return {
      pdfUrl: '/assets/sample.pdf' // 准备一个测试PDF文件
    };
  }
};
</script>
```

### 阶段 2 详细步骤

#### 2.1 核心服务层实现

**core/pdf-application.js**
```javascript
import { PDF_CONFIG } from './pdf-config.js';

export class PdfApplication {
  constructor() {
    this.pdfDocument = null;
    this.eventBus = null;
    this.linkService = null;
    this.findController = null;
  }

  async initialize() {
    // 初始化 PDF.js 组件系统（使用本地库）
    const pdfjsViewer = await import('../../../../../pdfjs-dist/legacy/web/pdf_viewer.mjs');

    this.eventBus = new pdfjsViewer.EventBus();
    this.linkService = new pdfjsViewer.PDFLinkService({
      eventBus: this.eventBus
    });
    this.findController = new pdfjsViewer.PDFFindController({
      eventBus: this.eventBus,
      linkService: this.linkService
    });

    return {
      eventBus: this.eventBus,
      linkService: this.linkService,
      findController: this.findController
    };
  }

  async loadDocument(src) {
    const pdfjsLib = await import('../../../../../pdfjs-dist/webpack.mjs');

    const loadingTask = pdfjsLib.getDocument({
      url: src,
      ...PDF_CONFIG
    });

    this.pdfDocument = await loadingTask.promise;
    return this.pdfDocument;
  }
}
```

#### 2.2 状态管理基础

**store/modules/document.js**
```javascript
const state = {
  pdfDocument: null,
  documentInfo: null,
  fingerprint: null,
  loading: false,
  error: null
};

const mutations = {
  SET_DOCUMENT(state, document) {
    state.pdfDocument = document;
  },
  SET_DOCUMENT_INFO(state, info) {
    state.documentInfo = info;
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_ERROR(state, error) {
    state.error = error;
  }
};

const actions = {
  async loadDocument({ commit }, src) {
    try {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);

      const { PdfApplication } = await import('../../core/pdf-application.js');
      const app = new PdfApplication();
      const document = await app.loadDocument(src);

      commit('SET_DOCUMENT', document);
      commit('SET_LOADING', false);

      return document;
    } catch (error) {
      commit('SET_ERROR', error.message);
      commit('SET_LOADING', false);
      throw error;
    }
  }
};

const getters = {
  isDocumentLoaded: state => !!state.pdfDocument,
  totalPages: state => state.pdfDocument?.numPages || 0
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
```

### 每阶段检查清单

#### 阶段完成检查模板
```markdown
## 阶段 X 完成检查

### 功能验证
- [ ] 核心功能正常工作
- [ ] 无控制台错误
- [ ] 移动端测试通过
- [ ] 性能表现良好

### 代码质量
- [ ] 代码符合规范
- [ ] 组件职责清晰
- [ ] 状态管理正确
- [ ] 错误处理完善

### 文档更新
- [ ] 更新 API 文档
- [ ] 更新使用示例
- [ ] 记录已知问题
- [ ] 更新下阶段计划
```

## 快速启动指南

### 立即开始阶段1
1. 进入项目目录：`cd examples/web-vue2`
2. 安装依赖：`npm install vant@2 vuex@3`
3. 创建目录结构：`mkdir -p src/components/pdf-reader/{core,components,store,styles,utils,constants}`
4. 实现基础 PdfViewer 组件
5. 验证本地 PDF.js 库导入：`../../../../../pdfjs-dist/webpack.mjs`
6. 测试基础 PDF 加载功能

### 问题排查
- **PDF.js Worker 警告**：检查是否正确使用了本地 `pdfjs-dist/webpack.mjs`
- **路径错误**：确认相对路径 `../../../../../pdfjs-dist/` 正确
- **移动端显示问题**：检查 viewport 设置和 CSS 样式

### 获取帮助
- 参考主迁移指南：`examples/web-vue2/doc/notice.md`
- 查看官方示例：`examples/` 目录，`web/` 目录
- 检查本地 PDF.js 文档：`pdfjs-dist/README.md`

## Vant@2 组件集成指南 📱

### 核心集成策略

PDF 阅读器组件可选择性使用 Vant@2 组件库，在合适的场景下提升移动端用户体验和开发效率。

**重要说明**：
- ✅ Vant@2 已在项目中全局引入，可直接使用
- 🎯 **按需使用**：不强制使用，在合适的场景下选择性使用
- 🏗️ **架构优先**：优先保证 PDF 核心功能，UI 组件作为增强

#### 可选组件映射表

| 功能模块 | PDF 组件 | 可选 Vant@2 组件 | 使用建议 |
|---------|----------|-------------|----------|
| **工具栏** | PdfTopToolbar | van-nav-bar, van-button, van-icon | 🟡 可选：需要标准导航栏时 |
| **底部控制** | PdfBottomToolbar | van-tabbar, van-button | 🟡 可选：多功能切换时 |
| **页码输入** | PdfPageInput | van-field, van-number-keyboard | 🟢 推荐：提升输入体验 |
| **缩放控制** | PdfZoomControl | van-stepper, van-slider | 🟡 可选：需要精确控制时 |
| **侧边栏** | PdfSidebar | van-sidebar, van-popup | 🟢 推荐：标准侧边栏布局 |
| **缩略图** | PdfThumbnail | van-grid, van-image | 🟡 可选：网格布局需求 |
| **目录** | PdfOutline | van-list | 🟢 推荐：列表展示优化 |
| **搜索** | PdfSearch | van-search | 🟢 推荐：搜索体验优化 |
| **对话框** | PdfPasswordDialog | van-dialog, van-field | 🟢 推荐：标准对话框 |
| **加载状态** | PdfLoadingProgress | van-loading, van-progress | 🟡 可选：需要统一风格时 |
| **消息提示** | - | van-toast, van-notify | 🟢 推荐：操作反馈 |

#### 样式集成策略

```less
// 1. 继承 Vant@2 设计令牌
@import '~vant/lib/style/var.less';

// 2. 扩展 PDF 阅读器专用变量
@pdf-primary-color: @blue;
@pdf-toolbar-height: 50px;
@pdf-sidebar-width: 280px;

// 3. 组件样式复用
.pdf-button {
  // 复用 Vant 按钮样式
  .van-button-mixin();
}
```

#### 主题一致性

```javascript
// 使用 Vant@2 主题变量确保视觉一致性
const themeVars = {
  blue: '#1989fa',
  red: '#ee0a24',
  orange: '#ff976a',
  // PDF 阅读器扩展色彩
  'pdf-viewer-bg': '#f7f8fa',
  'pdf-page-shadow': 'rgba(0, 0, 0, 0.1)'
};
```

### 各阶段集成重点

#### 阶段3：工具栏与基础交互
- **van-nav-bar**: 顶部工具栏基础结构
- **van-button**: 统一的按钮样式和交互
- **van-icon**: 图标系统集成
- **van-field**: 页码输入框

#### 阶段4：功能组件实现
- **van-sidebar**: 侧边栏布局容器
- **van-grid**: 缩略图网格布局
- **van-list**: 目录列表展示
- **van-popup**: 弹出层功能面板

#### 阶段5：移动端优化
- **van-touch**: 手势操作增强
- **van-swipe**: 滑动翻页
- **van-pull-refresh**: 下拉刷新
- **van-action-sheet**: 操作菜单

#### 阶段6：完善与扩展
- **van-search**: 高级搜索功能
- **van-dialog**: 各种对话框
- **van-toast**: 操作反馈提示
- **van-loading**: 加载状态优化

### 最佳实践

#### 1. 全局引入已配置
```javascript
// 项目中已全局引入 Vant@2，可直接使用
// main.js - 已配置
import Vant from 'vant';
import 'vant/lib/index.css';
Vue.use(Vant);

// 在组件中直接使用，无需额外引入
// <van-button>按钮</van-button>
```

#### 2. 样式覆盖
```less
// 在 PDF 组件中适当覆盖 Vant 样式
.pdf-toolbar {
  .van-nav-bar {
    background: var(--pdf-toolbar-bg);

    .van-nav-bar__title {
      color: var(--pdf-text-color);
    }
  }
}
```

#### 3. 事件统一
```javascript
// 统一事件处理，保持 PDF 组件 API 一致性
methods: {
  onVantButtonClick() {
    // Vant 组件事件 -> PDF 组件事件
    this.$emit('pdf-action', { type: 'navigate', action: 'next' });
  }
}
```

### 注意事项

1. **版本兼容性**: 项目已配置 Vant@2.x 版本，与 Vue 2 完全兼容
2. **可选使用**: 不强制使用 Vant 组件，根据实际需求选择
3. **样式隔离**: 使用 scoped 样式避免全局污染
4. **核心功能优先**: 优先保证 PDF 核心功能，UI 组件作为增强
5. **主题定制**: 可利用 Vant 的 CSS 变量系统进行主题定制
6. **移动端优化**: 在需要时利用 Vant 的移动端优化特性
