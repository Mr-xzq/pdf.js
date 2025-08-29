# 简易版 PDF 阅读器（SimplePdfReader）执行文档

## 目标与范围（MVP）
- 目标：在移动端场景提供“能看就行”的 PDF 阅读能力。
- 范围：
  - 仅支持通过 `src`（URL 字符串）加载 PDF。
  - 竖向滚动阅读模式；每页宽度自适应容器（100% 宽），高度按比例计算。
  - 基础加载态与错误态处理。
- 不包含：缩放控制、分页跳转、搜索、目录、注释、文本选择/复制等高级功能（可后续迭代）。

## 前置条件
- 项目已配置 pdf.js 本地别名：见 `examples/web-vue2/vue.config.js`
  - `resolve.alias['pdfjs-dist']` 指向本地 `pdfjs-dist/`
- 推荐零配置导入（避免 Worker 配置问题）：
  - `import * as pdfjsLib from 'pdfjs-dist/webpack.mjs'`

## 目录结构规划
- 组件代码建议放在：`examples/web-vue2/src/components/simple-pdf-reader/`
- 初始文件：
  - `SimplePdfReader.vue`（主组件，仅暴露 `src` 入参）
  - `index.js`（可选：导出组件，便于按需引入）

```
examples/web-vue2/
  src/
    components/
      simple-pdf-reader/
        SimplePdfReader.vue
        index.js
```

## 组件 API（MVP）
- Props
  - `src: String`（必填）PDF 文件的 URL；需同源或服务器允许跨域。
- Events（可选，先不强制）
  - `loaded({ numPages })` 文档成功加载
  - `error(error)` 文档加载或渲染失败

## 渲染与布局规则
- 容器：`position: relative; width: 100%; height: 100%; overflow-y: auto;`（父容器决定可视高度）
- 每页：使用 `<canvas>` 渲染；CSS `width: 100%`；实际像素大小通过 `canvas.width/height` 设置以保证清晰度。
- 缩放：根据容器实际宽度计算 `scale = containerWidth / pageViewport.width`（以 page 原始宽度为基准），保证页面宽度贴合容器。

## 与 pdf.js 的集成方式（简化版）
- 直接导入 `pdfjs-dist/webpack.mjs`：
  - 优点：无需手动配置 Worker，避免 “Setting up fake worker” 警告。
- 基本流程：
  1. `const loadingTask = pdfjsLib.getDocument({ url: src });`
  2. `const pdf = await loadingTask.promise;`
  3. 遍历 `1..pdf.numPages`：
     - `const page = await pdf.getPage(i)`
     - 计算 `scale`，创建/调整对应 `<canvas>` 尺寸
     - `page.render({ canvasContext, viewport })`

## 实施步骤
1. 新建目录与文件
   - `src/components/simple-pdf-reader/SimplePdfReader.vue`
   - `src/components/simple-pdf-reader/index.js`
2. 在组件中：
   - `mounted` 时根据 `this.src` 调用 `loadDocument()`
   - 监听 `src` 变化时重新加载
   - 使用容器 `clientWidth` 计算每页的 `scale`
   - 渲染期间显示“加载中”，失败显示“重试”按钮
3. 页面渲染策略（MVP）
   - 简单顺序渲染：从第 1 页依次渲染到最后一页
   - 每页渲染完成后追加到列表（避免一次性阻塞）
4. 样式
   - 页面间距（如 `margin: 12px 0`）
   - 背景与阴影（可选，美化观感）
5. 基础校验
   - 使用 `public/` 下样例 PDF（例如 `public/sample.pdf`）进行本地校验

## 关键代码示例（摘录）
> 注意：以下代码即为 `SimplePdfReader.vue` 核心思路，具体可直接复制为初版。

