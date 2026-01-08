# PDF 组件状态管理重构方案（store-refactor-01）

> 目标：解决当前基于 Vuex 的 pdfReaderCore 模块在生命周期、多实例场景、耦合度等方面的问题，为后续组件库化和复用打好基础。

## 1. 现状分析

### 1.1 当前基于 Vuex 的 pdfReaderCore 模块实现方式

- 模块位置：`examples/web-vue2/src/components/pdf/core/store/index.js`
- 在全局 store 中的注册方式：
  - `examples/web-vue2/src/store/index.js`
  - 以固定命名空间 `pdfReaderCore` 注册：
    - `modules: { pdfReaderCore: pdfReaderCoreModule }`
- 模块结构：
  - `initState` 描述初始状态：
    - `pdfDocument` / `documentInfo` / `metadata` / `error`
    - `currentPage` / `scale` / `baselineScale`
    - `pendingQueue`（统一 loading 队列）
  - `state = cloneDeep(initState)`：模块级单例状态对象
  - `mutations`：`SET_DOCUMENT`、`SET_CURRENT_PAGE`、`SET_SCALE`、`RESET_STATE` 等
  - `actions`：`loadDocument`、`_handleLoadDocument`、`goToPage`、`nextPage`、`prevPage` 等
  - `getters`：`isDocumentLoaded`、`navigationState`、`zoomState`、`isLoading` 等
- 组件层使用方式：
  - `PdfViewport` / `PdfPage` 等组件通过 `mapState` / `mapGetters` / `mapActions` / `mapMutations` 直接绑定 `pdfReaderCore` 命名空间。

### 1.2 识别出的具体问题

1. **生命周期与组件不匹配**
   - Vuex 模块在应用级别创建，生命周期贯穿整个应用运行期。
   - PDF 组件销毁时调用 `RESET_STATE` 只是重置状态，并不会真正销毁 store 或卸载监听。
   - 若有其他组件仍在使用该模块，其状态会被“无意重置”。

2. **多实例场景下必然产生冲突**
   - `pdfDocument` / `currentPage` / `scale` 等状态在模块中是全局唯一字段。
   - 多个 `<pdf-viewport>` 实例共享同一模块：
     - 后加载的实例会覆盖前一个实例加载的文档和页面信息。
     - 任何实例翻页、缩放等操作会影响所有使用该模块的组件。
     - 任一实例销毁时调用 `RESET_STATE` 会清空所有实例的状态。

3. **与全局 Vuex 强耦合**
   - 组件层写死了 `mapState('pdfReaderCore')` 等依赖：
     - 业务方必须使用 Vuex，且必须以同样的命名空间注册模块。
     - 不便于在非 Vuex 项目（或其他状态管理方案）中复用。
   - 核心业务逻辑紧耦合在 Vuex actions/mutations 里，不利于做无框架的单元测试。

4. **loading 队列为全局而非实例级**
   - `pendingQueue` 与 `isLoading`/`loadingMessage` 为模块级队列。
   - 多实例加载不同文档时，loading 状态会混合到同一队列中，难以简单做到“仅展示当前实例的加载态”。

### 1.3 问题根本原因

- **单例状态**：模块级 `state` 只创建一次，所有组件共享同一份状态。
- **状态归属不清**：
  - 文档与视图状态（`pdfDocument`、`currentPage`、`scale` 等）本质上是“组件实例级”的，却被放入“应用级”的 Vuex 模块中。
- **实现层与框架强绑定**：
  - 核心逻辑全部以 Vuex 模块的形式存在，缺乏一层独立的“核心 store 抽象”。

## 2. 技术调研

### 2.1 Element-UI Table 组件内部状态管理模式

