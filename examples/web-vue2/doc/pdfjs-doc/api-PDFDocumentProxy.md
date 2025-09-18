## PDFDocumentProxy（文档代理）

从 task.promise 解析得到，代表一个已打开的 PDF 文档，方法均为异步（返回 Promise）。

### 常用属性
- numPages：总页数
- fingerprints：[id, modifiedId|null] 唯一标识
- annotationStorage：表单注释存储（打印/保存时用）
- filterFactory：图像过滤器工厂（页面/文档均可访问）
- loadingTask：对应的 PDFDocumentLoadingTask
- isPureXfa / allXfaHtml：XFA 表单相关

### 常用方法（节选）
- getPage(pageNumber) => Promise<PDFPageProxy>
- getPageIndex(ref) => Promise<number>
- getDestinations() / getDestination(id)
- getPageLabels() / getPageLayout() / getPageMode()
- getViewerPreferences() / getOpenAction()
- getOutline()：文档大纲树
- getOptionalContentConfig({ intent })：可选内容层（OCG）
- getFieldObjects() => Promise<Object<string, Array<Object>> | null>
- hasJSActions() => Promise<boolean>
- getCalculationOrderIds() => Promise<Array<string> | null>

- getPermissions()：权限标记
- getMetadata()：返回 { info, metadata, contentDispositionFilename, contentLength }
- getMarkInfo()：可访问性标记
- getData() / saveDocument()：原始数据/保存后数据
- getDownloadInfo()：下载长度
- cleanup(keepLoadedFonts=false)：释放字体/对象
- destroy()：销毁文档并终止 worker
- cachedPageNumber(ref)：若已缓存，返回页码

### getMetadata 返回结构（源码摘录）
<augment_code_snippet path="src/display/api.js" mode="EXCERPT">
````js
.then(results => ({
  info: results[0],
  metadata: results[1] ? new Metadata(results[1]) : null,
  contentDispositionFilename: this._fullReader?.filename ?? null,
  contentLength: this._fullReader?.contentLength ?? null,
}));
````
</augment_code_snippet>


### 渲染整本文档（串行小示例）
<augment_code_snippet mode="EXCERPT">
````js
const pdf = await task.promise;
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  // ... 渲染 page
}
await pdf.cleanup();
````
</augment_code_snippet>

### 获取大纲与命名目的地
<augment_code_snippet mode="EXCERPT">
````js
const outline = await pdf.getOutline();
const dest = await pdf.getDestination("Chapter_1");
````
</augment_code_snippet>

### 获取/保存原始数据
<augment_code_snippet mode="EXCERPT">
````js
const raw = await pdf.getData();
const saved = await pdf.saveDocument();
````
</augment_code_snippet>

### 清理与销毁
- 建议在路由切换或组件卸载时：
<augment_code_snippet mode="EXCERPT">
````js
await pdf.cleanup();
await pdf.destroy();
````
</augment_code_snippet>

