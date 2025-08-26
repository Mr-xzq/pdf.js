# Vant@2 集成总结

## 集成状态

✅ **Vant@2 已全局引入**  
项目中已在 `main.js` 中全局引入 Vant@2 组件库，可直接使用所有组件。

```javascript
// main.js - 已配置
import Vant from 'vant';
import 'vant/lib/index.css';
Vue.use(Vant);
```

## 使用原则

### 🎯 核心原则
- **可选使用**：不强制使用 Vant 组件，根据实际需求选择
- **功能优先**：优先保证 PDF 核心功能，UI 组件作为增强
- **场景适配**：在合适的场景下使用 Vant 组件提升体验

### 🟢 推荐使用场景

#### 1. 标准交互组件
```vue
<!-- 密码输入对话框 -->
<van-dialog v-model="showPasswordDialog" title="请输入密码">
  <van-field 
    v-model="password" 
    type="password" 
    placeholder="请输入PDF密码" 
  />
</van-dialog>

<!-- 页码输入 -->
<van-field 
  v-model="pageNumber" 
  type="number" 
  label="页码" 
  placeholder="跳转到指定页"
/>
```

#### 2. 操作反馈
```javascript
// 成功提示
this.$toast.success('PDF 加载成功');

// 错误提示
this.$toast.fail('PDF 加载失败');

// 加载状态
const loading = this.$toast.loading('正在加载PDF...');
```

#### 3. 列表展示
```vue
<!-- 文档目录 -->
<van-list>
  <van-cell 
    v-for="item in outline" 
    :key="item.id" 
    :title="item.title" 
    :label="`第 ${item.page} 页`"
    is-link
    @click="goToPage(item.page)"
  />
</van-list>

<!-- 缩略图网格 -->
<van-grid :column-num="3">
  <van-grid-item 
    v-for="page in thumbnails" 
    :key="page.number"
    @click="goToPage(page.number)"
  >
    <van-image :src="page.thumbnail" />
    <span>{{ page.number }}</span>
  </van-grid-item>
</van-grid>
```

#### 4. 搜索功能
```vue
<!-- 搜索框 -->
<van-search 
  v-model="searchText"
  placeholder="搜索PDF内容"
  @search="onSearch"
  @clear="onClear"
/>
```

### 🟡 可选使用场景

#### 1. 导航栏
```vue
<!-- 根据设计需求决定是否使用 -->
<van-nav-bar 
  title="PDF 阅读器" 
  left-arrow 
  @click-left="goBack"
>
  <template #right>
    <van-icon name="more-o" @click="showMenu" />
  </template>
</van-nav-bar>
```

#### 2. 侧边栏
```vue
<!-- 如需标准侧边栏布局 -->
<van-sidebar v-model="activeKey">
  <van-sidebar-item title="缩略图" />
  <van-sidebar-item title="目录" />
  <van-sidebar-item title="书签" />
</van-sidebar>
```

### ❌ 不推荐场景

#### 1. 核心 PDF 渲染
```javascript
// ❌ 不要用 Vant 组件替换 PDF 核心渲染功能
// PDF 渲染必须使用 Canvas 和 PDF.js 原生 API
```

#### 2. 过度依赖
```javascript
// ❌ 不要为了使用而使用
// 保持组件的独立性，确保在没有 Vant 的环境下也能正常工作
```

## 各阶段集成建议

### 阶段 3：工具栏与基础交互
- 🟢 推荐：`van-button` 统一按钮样式
- 🟢 推荐：`van-field` 页码输入优化
- 🟡 可选：`van-nav-bar` 顶部导航栏

### 阶段 4：功能组件实现
- 🟢 推荐：`van-list` 目录列表展示
- 🟢 推荐：`van-grid` 缩略图网格
- 🟡 可选：`van-sidebar` 侧边栏布局

### 阶段 5：移动端优化
- 🟢 推荐：`van-touch` 手势增强
- 🟡 可选：`van-swipe` 滑动翻页
- 🟡 可选：`van-pull-refresh` 下拉刷新

### 阶段 6：完善与扩展
- 🟢 推荐：`van-search` 搜索功能
- 🟢 推荐：`van-dialog` 各种对话框
- 🟢 推荐：`van-toast` 操作反馈

## 样式集成策略

### 1. 继承 Vant 设计令牌
```less
// 引入 Vant 变量
@import '~vant/lib/style/var.less';

// 扩展 PDF 专用变量
@pdf-primary-color: @blue;
@pdf-toolbar-height: 50px;
@pdf-sidebar-width: 280px;
```

### 2. 适当样式覆盖
```less
.pdf-toolbar {
  .van-nav-bar {
    background: var(--pdf-toolbar-bg);
    
    .van-nav-bar__title {
      color: var(--pdf-text-color);
    }
  }
}
```

### 3. 保持样式隔离
```vue
<style lang="less" scoped>
// 使用 scoped 避免全局污染
.pdf-component {
  // 组件特有样式
}
</style>
```

## 注意事项

1. **版本兼容性**：项目已配置 Vant@2.x，与 Vue 2 完全兼容
2. **可选使用**：不强制使用 Vant 组件，根据实际需求选择
3. **核心功能优先**：优先保证 PDF 核心功能，UI 组件作为增强
4. **样式隔离**：使用 scoped 样式避免全局污染
5. **主题一致性**：可利用 Vant 的 CSS 变量系统保持视觉一致性

## 总结

Vant@2 已在项目中全局引入，为 PDF 阅读器组件提供了丰富的 UI 组件选择。开发时应遵循"可选使用、功能优先"的原则，在合适的场景下选择性使用 Vant 组件来提升用户体验和开发效率，同时确保 PDF 核心功能的独立性和稳定性。
