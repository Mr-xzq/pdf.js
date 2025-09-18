## getDocument 与 DocumentInitParameters

入口函数 getDocument 是加载/解析 PDF 的唯一必经之路，返回 PDFDocumentLoadingTask。

### 签名（源码摘录）
<augment_code_snippet path="src/display/api.js" mode="EXCERPT">
````js
function getDocument(src = {}) {
  const task = new PDFDocumentLoadingTask();
  // ... 构造 Worker、网络/数据流与传输参数
  return task;
}
````
</augment_code_snippet>

### 入参格式（src）
- string | URL：PDF 文件地址（同源/CORS）
- TypedArray | ArrayBuffer | Array<number> | string：二进制数据（推荐 Uint8Array）
- DocumentInitParameters：对象参数（最常用）

常用字段（节选，见 src/display/api.js 115–218 行）：
- url | data：PDF 来源（二选一）
- httpHeaders, withCredentials：网络请求头与凭据
- password：加密 PDF 密码（配合 onPassword 回调）
- range, rangeChunkSize：自定义分段下载与分块大小（默认 65536）
- worker：传入已创建的 PDFWorker（否则内部创建）
- verbosity：日志级别，见 shared/util.js 的 VerbosityLevel
- docBaseUrl：修复书签/大纲中的相对链接基地址
- cMapUrl, cMapPacked, StandardFontData 等：CMap/标准字体的加载工厂与路径
- stopAtErrors：解析失败时是否抛错而非尽量容错（默认 false）
- maxImageSize, isEvalSupported, isOffscreenCanvasSupported, canvasMaxAreaInBytes：性能与安全相关开关
- disableFontFace：禁用 @font-face，走内置路径绘制（Node 默认为 true）
- enableXfa：是否启用 XFA 表单渲染
- disableRange/disableStream/disableAutoFetch：网络加载策略
- canvasFactory/filterFactory：自定义工厂
- enableHWA：是否开启硬件加速

### 返回值：PDFDocumentLoadingTask
- task.promise：Promise<PDFDocumentProxy>
- task.onProgress = ({ loaded, total }) => {}
- task.onPassword = (update, reason) => { update(newPassword) }
- task.destroy()：中止加载/销毁 Worker

### 密码交互
- reason 值来自 PasswordResponses：NEED_PASSWORD / INCORRECT_PASSWORD
<augment_code_snippet path="src/shared/util.js" mode="EXCERPT">
````js
const PasswordResponses = { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 };
````
</augment_code_snippet>

### 典型用法
- 通过 URL 加载，带进度/密码：
<augment_code_snippet mode="EXCERPT">
````js
const task = pdfjsLib.getDocument({ url: "/secure.pdf" });
task.onProgress = ({ loaded=0, total=1 }) => updateBar(loaded/total);
task.onPassword = (update, reason) => update(prompt("密码:"));
const pdf = await task.promise; // PDFDocumentProxy
````
</augment_code_snippet>

- 通过 ArrayBuffer 加载（适合自行下载或离线缓存）：
<augment_code_snippet mode="EXCERPT">
````js
const ab = await (await fetch("/demo.pdf")).arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
````
</augment_code_snippet>

### 进阶：分段/流式加载
- rangeChunkSize、disableAutoFetch、disableStream 影响网络策略
- 自定义 PDFDataRangeTransport 以适配私有下载通道（见 api.js 的 PDFDataRangeTransport 抽象类）

### 销毁与清理
- 仅取消加载：task.destroy()
- 文档级：pdf.cleanup() 释放字体等资源；pdf.destroy() 终止 worker

