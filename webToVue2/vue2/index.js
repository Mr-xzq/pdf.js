/**
 * Vue PDF 查看器组件
 * 基于 PDF.js 4.4.168 版本的 Vue 2 移动端 PDF 阅读器组件
 */

import PdfViewer from './components/PdfViewer.vue';
import PdfTopToolbar from './components/PdfTopToolbar.vue';
import PdfBottomToolbar from './components/PdfBottomToolbar.vue';
import PdfThumbnail from './components/PdfThumbnail.vue';
import PdfOutline from './components/PdfOutline.vue';
import pdfViewerStore from './store/pdf-viewer.js';

// 组件注册方法
const install = function(Vue, options = {}) {
  // 组件注册
  Vue.component('PdfViewer', PdfViewer);
  Vue.component('PdfTopToolbar', PdfTopToolbar);
  Vue.component('PdfBottomToolbar', PdfBottomToolbar);
  Vue.component('PdfThumbnail', PdfThumbnail);
  Vue.component('PdfOutline', PdfOutline);
  
  // 如果传入了 store，自动注册 pdfViewer 模块
  if (options.store) {
    if (!options.store.hasModule('pdfViewer')) {
      options.store.registerModule('pdfViewer', pdfViewerStore);
    }
  }
};

// 如果是通过 script 标签引入，自动安装
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export default {
  install,
  PdfViewer,
  PdfTopToolbar,
  PdfBottomToolbar,
  PdfThumbnail,
  PdfOutline,
  pdfViewerStore
};

export {
  PdfViewer,
  PdfTopToolbar,
  PdfBottomToolbar,
  PdfThumbnail,
  PdfOutline,
  pdfViewerStore
};
