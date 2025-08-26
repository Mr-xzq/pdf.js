import PdfViewer from './components/PdfViewer.vue';
import PdfViewerCore from './components/viewer/PdfViewerCore.vue';
import PdfPageContainer from './components/viewer/PdfPageContainer.vue';
import PdfLoadingProgress from './components/viewer/PdfLoadingProgress.vue';
import { installPdfReaderModule } from './store/index.js';

// 组件安装函数
const install = function(Vue, options = {}) {
  // 注册主要组件
  Vue.component('PdfViewer', PdfViewer);
  Vue.component('PdfViewerCore', PdfViewerCore);
  Vue.component('PdfPageContainer', PdfPageContainer);
  Vue.component('PdfLoadingProgress', PdfLoadingProgress);

  // 如果传入了 store，注册 Vuex 模块
  if (options.store) {
    installPdfReaderModule(options.store);
    console.log('PDF Reader: Vuex 模块已注册');
  }
};

// 自动安装（如果在浏览器环境中直接引入）
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export default {
  install,
  PdfViewer,
  PdfViewerCore,
  PdfPageContainer,
  PdfLoadingProgress
};

export {
  PdfViewer,
  PdfViewerCore,
  PdfPageContainer,
  PdfLoadingProgress,
  installPdfReaderModule
};
