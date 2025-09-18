## PDFPageProxy（页面代理）

代表一页 PDF，可用于计算视口、渲染到 Canvas、提取文本和注释等。

### 常用属性
- pageNumber：页码（从 1 开始）
- rotate：页面旋转角度
- ref：页对象引用
- userUnit：单位（1/72 英寸）
- view：[x1,y1,x2,y2] 可视区域
- filterFactory：图像滤镜工厂


### 关键方法
- getViewport({ scale, rotation, offsetX, offsetY, dontFlip }) => PageViewport
- getAnnotations({ intent = 'display' | 'print' | 'any' })
- getJSActions()
- getOperatorList({ intent, annotationMode, printAnnotationStorage } = {}) => Promise<PDFOperatorList>

- getXfa()：XFA 伪 DOM（如存在）
- render({ canvasContext, viewport, intent = 'display', annotationMode, ... }) => RenderTask
- getTextContent({ includeMarkedContent, disableNormalization } = {}) => Promise<TextContent>

### 渲染参数要点（RenderParameters）
- canvasContext：Canvas 2D 上下文
- viewport：由 getViewport 获得
- intent：'display' | 'print' | 'any'（打印场景建议 'print'）
### RenderTask 返回对象
- promise: Promise<void>
- cancel(extraDelay = 0)
- onContinue: (continueFn) => void（增量渲染时回调，调用 continueFn 继续）
- separateAnnots: boolean（当注释外观与主 operatorList 分离，且 annotationCanvasMap 有内容时为 true）
<augment_code_snippet path="src/display/api.js" mode="EXCERPT">
````js
class RenderTask {
  onContinue = null; get promise() { /* ... */ }
  cancel(extraDelay = 0) { /* ... */ }
  get separateAnnots() { /* ... */ }
}
````
</augment_code_snippet>

- annotationMode：见 AnnotationMode（ENABLE/DISABLE/ENABLE_FORMS/ENABLE_STORAGE）
- optionalContentConfigPromise：与 OCG 同步
- background/pageColors：背景与高对比度覆盖

### 最小渲染示例
<augment_code_snippet mode="EXCERPT">
````js
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.25 });
const canvas = document.querySelector("#c");
canvas.width = viewport.width; canvas.height = viewport.height;
await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
````
</augment_code_snippet>

### 提取文本与注释
<augment_code_snippet mode="EXCERPT">
````js
const items = await page.getTextContent();
const annots = await page.getAnnotations({ intent: "display" });
````
</augment_code_snippet>

### 性能建议
- 控制 scale（移动端一般 1–1.5），避免超大画布
- 滚动懒加载/回收离屏 Canvas
- 打印模式下及时 cleanup（api.js 中有专门优化）

