# 移动端 H5 Tree 组件设计文档（Vue 2）

> 目标：用于“目录/层级数据”的展示与基本交互（展开、折叠、定位、高亮）。不考虑搜索与过滤、虚拟滚动等性能优化（后续可扩展）。

## 1. 组件定位与范围
- 平台：移动端 H5（触控优先）
- 能力范围：
  - 展示层级结构（缩进、图标可选）
  - 展开/折叠（带动效）
  - 选中高亮（点击反馈，便于“定位”）
  - 通过方法定位到指定节点
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
- `accordion: boolean` 互斥展开（仅保留一条展开路径），默认 `false`
- `indent: number` 缩进像素，默认 `16`
- `itemHeight: number` 行高/触控热区，默认 `44`（px）
- `selectable: boolean` 是否允许点击选中高亮，默认 `true`
- `activeKey: string | null` 当前选中节点（受控，可选）
- `transition: boolean` 是否开启展开/折叠动画，默认 `true`
- `duration: number` 展开/折叠动画时长，默认 `160`（ms）

- `props`: { key, label, children, isLeaf } 字段映射（默认同名，可选）

- `ellipsis: 'single' | 'multi' | 'none'` 文本截断策略，默认 `single`
- `maxLines: number` 多行截断行数（当 `ellipsis='multi'` 时生效），默认 `2`
- `showGuideLine: boolean` 是否显示层级引导线（轻量视觉辅助），默认 `false`


### 3.1.1 Props 分层（建议）
- 核心：data、expandedKeys.sync、activeKey.sync、defaultExpandAll、props（key/label/children/isLeaf）
- 进阶：indent、itemHeight、transition、duration、accordion、ellipsis/maxLines（样式相关）


备注：Vue 2 推荐使用 `:expanded-keys.sync` 与 `:active-key.sync` 形式实现受控。

### 3.2 Events
- `@toggle(node: TreeNode, expanded: boolean, ctx: { expandedKeys: string[] })`
- `@select(node: TreeNode, ctx: { activeKey: string | null })`



> 行为说明：激活与定位合一——当通过点击触发 `@select` 或外部设置 `activeKey` 时，组件会自动“仅展开该节点的所有祖先”，但不会展开该节点的子级；高亮始终作用于当前激活节点。

### 3.3 Methods（通过 `ref` 暴露）
- `expandAll()` / `collapseAll()`
- `expandToKey(key: string)` 展开到目标节点（逐级展开）
- `scrollToKey(key: string)` 滚动定位（平滑滚动）


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
      this.$refs.treeRef.scrollToKey(key);

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
- `scrollToKey(key)`：滚动至目标行

- 视觉建议：

  - `--active`：稳定的选中背景，不自动消失

## 9. 无障碍（基础）
- 容器：`role="tree"`
- 节点：`role="treeitem"`，可用 `aria-expanded`、`aria-level` 标记层级与展开态
- 图标按钮：`aria-label="展开/折叠"`，可隐藏到可视外但保留语义

## 10. MVP 实现清单
- [x] 树形渲染（缩进、图标占位）
- [x] 展开/折叠（高度与箭头旋转动画）
- [x] 行点击选中高亮（与展开热区隔离）
- [x] 定位 API：`expandToKey`、`scrollToKey`
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




## 与 Element-UI Tree 实现对比与优化建议（基于本仓库源码对照）

### 1）整体架构对比
- 我们的 Tree（examples/.../Tree）：
  - 轻量无 Store 架构，数据直接来自 props（`data`）；展开态用受控的 `expandedKeys.sync` + 本地 `expandedMap` 管理。
  - 递归节点用 JSX 渲染（TreeNode.vue），展开/折叠用高度过渡，提供定位 API：`expandAll/collapseAll/expandToKey/scrollToKey`。
  - 插槽：`switcher`/`label`/`suffix`/`empty`，移动端体验友好（行高、动效、可自定义开关）。
