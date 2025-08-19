# Vue PDF 查看器组件

基于 PDF.js 4.4.168 版本的 Vue 2 移动端 PDF 阅读器组件，专注于移动端体验优化。

## 特性

- 📱 **移动端优化**: 专为移动设备设计，支持手势缩放
- 🎨 **美观界面**: 基于 Vant 2 UI 组件库，支持亮色/暗色主题
- 🏗️ **模块化设计**: 高内聚、低耦合，可直接复制到其他项目
- 📊 **状态管理**: 使用 Vuex 进行状态管理，支持动态注册
- 🔧 **易于集成**: 简单的 API 设计，最小化外部依赖

## 核心功能

### MVP 功能
- ✅ PDF 文档加载和渲染
- ✅ 基本页面导航（前进、后退、跳转）
- ✅ 缩放控制（放大、缩小、手势缩放）
- ✅ 缩略图显示和导航
- ✅ 目录解析和跳转
- ✅ 上下滑动阅读方式（连续滚动模式）

### 扩展功能（待开发）
- 🔍 全文搜索和高亮显示
- ✏️ 注释系统（高亮、文本注释）
- 🖨️ 打印功能
- 🌐 国际化支持

## 快速开始

### 安装依赖

```bash
# 核心依赖
npm install pdfjs-dist@4.4.168
npm install vant@2
npm install vuex@3

# 开发依赖
npm install less less-loader
```

### 基本使用

1. **在 Vue 项目中集成**

```javascript
// main.js
import Vue from 'vue';
import Vuex from 'vuex';
import Vant from 'vant';
import 'vant/lib/index.css';

// 引入 PDF 查看器组件
import PdfViewer from './path/to/vue2/components/PdfViewer.vue';

Vue.use(Vuex);
Vue.use(Vant);
Vue.component('PdfViewer', PdfViewer);

// 创建 Vuex store
const store = new Vuex.Store({
  modules: {
    // PDF 查看器模块会自动注册
  }
});

new Vue({
  store,
  render: h => h(App)
}).$mount('#app');
```

2. **在组件中使用**

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

### 高级使用

1. **自定义配置**

```vue
<template>
  <pdf-viewer
    :src="pdfUrl"
    :show-toolbar="true"
    :max-canvas-pixels="0"
    :text-layer-mode="1"
    :initial-page="5"
    :enable-gestures="true"
    :theme="theme"
    @document-loaded="onDocumentLoaded"
    @load-error="onLoadError"
    @page-changed="onPageChanged"
    @scale-changed="onScaleChanged"
  />
</template>
```

2. **手动控制**

```javascript
// 通过 ref 获取组件实例
methods: {
  // 跳转到指定页面
  goToPage(pageNumber) {
    this.$refs.pdfViewer.goToPage(pageNumber);
  },
  
  // 缩放控制
  zoomIn() {
    this.$refs.pdfViewer.zoomIn();
  },
  
  zoomOut() {
    this.$refs.pdfViewer.zoomOut();
  },
  
  // 侧边栏控制
  showThumbnails() {
    this.$refs.pdfViewer.toggleSidebar('thumbs');
  },
  
  showOutline() {
    this.$refs.pdfViewer.toggleSidebar('outline');
  }
}
```

3. **状态管理**

```javascript
// 使用 Vuex 状态
import { mapState, mapGetters, mapActions } from 'vuex';

computed: {
  ...mapState('pdfViewer', [
    'currentPage', 
    'totalPages', 
    'scale',
    'loading'
  ]),
  
  ...mapGetters('pdfViewer', [
    'isDocumentLoaded',
    'canGoNext',
    'canGoPrev',
    'scalePercent'
  ])
},

methods: {
  ...mapActions('pdfViewer', [
    'loadDocument',
    'goToPage',
    'nextPage',
    'prevPage',
    'setScale',
    'toggleSidebar'
  ])
}
```

## API 参考

### Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| src | String | - | PDF 文件路径（必需） |
| showToolbar | Boolean | true | 是否显示工具栏 |
| maxCanvasPixels | Number | 0 | 最大 Canvas 像素（0 表示使用 CSS 缩放） |
| textLayerMode | Number | 1 | 文本层模式（0: 禁用, 1: 启用, 2: 增强） |
| initialPage | Number | 1 | 初始页码 |
| enableGestures | Boolean | true | 是否启用手势 |
| theme | String | 'light' | 主题（'light' \| 'dark'） |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| document-loaded | { numPages, info } | 文档加载完成 |
| load-error | error | 加载错误 |
| page-changed | { pageNumber, previous } | 页面切换 |
| scale-changed | { scale, presetValue } | 缩放变化 |
| page-rendered | { pageNumber, source } | 页面渲染完成 |
| search | query | 搜索事件（预留） |
| scroll | event | 滚动事件 |

### Methods

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| loadDocument | src | Promise | 加载文档 |
| goToPage | pageNumber | Boolean | 跳转到指定页面 |
| nextPage | - | Boolean | 下一页 |
| prevPage | - | Boolean | 上一页 |
| zoomIn | - | - | 放大 |
| zoomOut | - | - | 缩小 |
| setScale | scale | - | 设置缩放比例 |
| toggleSidebar | mode | - | 切换侧边栏 |
| cleanup | - | Promise | 清理资源 |

## 组件结构

```
vue2/
├── components/              # Vue 组件
│   ├── PdfViewer.vue       # 主容器组件
│   ├── PdfTopToolbar.vue   # 顶部工具栏
│   ├── PdfBottomToolbar.vue # 底部工具栏
│   ├── PdfThumbnail.vue    # 缩略图查看器
│   └── PdfOutline.vue      # 目录查看器
├── store/                  # Vuex 状态管理
│   └── pdf-viewer.js       # PDF 查看器状态模块
├── utils/                  # 工具类
│   └── pdf-viewer-core.js  # PDF.js 核心封装
├── styles/                 # 样式文件
│   └── pdf-viewer.less     # 主样式文件
├── index.js               # 组件入口
├── example.vue            # 使用示例
└── README.md              # 说明文档
```

## 技术特点

### 1. 基于 PDF.js 组件系统
- 充分利用 PDF.js 的三层架构（Core/Display/Viewer）
- 基于 `PDFViewer`、`PDFThumbnailViewer`、`PDFOutlineViewer` 等组件
- 保持与 PDF.js 原生 API 的兼容性

### 2. 移动端优化
- CSS 缩放模式，减少内存占用
- 双指缩放手势支持
- 触摸友好的 UI 设计
- 响应式布局适配

### 3. 状态管理
- Vuex 模块化设计，动态注册
- 完整的状态管理（页面、缩放、侧边栏等）
- 支持 mapState、mapActions 等辅助函数

### 4. 错误处理
- 统一的错误处理机制
- 密码保护 PDF 支持
- 网络错误重试机制
- 用户友好的错误提示

## 浏览器兼容性

- iOS Safari 10+
- Android Chrome 60+
- 微信内置浏览器
- 支持现代浏览器的 ES6+ 特性

## 许可证

本项目基于 Apache 2.0 许可证开源。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的 PDF 查看功能
- 移动端优化
- Vant 2 UI 集成
