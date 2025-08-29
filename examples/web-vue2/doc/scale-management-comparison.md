# PDF 缩放（scale）管理对比与 Vue2 优化建议

本文对比 web/ 官方查看器与 examples/web-vue2 的缩放与缩放模式（auto/page-fit/page-width/page-actual 等）实现，结合两者优点，给出在 Vue2 中的落地优化建议与实施要点。

## 1. 总览
- 官方 viewer（web/）特点：
  - 统一常量与边界：DEFAULT_SCALE_VALUE="auto"、DEFAULT_SCALE_DELTA=1.1、MIN/MAX_SCALE=0.1/10（web/ui_utils.js）。
  - 数据模型分离：currentScale（数值）与 currentScaleValue（字符串或数值，如 "page-fit"、1.25），集中在 pdf_viewer.js，内部根据值计算并派发事件（scalechanging）。
  - 预设模式完备："auto"、"page-fit"、"page-width"、"page-height"、"page-actual"；在 resize/方向变化等情境下可“重用”字符串模式重新计算（web/app.js）。
  - 事件驱动：EventBus -> scalechanging -> toolbar/渲染联动；可延时绘制（drawingDelay），减少频繁缩放的抖动。
  - CSS 变量配合：通过 --scale-factor 等变量驱动样式与渲染（pdf_viewer.js）。

- Vue2 示例（examples/web-vue2）特点：
  - UI 控件：PdfZoomControl.vue 提供 50%/100%/150%/200% + "page-width"/"page-fit" 入口，事件 set-scale / set-scale-mode。
  - 状态管理：Vuex viewer 模块存储 scale 与 scaleMode（'auto'/'page-width'/…），但 scaleMode 的实际计算委托组件完成（viewer.js）。
  - 计算位置：PdfViewerCore.vue 在容器 resize 时执行 calculateOptimalScale（按容器与第1页尺寸取 min(width,height) 并裁剪到 [0.5,3.0]），再 applyScale。
  - 调度链路：pdf-services.js 的 setScale 校验范围并回调组件 onScaleChanged -> 更新 currentScale -> 触发页面刷新。

## 2. 关键差异
- 预设模式覆盖：
  - 官方：模式完整，且数值/字符串统一入口（currentScaleValue setter -> #setScale）。
  - Vue2：UI 暴露了部分模式，但实际计算主要是“自适应一套”，未区分自动、适合宽度、高度、实际大小等精细逻辑。

- 缩放步进策略：
  - 官方：乘法步进（DEFAULT_SCALE_DELTA=1.1），更符合视觉与高倍缩放手感；并限制到 MIN/MAX。
  - Vue2：加法步进（默认 +0.25/-0.25），在高倍下跳变过快、在低倍下不够细腻。

- 事件与重计算：
  - 官方：存储 currentScaleValue（字符串模式），在容器变化时“重设相同字符串”以重新计算真实数值（app.js）。
  - Vue2：多数情况下计算一次并写死数值；容器变化只跑“自动适配”逻辑，不区分上一次是否为 page-width/page-fit。

- 边界与常量：
  - 官方：0.1–10.0、MAX_AUTO_SCALE=1.25、SCROLLBAR_PADDING、VERTICAL_PADDING 等常量统一。
  - Vue2：使用临时范围（0.5–3.0）与自定义 padding，缺少统一常量与跨处复用。

- 绘制调度：
  - 官方：#setScaleUpdatePages 支持 drawingDelay，协调频繁缩放时的渲染压力。
  - Vue2：缩放直接触发页面刷新，缺少节流/延迟策略。

## 3. Vue2 侧的优化建议（由易到难）

### 3.1 必做（MVP）
1) 统一缩放常量
- 在 examples/web-vue2 建立统一常量：
  - DEFAULT_SCALE_VALUE = 'auto'
  - DEFAULT_SCALE_DELTA = 1.1
  - MIN_SCALE = 0.1, MAX_SCALE = 10.0
  - MAX_AUTO_SCALE = 1.25（按需，可先不公开）
- 所有缩放入口（工具栏、手势、快捷键）统一引用。

2) 双通道值：分离 scale 与 scaleValue
- 在 Vuex viewer 模块新增 state.currentScaleValue（string|number），保存用户的“设定值”（如 'page-width' 或 1.25）。
- setScaleValue(value) 与 setScale(numeric) 分离：
  - setScaleValue 接受字符串或数值；若为字符串，计算出数值后再分发 setScale。
  - resize 时，如 currentScaleValue 为字符串，重新计算并应用。

3) 完善预设模式计算
- 在核心服务新增 computeScaleByValue(value, containerSize, pageSize, rotation) 方法：
  - 'page-actual' => 1
  - 'page-width' => containerWidth / pageWidth
  - 'page-height' => containerHeight / pageHeight
  - 'page-fit' => min(page-width, page-height)
  - 'auto' => 根据页面纵横比选择接近 page-width 的策略，并限制到 MAX_AUTO_SCALE（可简化为 min(page-width, MAX_AUTO_SCALE)）
- 注意：需要考虑滚动条/内边距（可引入 SCROLLBAR_PADDING、VERTICAL_PADDING）。

4) 改为乘法步进缩放
- zoomIn(scale *= DEFAULT_SCALE_DELTA)、zoomOut(scale /= DEFAULT_SCALE_DELTA)，并 clamp 到 [MIN_SCALE, MAX_SCALE]；四舍五入到 2 位小数，避免小数噪音。

