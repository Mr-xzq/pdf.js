# 移动端 H5 Tree 组件设计文档（Vue 2）

> 目标：用于“目录/层级数据”的展示与基本交互（展开、折叠、定位、高亮）。不考虑搜索与过滤、虚拟滚动等性能优化（后续可扩展）。

## 1. 组件定位与范围
- 平台：移动端 H5（触控优先）
- 能力范围：
  - 展示层级结构（缩进、图标可选）
  - 展开/折叠（带动效）
  - 选中高亮（点击反馈，便于“定位”）
  - 通过方法定位到指定节点并闪烁高亮
- 暂不实现：搜索/过滤、多选与三态、拖拽、虚拟滚动、复杂手势（长按/侧滑）

## 2. 数据模型
```ts
export interface TreeNode {
  key: string;       // 节点唯一标识（必填）
  label: string;     // 展示文本
  isLeaf?: boolean;  // 是否叶子（可选，仅影响图标与展开按钮）
  children?: TreeNode[]; // 子节点
  disabled?: boolean;     // 是否禁用（表现为样式与不可交互）
  meta?: Record<string, any>; // 额外数据
}
```

## 3. 组件 API 设计
组件名建议：`MTree`（避免与现有 `Tree/index.vue` 命名冲突，可按需调整）。

### 3.1 Props
- `data: TreeNode[]` 必填，树数据源
- `expandedKeys: string[]` 受控展开集合（配合 `.sync`）
- `defaultExpandAll: boolean` 是否默认全部展开（仅初始）
- `indent: number` 缩进像素，默认 `16`
- `itemHeight: number` 行高/触控热区，默认 `44`（px）
- `selectable: boolean` 是否允许点击选中高亮，默认 `true`
- `activeKey: string | null` 当前选中节点（受控，可选）
- `transition: boolean` 是否开启展开/折叠动画，默认 `true`
- `duration: number` 展开/折叠动画时长，默认 `160`（ms）
- `easing: string` 动画缓动，默认 `cubic-bezier(0.2, 0, 0, 1)`
- `ellipsis: 'single' | 'multi' | 'none'` 文本截断策略，默认 `single`
- `maxLines: number` 多行截断行数（当 `ellipsis='multi'` 时生效），默认 `2`
- `showGuideLine: boolean` 是否显示层级引导线（轻量视觉辅助），默认 `false`

备注：Vue 2 推荐使用 `:expanded-keys.sync` 与 `:active-key.sync` 形式实现受控。

### 3.2 Events
- `@toggle(node: TreeNode, expanded: boolean, ctx: { expandedKeys: string[] })`
- `@select(node: TreeNode, ctx: { activeKey: string | null })`
- `@ready(ctx: { methods })` 组件挂载后回调（可从中获取实例方法）

### 3.3 Methods（通过 `ref` 暴露）
- `expandAll()` / `collapseAll()`
- `expandToKey(key: string)` 展开到目标节点（逐级展开）
- `scrollToKey(key: string, align: 'start'|'center'|'end' = 'center')` 滚动定位
- `flashHighlight(key: string, ms: number = 800)` 闪烁高亮用于“定位提示”

### 3.4 Slots
- `icon` 自定义前缀图标，参数：`{ node, expanded, level }`
- `label` 自定义主文本渲染，参数：`{ node, matched?: boolean }`
- `suffix` 右侧附加内容（计数/状态等），参数：`{ node }`
- `empty` 空态

## 4. 交互与动效（移动端优化）
- 行高与热区：默认 `44px`；展开/折叠按钮扩大热区至 `32–40px`
- 点击反馈：
  - 点击整行：选中高亮（`--active` 状态，0.1–0.15s 背景过渡）
  - 点击“展开图标/区域”：切换展开/折叠（避免与选中混淆）
- 动画：
  - 子树容器使用高度过渡（`height`/`max-height` + 钩子测量）
  - 展开图标使用 `transform: rotate(90deg)` 过渡（120–160ms）
- 防误触：
  - 展开/折叠与选中分别设置点击区域，互不干扰
  - 允许轻微滚动时抑制点击（阈值 ~5–8px，后续需要 JS 支持）
- 长文本：
  - `single`：单行省略（推荐默认）
  - `multi`：多行省略（`-webkit-line-clamp`），`maxLines` 控制
  - `none`：不截断，自动换行

## 5. DOM 结构与样式约定（BEM + Less）
```html
<div class="m-tree">
  <div class="m-tree__node m-tree__node--level-2 m-tree__node--active">
    <div class="m-tree__toggle" aria-hidden="true"></div>
    <div class="m-tree__content">
      <div class="m-tree__icon"></div>
      <div class="m-tree__label">Title</div>
      <div class="m-tree__suffix"></div>
    </div>
  </div>
  <div class="m-tree__children"><!-- 子节点容器 --></div>
</div>
```

### Less 变量（可按主题覆盖）
```less
@m-tree-item-height: 44px;
@m-tree-indent: 16px;
@m-tree-active-bg: rgba(0,0,0,0.06);
@m-tree-text: #111;
@m-tree-muted: #8c8c8c;
@m-tree-easing: cubic-bezier(0.2, 0, 0, 1);
@m-tree-duration: 160ms;
```