- 位置：`lib/element-ui/packages/table/src`。
- 关键点：
  - 引入 `createStore` 和 `mapStates` 两个工具（`store/helper.js`）：
    - `createStore(table, initialState)`：为 **每个 `<el-table>` 实例创建一份独立 Store**。
    - `mapStates(mapper)`：将内部 `store.states` 映射为组件的 computed 属性。
  - 在 `table.vue` 的 `data()` 中：
    - 为当前 table 实例创建 `this.store = createStore(this, { ...initial })`；
    - 创建 `layout = new TableLayout({ store, table: this })`；
    - 返回包含 `layout`、`isHidden` 等本地 UI 状态的对象。
  - 在 `computed` 中通过 `mapStates` 使用内部状态，而不是 Vuex：
    - 例如 `selection`、`columns`、`tableData` 等。

- 结果：
  - 每个 `<el-table>` 组件实例都有一套独立、封装的状态机。
  - 状态生命周期自然与组件实例一致：创建于 `data()`，销毁于组件卸载。
  - 对外 API 完全不依赖 Vuex，使用者只要传 `data`/`columns` 即可。

### 2.2 Vant 组件库的状态管理策略（概括）

- 多数组件采用 **本地 data + props + 事件** 的组合：
  - 状态和行为被封装在组件内部，通过 `v-model`、回调事件向外暴露变更。
- 少数复杂组件会有内部的“微型 store”或通过 `provide/inject` 共享状态给子组件，但仍然是 **组件实例级** 而非全局 Vuex。
- 公共状态（如国际化、主题配置）通过插件/全局配置对象管理，不用于具体业务组件的运行时状态。

### 2.3 组件内 store vs 全局 Vuex 对比

| 维度               | 组件内 store（Element Table 风格）                   | 全局 Vuex 模块（当前方案）                         |
|--------------------|------------------------------------------------------|----------------------------------------------------|
| 状态作用域         | 组件实例级，每实例一份                               | 应用级，全局唯一                                   |
| 生命周期           | 随组件创建/销毁，天然一致                           | 与应用同寿命，需要手动 RESET                       |
| 多实例支持         | 天然支持，每个实例互不影响                           | 容易冲突，需要人为区分命名空间或实例 ID           |
| 与业务的耦合度     | 低，组件可在任意项目中复用                           | 高，要求接入特定 Vuex 模块和命名空间               |
| 可测试性           | 高，可对核心 store 做无框架单测                     | 需要搭 Vuex 环境，测试成本更高                     |
| 调试/Devtools 体验 | Vuex Devtools 稍弱，但可通过日志、debug 钩子弥补    | Vuex Devtools 友好                                 |

## 3. 重构方案设计

### 3.1 方案一：完全组件内 store（去 Vuex 依赖）

**思路**：
- 抽象出一个纯 JS 的 `PdfReaderStore`（或 `createPdfReaderStore` 工厂）：
  - 内部维护 `state`、暴露方法：`loadDocument`、`goToPage`、`setScale`、`zoomIn` 等；
  - 移植/复用当前 Vuex module 中的业务逻辑，但去掉对 Vuex 的依赖。
- 在 `PdfViewport` 的 `data()` 中为每个实例创建 `this.pdfStore = createPdfReaderStore()`。
- `PdfPage` 等子组件通过 `provide/inject` 或 props 接收 `pdfStore`，从中读取状态、调用方法。

**优点**：
- 彻底解决生命周期和多实例冲突问题，模型简单、直观。
- 完全摆脱对 Vuex 的硬依赖，组件库复用性更强。
- 核心逻辑由 Vuex 解耦，更易做纯 JS 单元测试。

**缺点**：
- 现有基于 Vuex 的 demo 和使用方式需要较大调整。
- 失去 Vuex Devtools 的天然支持（可通过自定义日志中间层部分弥补）。

**实现复杂度**：中等偏高（需要一次性移动/重构核心逻辑）。

**迁移成本**：
- 对 demo 项目：中等（需要调整 store 注入和组件绑定方式）。
- 对计划中的外部使用：更利于长期维护。

### 3.2 方案二：混合模式（核心 store + 可选 Vuex 适配层）

