## PDF.js web/ 移动端 H5 手势逻辑总结（可复用要点）

本文总结 `web/` 目录（官方 viewer）中与移动端 H5 手势/缩放/翻页相关的实现方式，方便在 `web-vue2` 中借鉴复用。

### 总览
- 统一在 `web/app.js` 里向 `window` 注册交互事件：`wheel`、`touchstart`、`touchmove`、`touchend`（均使用 `{ passive: false }` 以便 `preventDefault` 生效）。
- 双指捏合缩放：通过 `touchstart`/`touchmove` 计算两触点间距的变化，得到缩放因子与缩放中心后调用 `PDFViewerApplication.updateZoom(...)`。
- 触控板捏合（映射为带 `ctrlKey` 的 `wheel` 事件）与滚轮缩放：在 `webViewerWheel` 中统一处理，区分捏合缩放与滚轮步进缩放。
- 演示模式（全屏）下的单指滑动翻页：在 `web/pdf_presentation_mode.js` 中实现，基于位移阈值与角度阈值识别横/纵向滑动，并调用上一页/下一页。
- 鼠标抓手拖拽平移（桌面端）：在 `web/grab_to_pan.js`，移动端主要依赖原生滚动；策略可复用到触控平移的判定/阻止默认行为。

### 事件绑定与入口
事件绑定集中在 `web/app.js` 的初始化过程中：
<augment_code_snippet path="web/app.js" mode="EXCERPT">
````javascript
window.addEventListener("wheel", webViewerWheel, { passive: false, signal });
window.addEventListener("touchstart", webViewerTouchStart, { passive: false, signal });
window.addEventListener("touchmove", webViewerTouchMove, { passive: false, signal });
window.addEventListener("touchend", webViewerTouchEnd, { passive: false, signal });
````
</augment_code_snippet>

关键点：
- 使用 `passive: false` 确保在需要时能 `evt.preventDefault()`，避免浏览器默认的页面缩放/回弹手势干扰。
- 在 `visibilitychange` 时会设置一个 `WHEEL_ZOOM_DISABLED_TIMEOUT`，短时间内禁用滚轮缩放，避免标签切换时误触。

### 双指捏合缩放（touchstart/touchmove/touchend）
- 入口：`webViewerTouchStart`/`webViewerTouchMove`/`webViewerTouchEnd`。
- 仅在「非演示模式」且 `evt.touches.length === 2` 时生效；若覆盖层（`overlayManager.active`）开启则忽略。
- 用触点 `identifier` 排序，记录起始位置，移动时：
  1) 利用行列式（近似判断两向量共线）与点乘（方向相反）排除“非捏合”的两指同向平移；
  2) 计算两指中心点（缩放原点）与当前/之前的两指间距比值（缩放因子）；
  3) `supportsPinchToZoom=true` 时采用“因子累积”模式，否则折算为“刻度累计”模式；
  4) 通过 `updateZoom(null, scaleFactor, origin)` 或 `updateZoom(ticks, null, origin)` 执行缩放。

示例片段：
<augment_code_snippet path="web/app.js" mode="EXCERPT">
````javascript
function webViewerTouchMove(evt) {
  const origin = [(page0X + page1X) / 2, (page0Y + page1Y) / 2];
  const distance = Math.hypot(page0X - page1X, page0Y - page1Y) || 1;
  const pDistance = Math.hypot(pTouch0X - pTouch1X, pTouch0Y - pTouch1Y) || 1;
  const newScale = PDFViewerApplication._accumulateFactor(
    pdfViewer.currentScale, distance / pDistance, "_touchUnusedFactor"
  );
  PDFViewerApplication.updateZoom(null, newScale, origin);
}
````
</augment_code_snippet>

边界与细节：
- 共线判定阈值使用 `|det| > 0.02 * |v1| * |v2|`，过滤斜切或旋转趋势，保证只把“对向拉伸”识别为捏合。
- `origin` 取两指中点（屏幕坐标），确保以手势中心放大/缩小，提高直觉一致性。
- `PDFViewerApplication._touchInfo` 用于在 `move` 期间维护上一次的两指坐标。

### 触控板捏合与滚轮缩放（wheel）
- 入口：`webViewerWheel`。
- 判定“触控板捏合”的要点：
  - `evt.ctrlKey === true` 但应用没有记录 `Ctrl` 被按下（`_isCtrlKeyDown === false`）；
  - `deltaMode === DOM_DELTA_PIXEL`、`deltaX === 0`、`deltaZ === 0`；
  - `|scaleFactor - 1|` 很小（或特判内置 Mac 行为）。
- 逻辑分支：
  - 若为捏合或显式按住 `Ctrl/Meta`（由 `supportsMouseWheelZoomCtrlKey/MetaKey` 控制）→ 走“页面缩放”，阻止默认并通过 `updateZoom(...)` 执行；
  - 否则按滚轮步进：用 `normalizeWheelEventDirection(evt)` 统一滚轮方向并折算 ticks 再 `updateZoom(ticks, null, origin)`。