```vue
<template>
  <div class="spr-container" ref="container">
    <div v-if="loading" class="spr-status">正在加载 PDF… {{ Math.round(progress * 100) }}%</div>
    <div v-else-if="error" class="spr-status">
      <div>加载失败：{{ error }}</div>
      <button @click="reload">重试</button>
    </div>
    <div v-else class="spr-pages">
      <div v-for="(page, idx) in pages" :key="idx" class="spr-page">
        <canvas :ref="setCanvasRef(idx)" class="spr-canvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
import * as pdfjsLib from 'pdfjs-dist/webpack.mjs'

export default {
  name: 'SimplePdfReader',
  props: { src: { type: String, required: true } },
  data() {
    return { loading: false, progress: 0, error: '', pages: [], _pdf: null, _canvases: [] }
  },
  methods: {
    setCanvasRef(index) {
      return el => { this._canvases[index] = el }
    },
    async loadDocument() {
      if (!this.src) return
      this.loading = true; this.error = ''; this.pages = []; this._canvases = []
      try {
        const task = pdfjsLib.getDocument({ url: this.src })
        task.onProgress = ({ loaded = 0, total = 1 }) => { this.progress = total ? loaded / total : 0 }
        const pdf = await task.promise
        this._pdf = pdf
        const num = pdf.numPages
        this.pages = new Array(num).fill(0)
        await this.$nextTick()
        // 顺序渲染
        for (let i = 1; i <= num; i++) {
          const page = await pdf.getPage(i)
          const containerWidth = this.$refs.container.clientWidth || window.innerWidth
          const viewport = page.getViewport({ scale: 1 })
          const scale = containerWidth / viewport.width
          const scaledVp = page.getViewport({ scale })
          const canvas = this._canvases[i - 1]
          const ctx = canvas.getContext('2d')
          canvas.width = Math.floor(scaledVp.width)
          canvas.height = Math.floor(scaledVp.height)
          canvas.style.width = '100%'
          canvas.style.height = `${Math.floor(scaledVp.height)}px`
          await page.render({ canvasContext: ctx, viewport: scaledVp }).promise
        }
        this.$emit('loaded', { numPages: num })
        this.loading = false
      } catch (e) {
        this.error = e && e.message ? e.message : String(e)
        this.$emit('error', e)
        this.loading = false
      }
    },
    async reload() { await this.loadDocument() }
  },
  watch: { src: 'loadDocument' },
  mounted() { this.loadDocument() }
}
</script>

<style scoped>
.spr-container { position: relative; width: 100%; height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.spr-status { padding: 16px; color: #666; font-size: 14px; }
.spr-pages { padding: 12px 8px; }
.spr-page { margin: 12px 0; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06); border-radius: 6px; overflow: hidden; }
.spr-canvas { display: block; width: 100%; height: auto; }
</style>
```

> 若需要更细的像素控制，可根据设备像素比 `dpr = window.devicePixelRatio || 1` 调整 `canvas.width/height`，并用 CSS 控制展示尺寸。

### 可选的 `index.js`
```js
import SimplePdfReader from './SimplePdfReader.vue'
export default SimplePdfReader
export { SimplePdfReader }
```

## 使用示例
```vue
<template>
  <div class="page">
    <simple-pdf-reader :src="pdfUrl" />
  </div>
</template>

<script>
import SimplePdfReader from '@/components/simple-pdf-reader/SimplePdfReader.vue'
export default { components: { SimplePdfReader }, data: () => ({ pdfUrl: '/sample.pdf' }) }
</script>

<style>
.page { position: fixed; inset: 0; background: #f5f6f7; }
</style>
```

## 验收清单
- [ ] 在移动端浏览器（或模拟器）中能顺畅竖向滚动浏览 PDF。
- [ ] 页面宽度贴合容器；横向不出现滚动条。
- [ ] 超过 10 页的文档可正常渲染（可接受的加载时间）。
- [ ] 出错时给出提示且可重试。

## 后续迭代建议（非 MVP）
- 懒加载/按需渲染（IntersectionObserver）、取消渲染任务。
- 文本层与可选复制、选择（需要 `textLayer`）。
- 缩放（双击/双指捏合）与分页导航。
- 错误兜底：CORS、网络中断、密码文档处理。
- 内存与性能优化：复用 canvas、回收离屏页面。

