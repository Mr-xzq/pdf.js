/**
 * PDF Reader Vue 2 组件库
 *
 * 当前状态：MVP 阶段
 * - ✅ 核心 PDF 阅读功能
 * - ✅ 基础导航和缩放
 * - ✅ 移动端优化
 * - ✅ 基础密码事件处理（事件传递）
 * - ✅ 脚本执行已禁用（安全优先）
 *
 * 后期扩展功能（阶段6）：
 * - 🔄 密码对话框组件
 * - 🔄 JavaScript 脚本处理
 * - 🔄 高级搜索功能
 * - 🔄 注释系统
 *
 */

import PdfViewer from './components/PdfViewer.vue';
import PdfViewerCore from './components/viewer/PdfViewerCore.vue';
import PdfPageContainer from './components/viewer/PdfPageContainer.vue';
import PdfLoadingProgress from './components/viewer/PdfLoadingProgress.vue';

// 阶段3：工具栏组件
import PdfTopToolbar from './components/toolbar/PdfTopToolbar.vue';
import PdfBottomToolbar from './components/toolbar/PdfBottomToolbar.vue';
import PdfButton from './components/shared/PdfButton.vue';
import PdfNavigation from './components/controls/PdfNavigation.vue';
import PdfPageInput from './components/controls/PdfPageInput.vue';
import PdfZoomControl from './components/controls/PdfZoomControl.vue';

// 阶段4：功能组件
import PdfOutline from './components/features/PdfOutline.vue';
import PdfThumbnail from './components/features/PdfThumbnail.vue';
import PdfSidebar from './components/sidebar/PdfSidebar.vue';

import { installPdfReaderModule } from './store/index.js';

// 组件安装函数
const install = function(Vue, options = {}) {
  // 注册主要组件
  Vue.component('PdfViewer', PdfViewer);
  Vue.component('PdfViewerCore', PdfViewerCore);
  Vue.component('PdfPageContainer', PdfPageContainer);
  Vue.component('PdfLoadingProgress', PdfLoadingProgress);

  // 阶段3：注册工具栏组件
  Vue.component('PdfTopToolbar', PdfTopToolbar);
  Vue.component('PdfBottomToolbar', PdfBottomToolbar);
  Vue.component('PdfButton', PdfButton);
  Vue.component('PdfNavigation', PdfNavigation);
  Vue.component('PdfPageInput', PdfPageInput);
  Vue.component('PdfZoomControl', PdfZoomControl);

  // 阶段4：注册功能组件
  Vue.component('PdfOutline', PdfOutline);
  Vue.component('PdfThumbnail', PdfThumbnail);
  Vue.component('PdfSidebar', PdfSidebar);

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
  // 核心组件
  PdfViewer,
  PdfViewerCore,
  PdfPageContainer,
  PdfLoadingProgress,
  // 阶段3：工具栏组件
  PdfTopToolbar,
  PdfBottomToolbar,
  PdfButton,
  PdfNavigation,
  PdfPageInput,
  PdfZoomControl,
  // 阶段4：功能组件
  PdfOutline,
  PdfThumbnail,
  PdfSidebar
};

export {
  // 核心组件
  PdfViewer,
  PdfViewerCore,
  PdfPageContainer,
  PdfLoadingProgress,

  // 阶段3：工具栏组件
  PdfTopToolbar,
  PdfBottomToolbar,
  PdfButton,
  PdfNavigation,
  PdfPageInput,
  PdfZoomControl,

  // 阶段4：功能组件
  PdfOutline,
  PdfThumbnail,
  PdfSidebar,

  // 工具函数
  installPdfReaderModule
};
