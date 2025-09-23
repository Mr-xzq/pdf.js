// AnnotationLayerBuilder（官方构建器封装版）：渲染表单与链接等注释，行为与官方一致
import { BaseLayerBuilder } from "./BaseLayerBuilder";
import { getPdfjsViewer } from "../pdf-config.js";

export class AnnotationLayerBuilder extends BaseLayerBuilder {
  constructor(ctx) {
    super(ctx);
    this._builder = null; // pdfjsViewer.AnnotationLayerBuilder 实例
  }

  async render() {
    if (!this.initialized || this.cancelled) return;

    // 清空容器
    this.layer.innerHTML = "";

    try {
      const page = await this.pdfServices.application?.getPage(this.pageNumber);
      if (!page) return;

      const services = this.getServices?.() || {};
      const appLinkService = services.linkService;

      // 适配器：将注释层中的“内部链接”跳转，统一委托给我们自己的 PdfServices.goToDestination，
      // 以驱动 Vuex 状态与自定义视图（不依赖官方 PDFViewer 实例）。
      const linkService = {
        // 外部链接：直接设置 a 标签属性
        addLinkAttributes(el, url, newWindow = true) {
          try {
            el.href = url;
            el.rel = "noopener noreferrer nofollow";
            el.target = newWindow ? "_blank" : "_self";
          } catch (_) {}
        },
        // 供 AnnotationLayer 设定锚点（内部链接也会调用），返回一个 hash
        getDestinationHash(dest) {
          try {
            if (typeof dest === "string") {
              return "#" + encodeURIComponent(dest);
            }
            if (Array.isArray(dest)) {
              return "#" + encodeURIComponent(JSON.stringify(dest));
            }
          } catch (_) {}
          return "#";
        },
        // 兼容接口：返回带 baseUrl 的锚点（我们不使用 baseUrl，直接回传）
        getAnchorUrl(anchor) {
          return typeof anchor === "string" ? anchor : "#";
        },
        // 内部目的地跳转（dest 可为 name 或 explicitDest 数组）
        async goToDestination(dest) {
          try {
            console.debug("[AnnotationLinkService] goToDestination ->", dest);
            if (thisPdfServices) {
              await thisPdfServices.goToDestination(dest);
            } else if (appLinkService?.goToDestination) {
              // 退回官方服务（不建议，可能因缺少 PDFViewer 而无效）
              await appLinkService.goToDestination(dest);
            }
          } catch (e) {
            console.warn("linkService.goToDestination 失败:", e);
          }
        },
        // 一些注释可能使用 hash 形式（如 #page=3 或命名目的地）
        async setHash(hash) {
          try {
            console.debug("[AnnotationLinkService] setHash ->", hash);
            if (typeof hash === "string" && hash) {
              const m = hash.match(/page=(\d+)/i);
              if (m && m[1]) {
                const n = parseInt(m[1], 10);
                if (Number.isFinite(n) && thisPdfServices) {
                  await thisPdfServices.goToDestination([n - 1]);
                  return;
                }
              }
              // 尝试将 hash 当作命名目的地处理
              if (thisPdfServices) {
                await thisPdfServices.goToDestination(hash);
                return;
              }
            }
            // 最后退回官方实现
            appLinkService?.setHash?.(hash);
          } catch (e) {
            console.warn("linkService.setHash 失败:", e);
          }
        },
      };
      // 通过闭包捕获 PdfServices，供适配器使用
      const thisPdfServices = this.pdfServices;
      // 为了兼容官方 AnnotationLayerBuilder 的演示模式事件监听，这里补充 eventBus
      linkService.eventBus = services.eventBus || null;

      const pdfjsViewer = getPdfjsViewer();

      this._builder = new pdfjsViewer.AnnotationLayerBuilder({
        pdfPage: page,
        linkService,
        renderForms: true,
        enableScripting: false,
        onAppend: div => {
          // div.className === 'annotationLayer'
          this.layer.appendChild(div);
        },
      });

      // 渲染注释层（"display" 意图）
      await this._builder.render(this.viewport, "display");

      // 尺寸同步：不仅同步容器（this.layer），也同步内部 annotationLayer div
      if (this.viewport) {
        const w = `${this.viewport.width}px`;
        const h = `${this.viewport.height}px`;
        this.layer.style.width = w;
        this.layer.style.height = h;
        try {
          const inner = this._builder?.div; // 官方 AnnotationLayerBuilder 创建的 div.annotationLayer
          if (inner) {
            inner.style.width = w;
            inner.style.height = h;
            inner.style.left = "0px";
            inner.style.top = "0px";
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn("AnnotationLayerBuilder 渲染失败（忽略）:", e);
    }
  }

  cancel() {
    super.cancel();
    try {
      this._builder?.cancel?.();
    } catch (_) {}
  }

  destroy() {
    this.cancel();
    this._builder = null;
    super.destroy();
  }
}
