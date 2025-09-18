## 常见类型与错误

### 日志等级（VerbosityLevel）
- ERRORS / WARNINGS / INFOS，对应 setVerbosityLevel(level)
<augment_code_snippet path="src/shared/util.js" mode="EXCERPT">
````js
const VerbosityLevel = { ERRORS: 0, WARNINGS: 1, INFOS: 5 };
function setVerbosityLevel(level) { /* ... */ }
function getVerbosityLevel() { /* ... */ }
````
</augment_code_snippet>

### 密码交互（PasswordResponses / PasswordException）
<augment_code_snippet path="src/shared/util.js" mode="EXCERPT">
````js
const PasswordResponses = { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 };
class PasswordException extends BaseException { constructor(msg, code) { /* ... */ } }
````
</augment_code_snippet>

### 网络/文档类异常（节选）
- InvalidPDFException：PDF 文件损坏/不合法
- MissingPDFException：PDF 资源缺失/404
- UnexpectedResponseException：HTTP 状态异常
- UnknownErrorException：未知错误（details）
- AbortException：任务被取消
<augment_code_snippet path="src/shared/util.js" mode="EXCERPT">
````js
class InvalidPDFException extends BaseException {}
class MissingPDFException extends BaseException {}
class UnexpectedResponseException extends BaseException {}
class UnknownErrorException extends BaseException {}
class AbortException extends BaseException {}
````
</augment_code_snippet>

### 处理建议
- 捕获 task.promise 与 page.render().promise 的异常并分类型提示
- 结合 onProgress 显示网络/下载进度
- 渲染/打印前后及时 cleanup，页面切换时 destroy



### 渲染取消异常（RenderingCancelledException）
发生于渲染任务被 cancel() 时，包含 extraDelay 字段（用于延迟刷新）。
<augment_code_snippet path="src/display/display_utils.js" mode="EXCERPT">
````js
class RenderingCancelledException extends BaseException {
  constructor(msg, extraDelay = 0) { /* ... */ }
}
````
</augment_code_snippet>
