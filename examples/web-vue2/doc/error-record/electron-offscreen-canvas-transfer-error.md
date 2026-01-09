# Electron + PDF.js 图片渲染报错问题记录

## 现象

- 同一套 Web PDF 阅读代码：
  - 在 **浏览器 / 手机 H5 / 微信内嵌 WebView** 中正常。
  - 在 **Electron 渲染进程** 中，部分 PDF 会在控制台报错。
- 报错典型日志：
  - Worker 侧：`UnknownErrorException: Cannot transfer object of unsupported type`。
  - Core 侧：`getOperatorList - ignoring XObject: "UnknownErrorException: Cannot transfer object of unsupported type."`
- 影响：
  - 报错的页上，某些图片（XObject）会被忽略不渲染，但应用整体不会崩溃。
  - 通常 **第一页正常**，翻到后面某几页才开始出问题，尤其是 **图片多 / 图片很大** 的页面。

## 触发条件

- PDF 中存在 **大尺寸 / 大面积的位图图片 XObject**，或者某一页包含 **很多图片**。
- 翻页或滚动到这些页面（或刚要进入视口，被预渲染）时，PDF.js 才会：
  - 为该页执行 `getOperatorList`；
  - 解析并解码图片；
  - 触发图片相关的 OffscreenCanvas / ImageBitmap 路径。
- 因为 PDF.js 是 **按页懒加载 + 懒渲染**，所以：
  - **首页不一定触发问题**（如果首页图片不大或不多）；
  - 只有翻到含大图/多图的页面时才会出错。

## PDF.js 内部相关逻辑

### 1. isOffscreenCanvasSupported 选项

位置：`src/display/api.js`

- 含义：是否在 Worker 中使用 `OffscreenCanvas` 进行图片转换/渲染加速。
- 默认值：
  - Web 环境：`true`（`!isNodeJS`）。
  - Node.js 环境：`false`。
- 传给 Worker 时，作为 `evaluatorOptions.isOffscreenCanvasSupported`。

Worker 侧二次检测（`src/core/pdf_manager.js`）：

```js
args.evaluatorOptions.isOffscreenCanvasSupported &&=
  FeatureTest.isOffscreenCanvasSupported;
```

- 若传入就是 `false`：始终保持 `false`，彻底禁用 OffscreenCanvas 路径。
- 若传入是 `true`：再根据运行环境检查一次是否真的支持 `OffscreenCanvas`。

### 2. 大图路径：ImageResizer + OffscreenCanvas

位置：`src/core/image.js` / `src/core/image_resizer.js`

- 对于图片 XObject，PDF.js 会根据 `isOffscreenCanvasSupported` 和图片尺寸，决定是否：
  - 直接用普通数据（`Uint8Array` / `ImageData`）；
  - 或者走 **OffscreenCanvas + ImageBitmap + ImageResizer** 路径，对大图进行缩放和优化。

典型逻辑（简化）：

```js
if (isOffscreenCanvasSupported) {
  const mustBeResized = ImageResizer.needsToBeResized(drawWidth, drawHeight);
  if (mustBeResized) {
    return ImageResizer.createImage(imgData, ...); // 大图专用路径
  }
  return this.createBitmap(...); // OffscreenCanvas + transferToImageBitmap
}

// 否则走老的纯数据路径（不使用 OffscreenCanvas）
```

`ImageResizer.createImage` / `createBitmap` 内部会：

- 创建 `OffscreenCanvas`；
- 使用 `drawImage` / `putImageData`；
- 最终调用 `canvas.transferToImageBitmap()` 得到 `ImageBitmap`；
- 将 `ImageBitmap` 挂到 `imgData.bitmap`，并通过 `postMessage(..., transferList)` 在 Worker 与主线程之间传输。

### 3. 错误打印位置

位置：`src/core/evaluator.js`

```js
...resolveXObjectPromise
  .then(resolveXObject)
  .catch(function (reason) {
    if (reason instanceof AbortException) return;
    if (self.options.ignoreErrors) {
      warn(`getOperatorList - ignoring XObject: "${reason}".`);
      return;
    }
    throw reason;
  });
```

