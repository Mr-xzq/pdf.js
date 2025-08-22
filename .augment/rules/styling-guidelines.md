# 样式开发规范

## Less 样式组织
- 使用单文件包含所有基础样式：`styles/pdf-viewer.less`
- 专注核心功能，也要参考功能中的核心 MVP 设计，避免过度复杂的样式设计。可以参考：迁移到 vue2 + vue-cli@5 + vant@2 的技术参考文档：webToVue2/doc/web02.md

## 基础样式结构
```less
// 基础变量
@primary-color: #1890ff;
@background-color: #f5f5f5;

.vue-pdf-viewer {
  width: 100%;
  height: 100vh;
  background-color: @background-color;
  display: flex;
  flex-direction: column;
  
  .pdf-viewer-container {
    flex: 1;
    overflow: auto;  // 支持上下滑动
  }
  
  .pdf-toolbar {
    height: 44px;
    background: #fff;
    display: flex;
    align-items: center;
    padding: 0 16px;
  }
  
  .pdf-sidebar {
    position: absolute;
    right: 0;
    width: 280px;
    background: #fff;
    transform: translateX(100%);
    
    &.show {
      transform: translateX(0);
    }
  }
}
```

## 样式规范
1. **移动端优先**：所有样式专注移动端体验
2. **简洁设计**：避免复杂的动画和效果
3. **容器尺寸**：固定容器尺寸，适配标准移动端屏幕
4. **命名规范**：使用 BEM 命名规范或语义化类名
5. **scoped 样式**：所有 Vue 组件使用 scoped 样式避免污染

## 重要的原版样式参考
- 主样式文件：web/viewer.css
- PDF 查看器样式：web/pdf_viewer.css
- 文本层样式：web/text_layer_builder.css
- 注释层样式：web/annotation_layer_builder.css

## UI 组件库集成
- 使用 Vant 2 组件提供基础移动端体验
- 加载状态：`<van-loading>`
- 按钮组件：`<van-button>`
- 弹窗组件：`<van-popup>`
