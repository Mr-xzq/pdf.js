import { resolveDestToPage } from "./pdf-utils.js";

export function createPdfServices(store, options = {}) {
  const getDoc = () => store?.state?.pdfReader?.document?.pdfDocument || null;

  return {

    // 页面/大纲访问
    async getPage(pageNumber) {
      const doc = getDoc();
      if (!doc) throw new Error("文档未加载");
      if (pageNumber < 1 || pageNumber > (doc.numPages || 0)) throw new Error(`页码超出范围: ${pageNumber}`);
      return await doc.getPage(pageNumber);
    },

    async getOutline() {
      const doc = getDoc();
      if (!doc) throw new Error("文档未加载");
      try { return await doc.getOutline(); } catch (_) { return null; }
    },


    // 统一目的地解析/跳转
    async goToDestination(dest) {
      const navigateToDestination = options?.navigateToDestination;
      if (typeof navigateToDestination === "function") {
        try { return await navigateToDestination(dest); } catch (e) { console.warn("navigateToDestination 回退到本地解析:", e); }
      }
      const doc = getDoc();
      if (!doc) throw new Error("PDF 文档未加载");
      const pageNumber = await resolveDestToPage(doc, dest);
      if (!pageNumber) throw new Error("无法解析目的地页码");
      return pageNumber;
    },

    async resolveDestinationToPage(dest) {
      const doc = getDoc();
      try { return await resolveDestToPage(doc, dest); } catch (_) { return null; }
    },

    // 文档状态（供外层判断就绪）
    get documentState() {
      const doc = getDoc();
      return { loaded: !!doc, loading: !!store?.state?.pdfReader?.document?.loading, totalPages: doc?.numPages || 0 };
    },
  };
}