**思路**：
- 在方案一的基础上再加一层：
  - 将业务逻辑沉到 `PdfReaderStore` 核心类中；
  - 提供一个 `createPdfReaderVuexModule()`：
    - 内部利用 `PdfReaderStore`，把其方法包装成 Vuex 的 `actions/mutations/getters`；
    - 允许继续以 `pdfReaderCore` 模块的形式被注册到全局 store 中。
- 组件层可以有两种接入方式：
  - A. 组件自己创建 `pdfStore`（推荐，用于库化场景）；
  - B. 某些现有页面/业务依旧通过 Vuex module 提供状态（用于兼容或跨组件联动）。

**优点**：
- 保留 Vuex 场景的兼容性和 Devtools 体验。
- 内部逻辑统一归于核心 store，不会出现“双份逻辑”。
- 可以渐进迁移：先把逻辑抽到核心 store，再逐步切组件接入方式。

**缺点**：
- 体系略复杂，多了一层“适配”抽象，需要在文档中清晰说明两种用法。

**实现复杂度**：中等（相对方案一增加一层轻量包装）。

**迁移成本**：
- 对现有 demo：较低，可先维持 Vuex 接入不变，仅更换其内部实现。
- 对未来库使用者：可以根据项目选择是否接入 Vuex 模式。

### 3.3 方案三：改进现有 Vuex 模块（命名空间动态化）

**思路**：
- 保持 Vuex 模式不变，但引入“实例 ID 概念”：
  - 将 `pdfReaderCore` 拆分为按实例 ID 分桶的状态；
  - 各组件在挂载时生成一个 `instanceId`，所有 actions/mutations 都带上该 ID；
  - 状态存储结构变为 `state.instances[id] = { ...instanceState }`。

**优点**：
- 粗暴但兼容：保留 Vuex，借助一个“ID 维度”解决多实例冲突。
- 对现有代码改动集中在 store 和组件调用层，不需要引入新的 store 抽象。

**缺点**：
- 生命周期问题依然存在：
  - 需要在组件销毁时手动删除 `instances[id]`；
  - 若漏删或业务方误用，容易造成内存泄漏。
- 状态结构复杂化，调试成本提高。
- 组件仍然与 Vuex 强耦合，不利于作为库单独发布。

**实现复杂度**：中等（大量 actions/mutations 需要加上 `instanceId` 处理）。

**迁移成本**：
- 对现有 demo：可控但易出细节问题。
- 从长期看不利于简化架构。

### 3.4 方案对比

综合对比：

- 若目标是打造 **可复用的 PDF 组件库**，并支持多实例、弱耦合，**方案二（核心 store + 可选 Vuex 适配）** 更平衡：
  - 既解决根本问题，又兼容现有 Vuex 使用；
  - 架构清晰，长期维护成本低。
- 方案一适合**彻底去 Vuex 化**的场景；
- 方案三更像是对现有实现的“打补丁”，不建议作为长期方案。

## 4. 推荐的实施路线

### 4.1 MVP 阶段目标

- 在不破坏现有 demo 的前提下：
  1. 抽象出 `PdfReaderStore` 核心类/工厂，承载主要业务逻辑；
  2. 在某一个 pdf 组件变体（如 `mobile/simple` 或 `desktop/complex`）上落地 **组件内 store 接入**；
  3. 验证：同一页面渲染多个 PdfViewport 时，实例间状态完全隔离。

### 4.2 MVP 实施步骤（建议）

1. **抽取核心 store**
   - 新建 `examples/web-vue2/src/components/pdf/core/store/coreStore.js`（命名可调整）：
     - 定义 `createPdfReaderStore()`：内部包含 `state`、业务方法和简单的订阅机制（可选）。
     - 从 `pdfReaderCore` Vuex 模块中迁移逻辑（`loadDocument`、`goToPage`、`zoomIn` 等）。

