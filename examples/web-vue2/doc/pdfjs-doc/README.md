## PDF.js 使用指南（xzq-pdf-js 版）

本指南面向本仓库中的 PDF.js 派生实现，结合源码 src/display/api.js 与 web/ 示例，梳理常用 API、配置项与最佳实践，帮助你在 Vue2 或任意 Web 项目中快速集成 PDF 渲染与解析能力。

- 面向对象：前端工程师、Vue2 项目集成者
- 对应源码：src/display/api.js、src/shared/util.js、src/display/worker_options.js
- 示例参考：examples/web-vue2/src/components/simple-pdf-reader/SimplePdfReader.vue、web/

### 快速开始（最小示例）

1) 设置 Worker（推荐使用 ESM WorkerPort）：
<augment_code_snippet mode="EXCERPT">
````js
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
  { type: "module" }
);
````
</augment_code_snippet>

2) 加载文档并渲染第一页：
<augment_code_snippet mode="EXCERPT">
````js
const task = pdfjsLib.getDocument({ url: "/demo.pdf" });
const pdf = await task.promise;           // PDFDocumentProxy
const page = await pdf.getPage(1);        // PDFPageProxy
const viewport = page.getViewport({ scale: 1.5 });
const canvas = document.querySelector("#c");
const ctx = canvas.getContext("2d");
canvas.width = viewport.width; canvas.height = viewport.height;
await page.render({ canvasContext: ctx, viewport }).promise;
````
</augment_code_snippet>

3) 进度与密码（可选）：
<augment_code_snippet mode="EXCERPT">
````js
const task = pdfjsLib.getDocument({ url: "/secure.pdf" });
task.onProgress = ({ loaded, total }) => console.log(loaded / total);
task.onPassword = (update, reason) => update(prompt("输入密码:"));
````
</augment_code_snippet>

### 核心概念
- PDFDocumentLoadingTask：加载任务（进度、密码回调、销毁）
- PDFDocumentProxy：文档代理（numPages、getPage、getOutline、getData、cleanup/destroy）
- PDFPageProxy：页面代理（getViewport、render、getTextContent、getAnnotations）
- GlobalWorkerOptions：全局 Worker 配置（workerPort/workerSrc）
- AnnotationMode / RenderingIntentFlag / VerbosityLevel：渲染开关与日志等级

### 文档导航
- API：
  - api-getDocument.md — 入口与参数（DocumentInitParameters）
  - api-PDFDocumentLoadingTask.md — 加载任务（进度、密码、销毁）

  - api-PDFDocumentProxy.md — 文档层 API
  - api-PDFPageProxy.md — 页面层 API
- 配置与环境：
  - config-worker.md — Worker 启动方式与差异
- 类型与错误：
  - errors-and-types.md — PasswordResponses、异常类型、日志等级
- 实用示例：
  - recipes.md — 渲染、文本抽取、注释、缩略图、打印
  - web-viewer-usage.md — web/ 官方查看器要点
  - web-components-and-events.md — 基于 web/ 的组件与事件集成（PDFViewer、LinkService、History、RenderingQueue、Text/Annotation Layer、Find）

### 版本信息
src/display/api.js 中导出 version/build 标记：
<augment_code_snippet path="src/display/api.js" mode="EXCERPT">
````js
const version = /* ... */; const build = /* ... */;
export { build, /* ... */, version };
````
</augment_code_snippet>

### 何时使用本仓库 vs pdfjs-dist
- 生产集成：建议使用 npm 包 pdfjs-dist（具备打包适配与 Worker 构建）。
- 本仓库：用于二次开发/调试，web/ 提供完整查看器参考实现。

### 常见坑位
- 一定要设置 Worker（workerPort 或 workerSrc），否则主线程性能差且会报错。
- scale/viewport 越大，内存与耗时越高；移动端需控制渲染尺寸。
- 打印/高对比模式可利用 intent/pageColors 等参数优化视觉效果。