### 基础样式片段（节选）
```less
.m-tree {
  font-size: 14px;
  color: @m-tree-text;
  .m-tree__node {
    display: flex;
    align-items: center;
    height: @m-tree-item-height;
    padding: 0 12px 0 8px;
    &.m-tree__node--active { background: @m-tree-active-bg; }
  }
  .m-tree__toggle {
    width: 32px; height: 100%; display: flex; align-items: center; justify-content: center;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    .arrow { transition: transform @m-tree-duration @m-tree-easing; }
    &.is-expanded .arrow { transform: rotate(90deg); }
  }
  .m-tree__content { flex: 1; min-width: 0; display: flex; align-items: center; }
  .m-tree__label {
    flex: 1; min-width: 0;
    &.is-ellipsis-single { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &.is-ellipsis-multi {
      display: -webkit-box; -webkit-line-clamp: var(--m-tree-lines, 2); -webkit-box-orient: vertical; overflow: hidden;
    }
  }
  .m-tree__children { overflow: hidden; transition: height @m-tree-duration @m-tree-easing; }
}
```

## 6. 动画实现建议（Vue 2）
使用 `<transition>` 自定义钩子测量高度，避免 `height:auto` 过渡问题：
```vue
<transition
  @enter="onEnter" @after-enter="onAfterEnter"
  @leave="onLeave" @after-leave="onAfterLeave">
  <div v-show="expanded" ref="wrap" class="m-tree__children"><slot/></div>
</transition>
```
```js
methods: {
  onEnter(el) {
    el.style.height = '0px';
    const h = el.scrollHeight + 'px';
    // 强制回流后过渡到目标高度
    void el.offsetHeight; el.style.height = h;
  },
  onAfterEnter(el) { el.style.height = ''; },
  onLeave(el) {
    el.style.height = el.scrollHeight + 'px';
    void el.offsetHeight; el.style.height = '0px';
  },
  onAfterLeave(el) { el.style.height = ''; },
}
```

## 7. 使用示例
### 7.1 模板用法（Vue 2 + `.sync`）
```vue
<m-tree
  :data="nodes"
  :expanded-keys.sync="expanded"
  :active-key.sync="active"
  :indent="16"
  :item-height="44"
  :ellipsis="'single'"
  @toggle="onToggle"
  ref="treeRef"
/>
```
```js
export default {
  data() {
    return {
      nodes: [
        { key: '1', label: '根 1', children: [ { key: '1-1', label: '子 1-1' } ] },
        { key: '2', label: '根 2', isLeaf: true },
      ],
      expanded: ['1'],
      active: null,
    };
  },
  methods: {
    onToggle(node, expanded) { /* 上报埋点等 */ },
    goTo(key) {
      this.$refs.treeRef.expandToKey(key);
      this.$refs.treeRef.scrollToKey(key, 'center');
      this.$refs.treeRef.flashHighlight(key);
    },
  },
};
```

### 7.2 JSX（可选，便于灵活自定义）
```jsx
<MTree
  data={nodes}
  expandedKeys={this.expanded}
  onToggle={(node, expanded)=> this.onToggle(node, expanded)}
  scopedSlots={{
    label: ({ node }) => <span>{node.label}</span>,
    suffix: ({ node }) => <span class="badge">{node.meta?.count}</span>,
  }}
/>
```

## 8. 定位与高亮策略
- `scrollToKey(key, align)`：滚动至目标行，`align` 默认 `center`
- `flashHighlight(key, ms)`：添加 `--flash` 类并在 `ms` 后移除
- 视觉建议：
  - `--flash`：背景从主题色浅色过渡至透明（渐隐 600–1000ms）
  - `--active`：稳定的选中背景，不自动消失

## 9. 无障碍（基础）
- 容器：`role="tree"`
- 节点：`role="treeitem"`，可用 `aria-expanded`、`aria-level` 标记层级与展开态
- 图标按钮：`aria-label="展开/折叠"`，可隐藏到可视外但保留语义

## 10. MVP 实现清单
- [x] 树形渲染（缩进、图标占位）
- [x] 展开/折叠（高度与箭头旋转动画）
- [x] 行点击选中高亮（与展开热区隔离）
- [x] 定位 API：`expandToKey`、`scrollToKey`、`flashHighlight`
- [x] 文本截断策略（单行默认，多行可选）
- [x] 受控属性：`expandedKeys.sync`、`activeKey.sync`
- [ ] 视觉/主题变量（Less）与暗色模式适配（可后续加）

## 11. 后续增强点（非本期）
- 搜索与过滤（仅保留匹配节点及祖先，关键字高亮）
- 懒加载子节点（`loadChildren(node)`）
- 多选与父子联动（三态）
- 虚拟滚动（大数据优化）
- 拖拽排序/移动、长按菜单、侧滑快捷操作



如需我继续基于此设计输出一个 Vue 2 版本的 `MTree` 最小实现（含基础样式与动效），请告知：
- 组件文件放置路径（是否沿用 `components/Tree`）
- 是否直接复用现有 `index.vue` 作为实现入口
- 是否需要提供少量示例数据与 Demo 页集成

