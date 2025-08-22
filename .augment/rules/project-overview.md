---
type: "manual"
---

# PDF.js Vue 2 组件项目概述

这是一个基于 PDF.js 4.4.168 版本的 Vue 2 移动端 PDF 阅读器组件项目。

## 项目目标
构建一个高内聚、低耦合的 PDF 阅读器组件，可直接复制到其他项目中独立使用。

## 核心技术栈
- Vue 2 + Vant 2 + Vue CLI 5
- PDF.js (pdfjs-dist npm 包)
- Vuex 状态管理
- Less 预处理器

## 主要文档（每次时记得查看这些文档，避免修改内容偏移主线，如果有文档你查不到了及时跟我说，我来补充）
- 项目架构：project-read-me-doc/
- 项目架构中的前端案例设计实现参考：project-read-me-doc/Web-Viewer-Application/
- 迁移到 vue2 + vue-cli@5 + vant@2 的技术参考文档：webToVue2/doc/web02.md
- PDF.js 一些简单集成案例：examples/
- PDF.js 在 webpack 中使用引入可以参考：examples/webpack/README.md
- 迁移过程记录文档：webToVue2/doc/modify-record.md
  如果有 bug 或者之后有需要修改的地方可以将其记录到其中，避免之后反复犯错。按照每次修改来记录，方便记录追踪。

在写 webToVue2/doc/web02.md 时，不用实现具体代码，只用简短代码表示即可

要抓住重点，以实现核心功能 MVP 为首要目的，不要盲目多写

对于 build/dist/web 的引入一定要谨慎，因为 web 只是官方提供的完整案例而已，而我们的话是要参考其进行迁移，除了内聚性比较好，比较好修改的我们可以引入之外，其他的我们建议自己写，避免以后出问题不好排查，不好修改

## 组件设计原则
1. 可直接复制使用，最小化外部依赖
2. 移动端优先，专注标准移动端屏幕
3. 使用 Vuex 模块级状态管理
4. 简化的 Less 样式，单文件包含基础样式
5. 高内聚、低耦合的架构设计

## Vuex 状态管理规范

### 模块设计
使用 Vuex 模块级状态管理，充分利用宿主环境的 Vuex。

模块名称：pdfViewer

### 最佳实践
1. **模块化设计**：使用命名空间模块，避免状态污染
2. **动态注册**：组件创建时动态注册模块
3. **同步操作**：mutations 只处理同步状态更新
4. **异步操作**：actions 处理异步操作和复杂逻辑
5. **计算属性**：使用 getters 提供计算后的状态
6. **辅助函数**：充分利用 mapState、mapActions 等辅助函数，利用 createNamespacedHelpers('模块名称')
