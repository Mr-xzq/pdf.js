import MobileSimplePdfReader from "./mobile/simple/index.vue";
import MobileComplexPdfReader from "./mobile/complex/index.vue";

// Desktop 复杂版当前作为 mobile/complex 的同构实现
import DesktopComplexPdfReader from "./desktop/complex/index.vue";

// suceess
// import * as pdfjsLib from "pdfjs-dist/webpack.mjs";

// 尝试另外的导入方式
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// 不支持，这样好像会走内部的构建过程，而我们缺少构建它的环境，其实我们只希望原本路径拿过来用即可
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/legacy/build/pdf.worker.mjs",
//   import.meta.url
// ).toString();

// 不支持，可能是因为 new Worker 不允许变量的形式，还是因为别的原因
// const workerPath = new URL(
//   "pdfjs-dist/legacy/build/pdf.worker.mjs",
//   import.meta.url
// );
// pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(workerPath, {
//   type: "module",
// });

// pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
//   new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
//   {
//     type: "module",
//   }
// );

// pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
//   'http://127.0.0.1:5678' + '/pdfjs-dist/legacy/build/pdf.worker.mjs',
//   { type: "module" }
// );

// success
// pdfjsLib.GlobalWorkerOptions.workerSrc =
//   "http://127.0.0.1:5678" + "/libs/pdfjs-dist/legacy/build/pdf.worker.mjs";

// 调试代码
// const workerPath = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
// console.log('workerPath:', workerPath.href);
// console.log('import.meta.url:', import.meta.url);

// // 对比两个 URL 是否相同
// const inlineUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
// console.log('URLs equal:', workerPath.href === inlineUrl.href);

let _libInitialized = false;

function initializePdfJs() {
  console.log("load worker");
  if (!_libInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
      { type: "module" }
    );
    _libInitialized = true;
  }
  return pdfjsLib;
}

initializePdfJs();

// 保留旧导出名，同时导出 Mobile / Desktop 命名别名
export {
  // 向后兼容旧名称
  MobileSimplePdfReader as SimplePdfReader,
  MobileComplexPdfReader as ComplexPdfReader,
  // 显式的 Mobile 命名
  MobileSimplePdfReader,
  MobileComplexPdfReader,
  // Desktop 复杂版
  DesktopComplexPdfReader,
};
