import { MIN_SCALE, MAX_SCALE } from "../../core";

export default {
  data() {
    return {
      // 平移与边界
      panX: 0,
      panY: 0,
      panStartX: 0,
      panStartY: 0,
      panAtStartX: 0,
      panAtStartY: 0,
      isPanning: false,
      contentWidth: 0,
      contentHeight: 0,
      containerWidth: 0,
      containerHeight: 0,

      // Pinch 缩放状态
      isPinching: false,
      pinchStartDistance: 0,
      pinchStartScale: 1,
      pinchCenterX: 0,
      pinchCenterY: 0,
      pinchStartContentWidth: 0,
      pinchStartContentHeight: 0,

      // 双击检测
      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,

      // 初次适配的基线缩放（用于“缩小”恢复）
      initialFitScale: 0,
    };
  },

  computed: {
    panStyle() {
      return {
        transform: `translate(${this.panX}px, ${this.panY}px)`,
        willChange: "transform",
        cursor:
          this.currentScale > 1
            ? this.isPanning
              ? "grabbing"
              : "grab"
            : "default",
      };
    },
  },

  methods: {
    // 工具：容器尺寸、基线缩放、边界裁剪
    updateContainerSize() {
      const el = this.$refs.content || this.$refs.viewerContainer;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      this.containerWidth = rect.width || 0;
      this.containerHeight = rect.height || 0;
    },

    // 获取基线缩放（优先取首次适配的宽度比例）
    getBaselineScale() {
      return this.initialFitScale || this.initialScale || 1.0;
    },

    // 约束平移边界（横向以居中为原点，纵向以顶部对齐为原点）
    clampPan() {
      const cw = this.containerWidth || 0;
      const ch = this.containerHeight || 0;
      const pw = this.contentWidth || 0;
      const ph = this.contentHeight || 0;

      // X 轴
      let minX = 0,
        maxX = 0;
      if (pw > cw) {
        const cx = (pw - cw) / 2;
        minX = -cx;
        maxX = cx;
      }

      // Y 轴
      let minY = 0,
        maxY = 0;
      if (ph > ch) {
        minY = -(ph - ch);
        maxY = 0;
      }

      if (this.panX < minX) this.panX = minX;
      if (this.panX > maxX) this.panX = maxX;
      if (this.panY < minY) this.panY = minY;
      if (this.panY > maxY) this.panY = maxY;
    },

    /**
     * 画布点击：左右翻页 + 双击缩放
     */
    onCanvasClick(payload) {
      try {
        const { x, event } = payload || {};
        const target = event?.target;
        const width = target?.clientWidth || 0;
        if (!width) return;

        const now = Date.now();
        const dt = now - this.lastTapTime;
        const dx = Math.abs((x || 0) - (this.lastTapX || 0));
        const isDoubleTap = dt < 300 && dx < 24;
        this.lastTapTime = now;
        this.lastTapX = x || 0;
        this.lastTapY = 0;

        if (this.gesturesEnabled && isDoubleTap) {
          const baseline = this.getBaselineScale();
          const oldScale = this.currentScale || 1;
          const targetZoom =
            typeof this.zoomTarget === "number" && this.zoomTarget > 0
              ? this.zoomTarget
              : baseline * 1.5;
          const newScale =
            oldScale <= baseline + 0.01
              ? Math.min(targetZoom, MAX_SCALE)
              : baseline;

          const container =
            this.$refs.content ||
            this.$refs.viewerContainer ||
            target?.parentElement;
          const rect = container?.getBoundingClientRect?.();
          if (rect) {
            const Cx = event.clientX - rect.left;
            const Cy = event.clientY - rect.top;
            const k = newScale / (oldScale || 1);
            this.panX = this.panX + (1 - k) * (Cx - this.panX);
            this.panY = this.panY + (1 - k) * (Cy - this.panY);
            const startW = this.contentWidth || 0;
            const startH = this.contentHeight || 0;
            this.contentWidth = startW * k;
            this.contentHeight = startH * k;
            this.$nextTick(() => this.clampPan());
          }

          this.currentScale = newScale;
          this.setScale(newScale);
          return; // 阻止翻页
        }

        if (x < width / 2) {
          this.prevPage();
        } else {
          this.nextPage();
        }
      } catch (e) {
        console.warn("onCanvasClick 处理失败:", e);
      }
    },

    /**
     * 简单双指/鼠标拖拽平移/捏合
     */
    onPanStart(e) {
      if (!this.gesturesEnabled) return;
      const touches = e.touches ? e.touches : null;

      // 放行注释层链接点击
      if (touches) {
        const tgt = e.target;
        if (
          tgt &&
          tgt.closest &&
          tgt.closest(
            ".annotationLayer a, .annotationLayer .linkAnnotation, .pdf-page-container__annotation-layer a"
          )
        ) {
          this.isPanning = false;
          this.isPinching = false;
          return;
        }
      }

      if (touches && touches.length >= 2) {
        // 开始捏合
        this.isPinching = true;
        const [t1, t2] = touches;
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        this.pinchStartDistance = Math.hypot(dx, dy) || 1;
        this.pinchStartScale = this.currentScale;
        const rect = (
          this.$refs.content || this.$refs.viewerContainer
        ).getBoundingClientRect();
        this.pinchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
        this.pinchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
        this.pinchStartContentWidth = this.contentWidth || 0;
        this.pinchStartContentHeight = this.contentHeight || 0;
        this.panStartX = this.pinchCenterX;
        this.panStartY = this.pinchCenterY;
        this.panAtStartX = this.panX;
        this.panAtStartY = this.panY;
        if (e && e.cancelable) e.preventDefault();
        return;
      }

      // 单指拖拽
      const point = touches ? touches[0] : e;
      this.isPanning = this.currentScale > this.getBaselineScale() + 0.001;
      this.panStartX = point.clientX;
      this.panStartY = point.clientY;
      this.panAtStartX = this.panX;
      this.panAtStartY = this.panY;
      if (this.isPanning && e && e.cancelable) e.preventDefault();
    },

    onPanMove(e) {
      if (!this.gesturesEnabled) return;
      const touches = e.touches ? e.touches : null;
      if ((this.isPinching || this.isPanning) && e && e.cancelable)
        e.preventDefault();
      if (this.isPinching && touches && touches.length >= 2) {
        const [t1, t2] = touches;
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.hypot(dx, dy) || 1;
        const scaleFactor = dist / (this.pinchStartDistance || 1);
        let nextScale = this.pinchStartScale * scaleFactor;
        nextScale = Math.min(Math.max(nextScale, MIN_SCALE), MAX_SCALE);
        if (Math.abs(nextScale - this.currentScale) > 0.001) {
          const k = nextScale / (this.pinchStartScale || 1);
          const Cx = this.pinchCenterX;
          const Cy = this.pinchCenterY;
          this.panX = this.panAtStartX + (1 - k) * (Cx - this.panAtStartX);
          this.panY = this.panAtStartY + (1 - k) * (Cy - this.panAtStartY);
          const startW = this.pinchStartContentWidth || this.contentWidth || 0;
          const startH =
            this.pinchStartContentHeight || this.contentHeight || 0;
          this.contentWidth = startW * k;
          this.contentHeight = startH * k;
          this.currentScale = nextScale;
          this.setScale(nextScale);
          this.$nextTick(() => this.clampPan());
        }
        return;
      }

      if (!this.isPanning) return;
      const point = touches ? touches[0] : e;
      const dx = point.clientX - this.panStartX;
      const dy = point.clientY - this.panStartY;
      this.panX = this.panAtStartX + dx;
      this.panY = this.panAtStartY + dy;
      this.clampPan();
    },

    onPanEnd() {
      this.isPanning = false;
      this.isPinching = false;
    },
  },
};