- Element-UI Tree（lib/element-ui/packages/tree）：
  - 完整的 Store + Node 模型（TreeStore、Node、util），集中管理：选中、展开、过滤、懒加载、拖拽、键盘可达性等。
  - 功能丰富：checkbox 三态、`checkStrictly`、`defaultCheckedKeys`、`filterNodeMethod`、`lazy load`、拖拽排序（`allowDrag/allowDrop`）、`accordion`、键盘导航、ARIA。

结论：Element-UI 以“数据模型 + 能力矩阵”为中心，我们以“移动端轻交互 + 受控外部状态”为中心，各有所长，服务的场景不同。

### 2）核心能力对照（节选）
- 选中/高亮：
  - 我方：`activeKey` 受控高亮，点击整行触发；无多选。
  - Element-UI：内置 `show-checkbox` 多选、父子联动与半选、`checkOnClickNode`。
- 懒加载：
  - 我方：暂不支持。
  - Element-UI：`lazy + load(node, resolve)`，含 loading 态与叶子判断。
- 过滤：
  - 我方：暂不支持。
  - Element-UI：`filterNodeMethod` + 自动展开可见分支。
- 拖拽：
  - 我方：暂不支持。
  - Element-UI：内置 DnD，放置指示线、`allowDrag/allowDrop`、结构变更 API。
- 可达性与键盘：
  - 我方：基础为触控优先，未加 ARIA/键盘导航。
  - Element-UI：`role=tree/treeitem`、`aria-expanded`、`tabindex`、上下左右及 Enter/Space 行为。

### 3）移动端体验与性能
- 我方优势：
  - 行高、点击热区、滚动定位，贴合 H5 场景；体积更小、心智负担低。
  - 展开动画使用“高度测量 + 过渡”，视觉连续；封装的定位 API 直观。
- 我方短板：
  - 缺失常见“树形”高级能力（多选、懒加载、过滤、拖拽）与基础 A11y。
  - 数据查询/定位每次临时构建 parentMap，`expandToKey` 在大数据时有额外开销。
- Element-UI 优势：
  - 能力齐全、模型稳健、事件完备，可覆盖管理后台复杂需求。
- Element-UI 短板：
  - 较重；桌面端交互为主，移动端触控体验与样式需要适配。

### 4）我们现有 Tree 的具体优劣小结
- 优点：
  - 轻量、API 简洁、移动端交互自然；插槽可定制；受控状态易于集成。
  - 提供定位相关一揽子方法（展开到、滚动到）。
- 不足：
  - 缺少：checkbox 多选/半选、过滤、懒加载、拖拽、键盘/ARIA、禁用态、批量节点操作（追加/移除/插入）。
  - 性能细节：已内置 `nodesMap/parentMap` 缓存，定位/展开更高效。

### 5）可落地的优化方向（按优先级）
1. 性能与通用性基础
   - 已完成：在 Tree 根组件初始化/`data` 变更时构建 `nodesMap` 与 `parentMap`（O(n)），供 `expandToKey/scrollToKey` 与后续高级能力复用。
   - 已完成：支持 props 字段映射：`props={ children:'children', label:'label', disabled:'disabled', isLeaf:'isLeaf', key:'key' }`。
2. 可达性与一致性
   - 补充 `role="tree/treeitem"` 与 `aria-expanded/aria-level`；可选开启基础键盘导航（↑↓选择、←→展开）。
3. 过滤 API（轻量版）
   - 增加 `filterNodeMethod(value, node)` 与 `filter(value)` 方法：仅保留匹配节点与祖先；可选高亮 label 命中片段。
4. 懒加载（最小实现）
   - 增加 `lazy + load(node, resolve)` 支持与 `node.loading` 展示；维持现有受控展开模型。
5. 选择能力（可选）
   - 逐步引入 checkbox 三态（可基于 Element-UI 的 `getChildState` 思路做轻量改造），默认关闭以维持轻量。
6. 结构操作（可选）
   - 暴露 `append/remove/insertBefore/insertAfter` 等方法，配合 `nodesMap` 实现 O(1) 查询与 O(log n) 结构调整。

