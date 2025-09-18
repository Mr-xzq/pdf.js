## PDFDocumentLoadingTask（加载任务）

getDocument(...) 返回的任务对象，负责网络请求与解析，暴露进度/密码回调与销毁能力。

### 关键属性与回调
- docId：字符串，唯一任务 ID
- destroyed：是否已销毁
- onPassword = (update, reason) => void
  - reason 来自 PasswordResponses（NEED_PASSWORD / INCORRECT_PASSWORD）
  - 调用 update(newPassword) 继续
- onProgress = ({ loaded, total }) => void

### 能力
- promise：Promise<PDFDocumentProxy>
- destroy(): Promise<void> — 取消网络请求，终止 worker，并清理状态

### 源码摘录
<augment_code_snippet path="src/display/api.js" mode="EXCERPT">
````js
class PDFDocumentLoadingTask {
  constructor() {
    this._capability = Promise.withResolvers();
    this.docId = `d${PDFDocumentLoadingTask.#docId++}`;
    this.destroyed = false;
    this.onPassword = null; this.onProgress = null;
  }
  get promise() { return this._capability.promise; }
  async destroy() { /* 取消传输与销毁 worker */ }
}
````
</augment_code_snippet>

