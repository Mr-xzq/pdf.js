## 常用配方（Recipes）

### 1. 渲染第一页到 Canvas（最小）
<augment_code_snippet mode="EXCERPT">
````js
const pdf = await pdfjsLib.getDocument({ url: "/demo.pdf" }).promise;
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.25 });
const c = document.querySelector("#c"); c.width = viewport.width; c.height = viewport.height;
await page.render({ canvasContext: c.getContext("2d"), viewport }).promise;
````
</augment_code_snippet>

### 2. 提取文本
<augment_code_snippet mode="EXCERPT">
````js
const textContent = await page.getTextContent();
const text = textContent.items.map(i => i.str).join("");
````
</augment_code_snippet>

### 3. 读取注释（含表单）
<augment_code_snippet mode="EXCERPT">
````js
const annots = await page.getAnnotations({ intent: "display" });
// ENABLE_STORAGE 可结合 annotationStorage 用于打印
````
</augment_code_snippet>

### 4. 生成缩略图
<augment_code_snippet mode="EXCERPT">
````js
const thumbScale = 0.2;
const vp = page.getViewport({ scale: thumbScale });
const off = new OffscreenCanvas(vp.width, vp.height);
await page.render({ canvasContext: off.getContext("2d"), viewport: vp }).promise;
const blob = await off.convertToBlob();
````
</augment_code_snippet>

### 5. 进度条与取消
<augment_code_snippet mode="EXCERPT">
````js
const task = pdfjsLib.getDocument({ url: "/big.pdf" });
task.onProgress = ({ loaded, total }) => update(loaded/total);
// 需要取消时：await task.destroy();
````
</augment_code_snippet>

### 6. 打印优化
- intent: 'print'
- AnnotationMode.ENABLE_STORAGE（将表单值应用到外观）
- 渲染完成后清理，释放内存

### 7. 分段加载与私有下载通道
- rangeChunkSize 适配带宽
- 自定义 PDFDataRangeTransport 实现 onDataRange/onDataProgress，见 api.js