### 6）实现示例片段（不改变现有 API 的基础上平滑增强）
- 在 Tree/index.vue 中缓存映射（构建一次，多处复用）
<augment_code_snippet path="examples/web-vue2/src/views/Demo1/components/Tree/index.vue" mode="EXCERPT">
````javascript
buildMaps(list, parent=null, maps={ nodesMap:{}, parentMap:{} }){
  for(const n of list||[]) {
    const k = this.getKey(n); const pk = parent ? this.getKey(parent) : null;
    if (k!=null) maps.nodesMap[k]=n;
    if (parent && k!=null && pk!=null) maps.parentMap[k]=pk;
    const ch = this.getChildren(n); if (ch && ch.length) this.buildMaps(ch, n, maps);
  }
  return maps;
}
````
</augment_code_snippet>

- 使用缓存优化 `expandToKey`
<augment_code_snippet path="examples/web-vue2/src/views/Demo1/components/Tree/index.vue" mode="EXCERPT">
````javascript
expandToKey(key){
  const pm = this.maps?.parentMap || this.buildMaps(this.data).parentMap;
  const map = { ...(this.expandedMap||{}) };
  for(let cur=pm[key]; cur; cur=pm[cur]) map[cur]=true;
  const next = Object.keys(map);
  this.expandedMap = map; this.$emit('update:expandedKeys', next);
}
````
</augment_code_snippet>

- 基础 ARIA（容器与节点示意）
<augment_code_snippet path="examples/web-vue2/src/views/Demo1/components/Tree/index.vue" mode="EXCERPT">
````html
<div class="tree" role="tree">
  <tree-node v-for="n in data" :key="n.key" :node="n" :level="1" />
  <div v-if="!data||!data.length" class="tree__empty" role="note">无数据</div>
</div>
````
</augment_code_snippet>

- 过滤方法签名建议（与 Element-UI 对齐风格）
<augment_code_snippet path="examples/web-vue2/src/views/Demo1/components/Tree/index.vue" mode="EXCERPT">
````javascript
props:{ filterNodeMethod: Function },
methods:{
  filter(value){
    // 遍历 data，设置 node.__visible 与展开祖先；命中可标记 node.__matched
  }
}
````
</augment_code_snippet>

### 7）为何不直接“引入”Element-UI Tree
- 我们重点场景在移动端，所需能力与交互取舍不同；直接引入将显著增加体积与复杂度。
- 通过“有选择地借鉴”其 Store/Node 思路，可在保持轻量的前提下补齐关键能力（如三态选择、懒加载、过滤），并保留我们现有的移动端体验与 API。

—— 以上建议均可逐步实施，优先做“映射缓存 + ARIA + 过滤（轻量）”，风险小、收益大；随后按业务需要引入懒加载与多选能力。



## 移动端定位与功能边界（务必遵守）

- 必选能力（Must-haves）
  - 展开/折叠（含轻量动画，可关闭）；受控 expandedKeys 同步
  - 行点击选中高亮（activeKey 受控），可关闭 selectable
  - 定位相关方法：expandToKey / scrollToKey
  - 基础插槽：switcher / label / suffix / empty
  - 轻量样式变量与 44px 触控热区，单/多行省略策略
- 优选能力（Should-haves）
  - 可选的轻量 filter(value) + filterNodeMethod(value, node)
  - 基础 ARIA 语义（role/aria-expanded），可选键盘导航（默认关闭）
- 非目标（本期与中期不做，或默认关闭）
  - 拖拽排序/跨树拖拽、复杂右键菜单、行内编辑
  - 重型数据模型（完整 Store/Node）与深度联动（默认不引入）
  - 虚拟滚动（可作为特定大数据场景的独立增强组件）
  - 与桌面端一致的全量 API 兼容（不强追 element-ui 全量）

说明：始终以“移动端轻交互 + 轻量心智 + 清晰边界”为原则，避免引入桌面端复杂能力造成体积和认知负担膨胀。

## 健壮性 / 扩展性 / 易读性评估与建议