2. **在单一路径上接入组件内 store**
   - 选择如 `mobile/simple` 或 `desktop/complex` 路径作为试点：
     - 在对应的 `PdfViewport` 中：
       - 在 `data()` 里创建 `this.pdfStore = createPdfReaderStore()`；
       - 使用 `provide/inject` 或 props 将 `pdfStore` 传给子组件；
     - 在 `PdfPage` 中用 `pdfStore.state.pdfDocument` / `pdfStore.getPage()` 替代 `mapState('pdfReaderCore')` / `mapActions('pdfReaderCore')`。

3. **增加基础测试与 demo 验证**
   - 编写针对 `createPdfReaderStore()` 的单元测试：
     - 文档加载、翻页、缩放、错误处理等核心行为；
   - 在 demo 页面中同时挂载两个 PdfViewport，手动验证互不干扰。

4. **视情况增加 Vuex 适配层**
   - 新增 `createPdfReaderVuexModule(pdfStoreFactory)`：
     - 作为对现有 `pdfReaderCoreModule` 的替代实现；
     - Vuex actions 内部调用 `pdfStore` 对应方法，实现逻辑复用。

### 4.3 完整蓝图与长期规划

- 最终形态：
  - `PdfReaderStore` 成为唯一的核心业务状态抽象；
  - 组件优先使用“组件内 store”接入方式；
  - Vuex 模块仅是一个可选适配层，根据实际业务需要使用。

- 渐进演进路线：
  1. 核心 store 抽取 + 单路径试点；
  2. 逐步将其他 pdf 组件路径迁移到组件内 store；
  3. 视业务需求决定是否保留/强化 Vuex 适配层能力。

### 4.4 向后兼容性考虑

- 对现有 demo：
  - 在有 Vuex 适配层的前提下，可尽量保持 `mapState('pdfReaderCore')` 等接口不变，仅替换其内部实现；
  - 对外文档中标明：Vuex 接入为“可选增强”，但推荐直接使用组件内 store 版本。

## 5. 技术细节

### 5.1 核心 API 设计草图

- `createPdfReaderStore(options?)`：
  - 返回 `{ state, loadDocument, getPage, goToPage, nextPage, prevPage, setScale, setBaselineScale, zoomIn, zoomOut, goToDestination, resolveDestinationToPage, runWithLoadPending, subscribe? }`。
  - `state` 结构基本等同于现有 Vuex `state`。

- `PdfViewport` 组件：
  - 在 `data()` 中创建 `this.pdfStore = createPdfReaderStore()`。
  - 使用 `provide('pdfStore', this.pdfStore)` 将 store 暴露给子组件。

- `PdfPage` 组件：
  - 使用 `inject: ['pdfStore']` 获取 store。
  - 从 `pdfStore.state` 读取 `pdfDocument`，调用 `pdfStore.getPage()` 渲染页面。

### 5.2 关键代码示例（极简示意）

```js
// coreStore.js
export function createPdfReaderStore() {
  const state = { /* 基于 initState 的克隆 */ };

  async function loadDocument({ getDocumentOptions, onProgress } = {}) {
    // 迁移自 _handleLoadDocument / loadDocument 逻辑
  }

  function goToPage(pageNumber) { /* ... */ }

  return { state, loadDocument, goToPage /* ... */ };
}
```

```js
// PdfViewport.vue （示意）
export default {
  data() {
    this.pdfStore = createPdfReaderStore();
    return { /* ... */ };
  },
  provide() {
    return { pdfStore: this.pdfStore };
  },
};
```

### 5.3 测试策略

1. **核心 store 单元测试**
   - 对 `createPdfReaderStore()`：
     - 校验状态初始化正确；
     - `loadDocument` 在正常与异常情况的行为；
     - 翻页、缩放等边界条件校验（页码越界、最小/最大缩放）。

2. **组件集成测试（可选）**
   - 在 Vue 测试环境中挂载 PdfViewport + PdfPage：
     - 验证渲染正确、事件流正确；
     - 同一测试中挂载多个实例，验证互不影响。