5) resize 时“重用”模式
- PdfViewerCore 的 ResizeObserver 回调中：
  - 若 currentScaleValue 为字符串，则 compute + setScale。
  - 若 currentScaleValue 为数值，则可选择不动或提供“保持视觉位置”策略。
- 加入 100–200ms 防抖，避免频繁计算。

6) 事件化
- 在组件层派发 'scalechanging' 事件（包含 presetValue 与 scale）供 UI 同步显示；与官方事件名保持一致，便于迁移与理解。

### 3.2 进阶（可分阶段推进）
1) drawingDelay 策略
- 连续缩放（滚轮/手势）时，先更新 UI 与 CSS 尺寸，延迟实际重绘（如 120–200ms），若期间再次缩放则合并。

2) 渲染负载控制
- 仅重绘当前可视页与相邻页，队列化其余页（需要配合现有渲染管线评估）。

3) 持久化
- 将 currentScaleValue 与 scrollMode 等写入 localStorage（或现有 store 机制），下次打开恢复。

4) 旋转适配
- computeScaleByValue 时考虑 rotation（90/270 时交换 pageWidth/pageHeight）。

5) 质量与性能平衡
- 高 DPI 下考虑 canvas 输出像素与 CSS 缩放的折中；参考官方 OutputScale 实现。

## 4. 接口与伪代码示例

### 4.1 统一常量（constants/scale.js）
```js
export const DEFAULT_SCALE_VALUE = 'auto';
export const DEFAULT_SCALE_DELTA = 1.1;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10.0;
export const MAX_AUTO_SCALE = 1.25;
export const SCROLLBAR_PADDING = 40;
export const VERTICAL_PADDING = 5;
```

### 4.2 计算函数（core/scale-service.js）
```js
export function computeScaleByValue(value, { width, height }, { pageWidth, pageHeight, rotation = 0 }) {
  const rotated = rotation === 90 || rotation === 270;
  const w = rotated ? pageHeight : pageWidth;
  const h = rotated ? pageWidth : pageHeight;
  const scaleWidth = width / w;
  const scaleHeight = height / h;
  if (typeof value === 'number') return value;
  switch (value) {
    case 'page-actual': return 1;
    case 'page-width': return scaleWidth;
    case 'page-height': return scaleHeight;
    case 'page-fit': return Math.min(scaleWidth, scaleHeight);
    case 'auto': default: return Math.min(scaleWidth, MAX_AUTO_SCALE);
  }
}
```

### 4.3 Vuex（简化草案）
```js
state: {
  scale: 1.0,
  currentScaleValue: 'auto', // string | number
  minScale: 0.1,
  maxScale: 10.0,
},
actions: {
  setScaleValue({ dispatch, commit }, value) {
    commit('SET_SCALE_VALUE', value);
    return dispatch('recomputeScaleFromValue');
  },
  recomputeScaleFromValue({ state, commit, rootGetters }) {
    const container = /* 从组件/服务获取容器宽高 */;
    const page = /* 获取当前页实际尺寸与 rotation */;
    const s = computeScaleByValue(state.currentScaleValue, container, page);
    const clamped = Math.min(Math.max(s, state.minScale), state.maxScale);
    commit('SET_SCALE', round2(clamped));
  },
  zoomIn({ state, dispatch }) {
    const next = Math.min(state.scale * DEFAULT_SCALE_DELTA, state.maxScale);
    return dispatch('setScaleValue', round2(next));
  },
  zoomOut({ state, dispatch }) {
    const next = Math.max(state.scale / DEFAULT_SCALE_DELTA, state.minScale);
    return dispatch('setScaleValue', round2(next));
  },
}
```

## 5. 落地顺序建议
1) 增加常量与 computeScaleByValue（不改现有渲染管线）。
2) Vuex 增加 currentScaleValue 与 setScaleValue，PdfZoomControl 直接发 set-scale-value（字符串/数值皆可）。
3) PdfViewerCore 的 ResizeObserver 增加“若为字符串模式则重算”；加入防抖。
4) 切换 zoomIn/zoomOut 为乘法步进；确保 UI 数字显示四舍五入。
5) 增加 scalechanging 事件派发，工具栏联动显示 preset 与实际数值。
6) 观察性能，再考虑 drawingDelay 与“仅渲染可视页”。

## 6. 风险与兼容性
- 只做“数值统一 + 模式重算 + 乘法步进”对现有代码侵入小、收益快。
- CSS 变量与延迟绘制等进阶项需要评估现有渲染管线，避免画面撕裂或交互延迟。
- 移动端需关注触控缩放与滚动冲突，必要时引入手势节流。

## 7. 验收清单（Checklist）
- 工具栏显示与状态：
  - [ ] 显示 preset（auto/page-width/page-fit/page-actual）与实际数值（百分比）。
  - [ ] zoomIn/zoomOut 采用 1.1 倍步进，边界生效。
- 交互行为：
  - [ ] resize 后，字符串模式自动重算；数值模式保持不变。
  - [ ] 快速连点缩放时无明显卡顿，页面不会反复闪烁。
- 代码质量：
  - [ ] 常量集中、无魔法数字；计算函数可单元测试。
  - [ ] 关键路径有最小限度注释，便于维护。