示例片段：
<augment_code_snippet path="web/app.js" mode="EXCERPT">
````javascript
if (isPinchToZoom && supportsPinchToZoom) {
  scaleFactor = PDFViewerApplication._accumulateFactor(
    pdfViewer.currentScale, scaleFactor, "_wheelUnusedFactor"
  );
  PDFViewerApplication.updateZoom(null, scaleFactor, origin);
} else {
  const delta = normalizeWheelEventDirection(evt);
  const ticks = PDFViewerApplication._accumulateTicks(...);
  PDFViewerApplication.updateZoom(ticks, null, origin);
}
````
</augment_code_snippet>

### 演示模式下的单指滑动翻页（touch swipe）
- 文件：`web/pdf_presentation_mode.js`。
- 仅在演示模式激活时处理单指滑动；多指触控会取消当前滑动判定。
- 判定规则：
  - 位移阈值：`SWIPE_MIN_DISTANCE_THRESHOLD = 50px`；
  - 角度阈值：`SWIPE_ANGLE_THRESHOLD = π/6`，在横/纵向附近才认定为水平/垂直滑动；
  - `touchmove` 中 `preventDefault()` 以避免浏览器自带全屏手势冲突。
- 结果：水平滑动 `dx>0` → 上一页；`dx<0` → 下一页；纵向同理。

示例片段：
<augment_code_snippet path="web/pdf_presentation_mode.js" mode="EXCERPT">
````javascript
case "touchend":
  const dx = endX - startX, dy = endY - startY;
  const absAngle = Math.abs(Math.atan2(dy, dx));
  if (Math.abs(dx) > 50 && (absAngle <= π/6 || absAngle >= π - π/6)) {
    delta = dx; // 水平滑动
  }
  if (delta > 0) pdfViewer.previousPage();
  else if (delta < 0) pdfViewer.nextPage();
````
</augment_code_snippet>

### 配置与能力开关（AppOptions）
这些能力由 `web/app_options.js` 统一配置，默认开启：
- `supportsPinchToZoom: true`
- `supportsMouseWheelZoomCtrlKey: true`
- `supportsMouseWheelZoomMetaKey: true`

### 核心缩放 API 与累积策略
- `PDFViewerApplication.updateZoom(steps, scaleFactor, origin)`
  - `steps`：整数步进（如滚轮）
  - `scaleFactor`：倍数缩放（如捏合）
  - `origin`：屏幕坐标的缩放中心
- `_accumulateFactor(previousScale, factor, prop)` 与 `_accumulateTicks(ticks, prop)` 用于跨事件帧平滑累计，避免设备上报过密导致的“抖动/超调”。

示例片段：
<augment_code_snippet path="web/app.js" mode="EXCERPT">
````javascript
updateZoom(steps, scaleFactor, origin) {
  if (this.pdfViewer.isInPresentationMode) return;
  // ... 根据 steps 或 scaleFactor 调整 currentScale，并围绕 origin 重算视口
}
````
</augment_code_snippet>

### 关键边界与防抖处理
- `overlayManager.active` 时禁用触控缩放（避免与弹层交互冲突）。
- `document.visibilityState === "hidden"` 或短期 `zoomDisabledTimeout` 期间忽略滚轮缩放。
- 触控事件一律判定在 `pdfViewer.isInPresentationMode` 之外执行；演示模式有独立手势规则。
- 始终在需要时 `evt.preventDefault()`，否则浏览器会拦截（尤其是移动端/全屏）。

### 可直接借鉴的实现要点（建议）
1) 事件层：统一注册 `wheel/touchstart/touchmove/touchend`，保证 `passive:false`；
2) 捏合识别：使用“共线 + 方向相反”判定方式，并用两指中点作为缩放中心；
3) 触控板捏合识别：按 `ctrlKey + pixel delta + 0 deltaX/Z` 等条件过滤；
4) 缩放执行：围绕点击/手势中心 `origin` 调用统一的 `updateZoom`，并引入“因子/步进累计”；
5) 边界处理：演示模式、覆盖层、可见性变化的抑制窗口；
6) 参数开关：将 `supportsPinchToZoom`、`supportsMouseWheelZoom*` 暴露为可配置项。

### 相关文件清单（web/）
- `web/app.js`：wheel + touch 手势主入口，缩放调度、累积与边界处理。
- `web/ui_utils.js`：`normalizeWheelEventDirection/Delta` 等工具函数。
- `web/pdf_presentation_mode.js`：演示模式单指滑动翻页与滚轮逻辑。
- `web/grab_to_pan.js`：鼠标抓手平移（可借鉴事件阻止与滚动同步策略）。
- `web/app_options.js`：手势相关能力开关。

> 注：官方 viewer 未内置“双击放大”的手势；若业务需要，可在自定义层（如 `examples/web-vue2`）实现双击切换缩放倍数并围绕点击点缩放。
