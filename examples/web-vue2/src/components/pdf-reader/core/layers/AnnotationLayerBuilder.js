// AnnotationLayerBuilder：封装 Link 注释渲染与行为，优先复用 linkService
import { BaseLayerBuilder } from './BaseLayerBuilder';

export class AnnotationLayerBuilder extends BaseLayerBuilder {
  constructor(ctx) {
    super(ctx);
  }

  async render() {
    if (!this.initialized || this.cancelled) return;

    // 清空
    this.layer.innerHTML = '';

    try {
      const page = await this.pdfServices.application?.getPage(this.pageNumber);
      if (!page) return;
      const annotations = await page.getAnnotations({ intent: 'display' });

      const services = this.getServices?.() || null;
      const linkService = services?.linkService || null;
      const pdfDoc = this.pdfServices.application?.pdfDocument;

      for (const annotation of annotations) {
        if (annotation.subtype !== 'Link') continue;

        // 计算在视口下的坐标
        let left = 0, top = 0, width = 0, height = 0;
        if (this.viewport && annotation.rect && annotation.rect.length === 4) {
          const [x1, y1, x2, y2] = this.viewport.convertToViewportRectangle(annotation.rect);
          left = Math.min(x1, x2);
          top = Math.min(y1, y2);
          width = Math.abs(x1 - x2);
          height = Math.abs(y1 - y2);
        }

        const a = document.createElement('a');
        a.className = 'linkAnnotation';
        a.setAttribute('role', 'link');
        a.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;` +
          `pointer-events:auto;background:rgba(0,0,255,0.06);border:1px solid rgba(0,0,255,0.15);`;

        if (annotation.dest) {
          a.href = '#';
          a.addEventListener('click', async (evt) => {
            evt.preventDefault();
            try {
              // 优先通过服务层统一解析与分发
              if (this.pdfServices?.goToDestination) {
                await this.pdfServices.goToDestination(annotation.dest);
                return;
              }
              // 回退路径：手动解析 explicitDest -> 页码
              let explicitDest = annotation.dest;
              if (typeof explicitDest === 'string') {
                explicitDest = await pdfDoc.getDestination(explicitDest);
              }
              if (Array.isArray(explicitDest)) {
                const destRef = explicitDest[0];
                let pageNumber = null;
                if (destRef && typeof destRef === 'object') {
                  pageNumber = (await pdfDoc.getPageIndex(destRef)) + 1;
                } else if (Number.isInteger(destRef)) {
                  pageNumber = destRef + 1;
                }
                if (pageNumber && this.pdfServices.vueComponent?.$store) {
                  this.pdfServices.vueComponent.$store.dispatch('pdfReader/viewer/goToPage', pageNumber);
                }
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('内部链接解析失败:', e);
            }
          });
        } else if (annotation.url) {
          if (linkService) {
            linkService.addLinkAttributes(a, annotation.url, annotation.newWindow ?? true);
          } else {
            a.href = annotation.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer nofollow';
          }
        } else {
          a.href = '#';
        }

        this.layer.appendChild(a);
      }

      // 尺寸同步
      if (this.viewport) {
        this.layer.style.width = `${this.viewport.width}px`;
        this.layer.style.height = `${this.viewport.height}px`;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('AnnotationLayerBuilder 渲染失败（忽略）:', e);
    }
  }
}

