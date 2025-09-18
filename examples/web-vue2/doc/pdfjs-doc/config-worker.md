## Worker 配置（GlobalWorkerOptions）

源码：src/display/worker_options.js

### 两种方式
1) workerPort（推荐，ESM/现代打包器）
<augment_code_snippet path="examples/web-vue2/src/components/simple-pdf-reader/SimplePdfReader.vue" mode="EXCERPT">
````js
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
  { type: "module" }
);
````
</augment_code_snippet>

2) workerSrc（传统 script/UMD 或无法用 module worker 时）
<augment_code_snippet mode="EXCERPT">
````js
pdfjsLib.GlobalWorkerOptions.workerSrc = "/libs/pdfjs-dist/legacy/build/pdf.worker.mjs";
````
</augment_code_snippet>

注意：一旦设置了 workerPort，将覆盖 workerSrc。

### 接口（摘录）
<augment_code_snippet path="src/display/worker_options.js" mode="EXCERPT">
````js
class GlobalWorkerOptions {
  static get workerPort() { /* Worker|null */ }
  static set workerPort(val) { /* 验证 Worker 实例 */ }
  static get workerSrc() { /* string */ }
  static set workerSrc(val) { /* 必须为 string */ }
}
````
</augment_code_snippet>

### 何时选用哪种
- Vite/Webpack + ESM：优先 workerPort（type: "module"），与分包/缓存更友好
- 旧式环境或 CDN 直引：使用 workerSrc
- Node.js：worker 会被强制禁用（api.js 内部已做兼容）

### 示例：完整加载流程（节选）
<augment_code_snippet path="examples/web-vue2/src/components/simple-pdf-reader/SimplePdfReader.vue" mode="EXCERPT">
````js
const task = pdfjsLib.getDocument({ url: this.src });
const pdf = await task.promise;
````
</augment_code_snippet>