- 任何在解析 XObject 过程中抛出的异常，都会被这里捕获。
- 当 `ignoreErrors = true` 时：
  - 打印 `getOperatorList - ignoring XObject: "..."`；
  - 直接忽略该 XObject，不再渲染（图片丢失）。
- 在本问题中，`reason` 是 `UnknownErrorException: Cannot transfer object of unsupported type`。

## 根因分析

在 **Electron 渲染进程** 中：

1. 环境看起来像 Web（非 Node）：
   - `isNodeJS === false` ⇒ 默认 `isOffscreenCanvasSupported = true`。
   - `OffscreenCanvas` 可能存在 ⇒ `FeatureTest.isOffscreenCanvasSupported = true`。
2. Worker 端据此启用了 OffscreenCanvas / ImageBitmap 路径。
3. 当处理 **大图 / 多图页面** 时：
   - 进入 `ImageResizer` / `createBitmap`，创建了 `ImageBitmap`；
   - 尝试通过 `postMessage` + `transferList` 传输这些对象。
4. 但 Electron 当前的 Worker / 消息通道实现：
   - **并不完全支持将 `ImageBitmap` / OffscreenCanvas 当作 transferable 进行传输**；
   - 因此抛出底层错误：`Cannot transfer object of unsupported type`。
5. 该错误被封装为 `UnknownErrorException`，在 `evaluator.js` 中被 `ignoreErrors` 分支捕获并记录：
   - `getOperatorList - ignoring XObject: "UnknownErrorException: Cannot transfer object of unsupported type."`
   - 对应的图片 XObject 被忽略，导致页面图片缺失。

> 这一问题本质上是 **Electron 环境下的 OffscreenCanvas / ImageBitmap transferable 兼容性问题**，而不是内存不足。

## 解决方案

**在 Electron 渲染进程中，明确关闭 OffscreenCanvas 支持。**

### 做法（以 Vue2 示例为例）

在封装 `pdfjsLib.getDocument` 的地方（例如 `examples/web-vue2/src/components/pdf/core/pdf-config.js`），根据环境设置：

```js
const isElectronRenderer =
  typeof navigator !== "undefined" && /Electron/.test(navigator.userAgent);

const loadingTask = pdfjsLib.getDocument({
  ...getDocumentOptions,
  isOffscreenCanvasSupported: !isElectronRenderer,
});
```

含义：

- 普通浏览器 / 手机 WebView：`isOffscreenCanvasSupported = true`（保持性能优化）。
- Electron 渲染进程：`isOffscreenCanvasSupported = false`，禁用 OffscreenCanvas 路径。

### 效果

- 再次打开同一 PDF：
  - 不再出现 `UnknownErrorException: Cannot transfer object of unsupported type`；
  - 控制台不会再打印 `getOperatorList - ignoring XObject`；
  - 含大图/多图的页面图片可以正常渲染。

## 副作用与影响评估

关闭 `isOffscreenCanvasSupported` 的影响：

- **性能**：
  - 对少量/中等大小图片影响不大；
  - 对包含大量大图的 PDF，渲染可能略微变慢，CPU 占用略高（失去部分 OffscreenCanvas 加速）。
- **功能正确性**：
  - PDF 功能（文本、注释、表单等）不受影响；
  - 图片不会再因为 transfer 失败而被整体忽略，**渲染结果更稳定可靠**。

综合权衡：

- 对 Electron 环境而言，**优先保证兼容性和渲染完整性** 更重要；
- 在 Electron 中强制 `isOffscreenCanvasSupported = false` 是一个合理且稳妥的配置。

## 经验总结

1. 同一套 Web 代码在浏览器 / 手机 / Electron 中运行时，要意识到：
   - 它们底层的运行时和 Worker 实现不同，Web API 的行为可能不完全一致。
2. 遇到类似 `Cannot transfer object of unsupported type`、`DataCloneError` 这类错误时：
   - 优先怀疑 **transferable 对象类型 / structured clone 支持**，而不是单纯“内存不足”。
3. PDF.js 提供了很多可配置项（例如 `isOffscreenCanvasSupported`），可以用来：
   - 为不同宿主环境（浏览器 / Electron / Node）选择更合适、更稳的路径。