3. **回归验证现有 Vuex 模式（若保留）**
   - 为 Vuex 适配模块增加基本单测，确保其行为与核心 store 保持一致。

## 6. Store 实现模式补充说明（结合 Element-UI Table）

本节补充说明 Element-UI Table 实际采用的 store 方案，并结合本项目的需求，对几种可选实现模式做对比与选型建议。

### 6.1 Element-UI Table 的 Store 实现模式

Element-UI Table 的 store 位于 `lib/element-ui/packages/table/src/store/`，核心由两部分组成：

1. **Watcher：基于 `Vue.extend` 的内部 Vue 实例**
   - 文件：`watcher.js`
   - 结构：
     - `export default Vue.extend({ data() { return { states: { ... } }; }, methods: { ... } })`
     - `data()` 返回一个包含 `states` 字段的对象，`states` 持有所有表格内部状态（columns、selection、sorting 等），这些字段都是响应式的。
     - 各种行为（更新列、排序、过滤、选择、树形展开等）封装在 `methods` 里。

2. **mutations + commit：类 Vuex 的轻量封装**
   - 文件：`index.js`
   - 通过给 `Watcher.prototype` 挂载 `mutations` 和 `commit`：
     - `mutations`：一个以 `name -> 函数(states, payload)` 映射的普通对象，例如 `setData`、`insertColumn`、`sort`、`filterChange` 等；
     - `commit(name, ...args)`：根据 name 找到对应 mutation，并以 `this.states` 作为第一个参数调用，用法类似 `this.store.commit('setData', data)`。
   - 这是一个“迷你版 Vuex”：
     - `states` ≈ Vuex `state`
     - `mutations` ≈ Vuex `mutations`
     - `commit` ≈ Vuex `commit`

3. **createStore：为每个 `<el-table>` 实例创建一份独立 store**
   - 文件：`helper.js`
   - `createStore(table, initialState)`：
     - `const store = new Store(); // Store = Watcher`
     - `store.table = table;`（反向引用 table 组件实例，便于在 store 中调用 `this.table.$emit(...)` 等）；
     - 将 `initialState` 合并进 `store.states`。
   - 在 `table.vue` 的 `data()` 中：
     - `this.store = createStore(this, { rowKey, defaultExpandAll, ... });`
     - 然后通过 `mapStates` 工具，将 `store.states.xxx` 暴露为 table 组件自身的 `computed`：
       - 如 `selection: 'selection'` → `this.selection === this.store.states.selection`。

**小结：**

- Table 的 store 本质是一个**不挂载到 DOM 的 Vue 实例（VM）**，由 `Vue.extend` 创建；
- 所有内部状态集中在 `this.states` 上，由 `data()` 提供，因此是响应式的；
- 行为方法放在 `methods` + `mutations` 上，通过 `commit` 统一入口；
- 每个 `<el-table>` 实例都有自己的一份 `store`，互不影响，天然支持多实例；
- UI 组件本身通过 `mapStates` 将 `store.states` 投影为自身的 computed 属性。

### 6.2 几种 Store 实现方案对比

结合目前 pdf 组件的需求（组件内多实例、生命周期对齐、降低对 Vuex 的耦合），可以考虑以下几种 store 设计方案：

#### 6.2.1 方案 A：基于 `Vue.extend` 的 VM Store（Element-UI Table 同款）

**实现思路：**

- 定义 `PdfStore = Vue.extend({ data() { return { states: { ...pdfState } }; }, methods: { ... } })`；
- 定义 `createPdfStore(viewer, initialState)`：
  - `const store = new PdfStore();`
  - `store.viewer = viewer;`（可选：类比 table 的 `store.table = table`，方便在 store 内部通过 viewer 发事件）；
  - 合并 `initialState` 到 `store.states`；