### 健壮性（Robustness）
- 输入数据健壮：
  - 容错 children: null/undefined/非数组；无 key 或重复 key 时给出 dev-only 警告且跳过地图缓存
  - 不变性要求：不直接改写外部 data；内部仅读 + 自有状态（expandedMap 等）
- 交互边界：
  - 选中与展开热区分离；滚动阈值防误触；transition 可全局关闭
  - CSS.escape 兼容性兜底；scrollIntoView 失败 fallback 到 el.scrollIntoView(true)
- 性能/风格：
  - 构建 nodesMap/parentMap 一次 O(n)，后续 O(1) 查询；避免深度 watch
  - 批量更新（一次性 set expandedMap 后再 emit），减少抖动
- 开发时提示：
  - dev 环境下对重复 key、深层循环引用、超长 label（建议截断）给出 console.warn

### 扩展性（Extensibility）
- 轻量 Store/Adapter 思路：保持当前受控 API 不变，引入内部“可选的”适配层，承载后续拓展（checkbox、lazy、filter）。
<augment_code_snippet mode="EXCERPT">
````javascript
// 轻量适配层接口（示意）
export function createTreeAdapter({ propsMap, on }){
  return {
    normalize(data){ /* 字段映射与预处理 */ },
    maps(data){ /* nodesMap/parentMap 构建 */ },
    hooks: on || {} // beforeToggle/afterToggle/beforeSelect/...
  };
}
````
</augment_code_snippet>
- 可插拔的增强：
  - filter 插件（仅标记可见/命中，不改数据）
  - lazy 插件（load(node, resolve) + loading 态）
  - checkbox 插件（复用 getChildState 思路，默认关闭）
- API 稳定：保持 props/事件命名稳定；新增能力以可选 props 启用，默认不改变既有行为

### 易读性（Readability）
- 结构：index.vue 仅负责容器与受控逻辑；节点渲染留在 TreeNode（JSX），必要时拆辅助渲染函数
- 命名与注释：统一 slotProps 命名（node, level, expanded）；仅在边界与关键路径处添加简短有效注释
- 工具与样式：将通用工具抽到 utils（如 buildMaps）；样式使用 BEM + 变量，避免魔法数
- 一致性：事件 payload 结构一致（{ activeKey }、{ expandedKeys }），便于外部集成

## 可借鉴的 Element-UI 设计点（适配后引入）
- 数据索引与路径：
  - nodesMap 的注册/注销机制；getNode(key)/getNodePath(data) 的接口语义
- 过滤与签名：
  - filterNodeMethod(value, data, node) 的函数签名与仅展开可见祖先的策略
- 三态选择的判定：
  - getChildState 的半选/全选/全未选计算逻辑，可裁剪后用于轻量 checkbox 插件
- 事件与方法命名：
  - setCheckedKeys/getCheckedKeys、updateKeyChildren 等命名风格可作为参考，保持语义直观

## 分阶段落地计划（建议）
- 阶段 1（优先）
  - 构建 nodesMap/parentMap 缓存；优化 expandToKey/scrollToKey O(1) 查询（已完成）
  - 补充 ARIA 语义（role/aria-expanded）；可选开启键盘导航（默认关闭）
  - 引入轻量 filter(value) + filterNodeMethod（不改数据，仅控制可见/展开）
- 阶段 2（按需）
  - props 字段映射（props: { key/label/children/isLeaf }）（已完成）
  - 懒加载最小实现：lazy + load(node, resolve) + node.loading 显示
- 阶段 3（可选）
  - 轻量 checkbox（三态、父子可选联动，默认关闭）
  - 结构操作 API：append/remove/insertBefore/insertAfter（在不引入完整 Store 的前提下实现）

验收指标（Definition of Done）
- 体积控制：新增能力默认关闭时打包体积增长 < 3KB（gzip）
- 性能：1k 节点下展开/定位平均 < 16ms，首屏渲染无明显卡顿
- API 稳定：现有 Demo 行为不变；新增能力通过 props 显式开启
- 可维护性：核心文件注释覆盖关键边界，工具函数单测覆盖主要分支