- 在 `PdfViewport` 的 `data()` 中为每个实例创建 `this.pdfStore = createPdfStore(this)`；
- `PdfViewport` / `PdfPage` 通过 `this.pdfStore.states.xxx` 读取状态，通过 `this.pdfStore.someMethod()` 修改状态；
- 如有需要，也可以像 element-ui 那样添加 `mutations + commit` 层，使 `this.pdfStore.commit('SET_CURRENT_PAGE', page)` 成为统一入口。

**优点：**

- 完全复用 Vue 的响应式系统和生命周期，写法与组件高度一致；
- 与 Element-UI Table 的模式保持一致，便于团队成员理解和迁移；
- 每个 PdfViewport 实例都有自己的 VM store，天然支持多实例、状态隔离；
- store 内部可以使用 `watch` / `computed`（通过 mixin 或额外扩展）做更复杂的派生逻辑。

**缺点：**

- store 仍然强依赖 Vue 运行环境，本质上是“隐形 Vue 组件”，调试和心智负担略高；
- DevTools 中会多出一批“内部 VM”，可能会在大规模使用时增加噪声；
- 对于“核心业务逻辑希望尽量框架无关”的目标来说，耦合程度略高。

#### 6.2.2 方案 B：`Vue.observable` + 轻量纯对象 Store（推荐）

**实现思路：**

- 使用 `Vue.observable` 对一个普通 `state` 对象做响应式包装：
  - `const state = Vue.observable(cloneDeep(initState));`
- 将原 Vuex `mutations/actions` 抽成普通函数，闭包中直接读写 `state`；
- 将需要的“派生状态”暴露为：
  - 要么是对象上的 `get` 访问器（`get navigationState() { ... }`）；
  - 要么由组件侧的 computed 基于 `state` 计算；
- 对外统一通过 `createPdfReaderStore()` 返回 `{ state, actions, getters, commit }` 这样的纯 JS 对象。

**优点：**

- 实现简单、语义清晰：`state` 是响应式对象，`actions` / `mutations` 是纯函数；
- 与 Vuex 的概念高度接近，但完全不依赖 Vuex，便于迁移和复用；
- 对测试非常友好：不需要构造 Vue 实例，直接在 Node 环境中对 store 做单元测试即可；
- Vue 在这里仅扮演“让 state 响应式”的角色，业务层逻辑基本框架无关。

**缺点：**

- 相比方案 A，少了 `watch` / `computed` 等 VM 级别能力（不过这些通常可以在组件侧或 store 对象上用函数方式弥补）；
- 与 Element-UI Table 的实现风格略有不同，需要团队理解一套新的“轻量 store”写法。

#### 6.2.3 方案 C：纯 JS Store + 由组件侧负责响应式

**实现思路（只作参考，不作为首选）：**

- `createPdfReaderStore()` 返回一个**非响应式**的纯 JS 对象 `{ state, actions }`；
- 组件侧在 `data()` 中把 `state` 解构进自己的 data 或 computed：
  - 例如在组件中维护本地 `data`，并在 store 变更时手动同步或通过事件通知；

**优缺点：**

- 优点：store 完全脱离 Vue，业务逻辑 100% 框架无关；
- 缺点：
  - 需要自己维护“store → 组件”同步的桥接逻辑，增加模版代码；
  - 容易出现忘记同步、更新时序问题；
  - 对目前已经依赖 Vue 响应式的 pdf 组件来说，改造性价比不高。

综合来看，本项目在 Vue2 生态下，更推荐在 **方案 B（`Vue.observable` 轻量 store）** 和 **方案 A（Vue.extend VM store）** 之间选择；其中：

- **若希望最大程度贴近 Element-UI Table 的实现风格**，便于“照抄 + 类比学习”，可以采用方案 A；
- **若更看重核心逻辑的可测试性与框架无关性**，以及未来平滑迁移到 Vue3 / 其他框架，则方案 B 更合适。本文件前文设计的 `createPdfReaderStore` 即偏向于方案 B 的形态。

