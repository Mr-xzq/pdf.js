<template>
  <div
    class="gesture-container"
    ref="container"
    @touchstart="onPanStart"
    @touchmove="onPanMove"
    @touchend="onPanEnd"
  >
    <div class="gesture-container__pan" :style="panStyle">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: "GestureContainer",
  props: {
    // 外部驱动的缩放值（来自父组件/Store）
    scale: { type: Number, default: 1 },
    // 手势开关（默认启用）
    gesturesEnabled: { type: Boolean, default: true },
  },
  data() {
    return {
      // 与手势强相关的内部状态
      currentScaleInternal: this.scale || 1,

      // 平移与边界
      panX: 0,
      panY: 0,
      panStartX: 0,
      panStartY: 0,
      panAtStartX: 0,
      panAtStartY: 0,
      isPanning: false,
      // 注释点击识别与拖拽判定
      maybeLinkTap: false,
      maybeTapTarget: null,
      panMoved: false,
      panThreshold: 6,

      // 记录是否曾阻止默认行为，用于决定是否需要合成点击
      _synthClickNeeded: false,

      contentWidth: 0,
      contentHeight: 0,
      containerWidth: 0,
      containerHeight: 0,

      // 初次适配的基线缩放（用于“缩小”恢复）
      initialFitScale: 0,
    };
  },
  computed: {
    currentScale() {
      return this.currentScaleInternal;
    },
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
  watch: {
    scale(n) {
      if (
        typeof n === "number" &&
        Math.abs(n - this.currentScaleInternal) > 0.0005
      ) {
        this.currentScaleInternal = n;
      }
    },
  },
  methods: {
    // 供父组件调用：设置内容尺寸（来自页面渲染后的 viewport）
    setContentSize(width, height) {
      this.contentWidth = width || 0;
      this.contentHeight = height || 0;
    },
    // 供父组件调用：设置基线缩放（fitWidthOnce 计算得到）
    setInitialFitScale(scale) {
      this.initialFitScale = scale || 0;
    },
    // 供父组件调用：更新容器尺寸
    updateContainerSize() {
      const el = this.$refs.container;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      this.containerWidth = rect.width || 0;
      this.containerHeight = rect.height || 0;
    },
    // 供父组件调用：裁剪平移边界
    clampPan() {
      const cw = this.containerWidth || 0;
      const ch = this.containerHeight || 0;
      const pw = this.contentWidth || 0;
      const ph = this.contentHeight || 0;

      // X 轴：内容超出容器则可左右拖动（中心对齐）
      let minX = 0,
        maxX = 0;
      if (pw > cw) {
        const cx = (pw - cw) / 2;
        minX = -cx;
        maxX = cx;
      }

      // Y 轴：内容超出容器则可上下拖动（顶部对齐）
      let minY = 0,
        maxY = 0;
      if (ph > ch) {
        const cy = (ph - ch) / 2;
        minY = -cy;
        maxY = cy;
      }

      if (this.panX < minX) this.panX = minX;
      if (this.panX > maxX) this.panX = maxX;
      if (this.panY < minY) this.panY = minY;
      if (this.panY > maxY) this.panY = maxY;
    },

    // 注释层交互在拖拽中禁用，防止链接拦截拖拽
    _disableAnnotationInteractivity() {
      const root = this.$refs.container;
      if (!root) return;
      root.querySelectorAll(".annotationLayer").forEach(el => {
        el.classList.add("disabled");
      });
    },
    _enableAnnotationInteractivity() {
      const root = this.$refs.container;
      if (!root) return;
      root.querySelectorAll(".annotationLayer.disabled").forEach(el => {
        el.classList.remove("disabled");
      });
    },

    // 基线缩放（优先取首次适配的宽度比例）
    getBaselineScale() {
      return this.initialFitScale || 1.0;
    },

    // 对外公开：处理 PdfPage 发出的 canvas-click 事件（已移除双击缩放，仅保留左右翻页）
    onCanvasClick(payload) {
      try {
        const { x, event } = payload || {};
        const target = event?.target;
        const width = target?.clientWidth || 0;
        if (!width) return;
        if (x < width / 2) {
          this.$emit("request-prev-page");
        } else {
          this.$emit("request-next-page");
        }
      } catch (e) {
        console.warn("onCanvasClick 处理失败:", e);
      }
    },

    // 手势：平移/捏合
    onPanStart(e) {
      if (!this.gesturesEnabled) return;
      const touches = e.touches ? e.touches : null;

      // 记录起始目标；若起点在注释链接上，延后到 touchend 决定是否触发点击
      this.maybeTapTarget = e.target || null;
      this.maybeLinkTap = !!(
        this.maybeTapTarget &&
        this.maybeTapTarget.closest &&
        this.maybeTapTarget.closest(
          ".annotationLayer a, .annotationLayer .linkAnnotation, .pdf-page-container__annotation-layer a"
        )
      );
      this.panMoved = false;
      this._synthClickNeeded = false;

      if (touches && touches.length >= 2) {
        // 多指操作时，不处理（已移除捏合缩放）
        return;
      }

      // 单指：初始不进入“拖拽”状态，等待达到阈值后再决定
      const point = touches ? touches[0] : e;
      this.isPanning = false;
      this.panStartX = point.clientX;
      this.panStartY = point.clientY;
      this.panAtStartX = this.panX;
      this.panAtStartY = this.panY;
      // 注意：此处不调用 preventDefault，避免阻断注释链接的原生按压/高亮
    },

    onPanMove(e) {
      if (!this.gesturesEnabled) return;
      const touches = e.touches ? e.touches : null;

      const point = touches ? touches[0] : e;
      const dx = point.clientX - this.panStartX;
      const dy = point.clientY - this.panStartY;
      const moved = Math.hypot(dx, dy) > (this.panThreshold || 6);

      // 当放大且移动超过阈值时，才进入拖拽模式并阻止默认事件
      if (
        !this.isPanning &&
        this.currentScale > this.getBaselineScale() + 0.001 &&
        moved
      ) {
        this.isPanning = true;
        if (e && e.cancelable) {
          e.preventDefault();
          this._synthClickNeeded = true; // 原生点击可能不会触发，稍后合成
        }
        this.panMoved = true;
        this._disableAnnotationInteractivity();
      }

      if (!this.isPanning) return;

      this.panX = this.panAtStartX + dx;
      this.panY = this.panAtStartY + dy;
      this.clampPan();
    },

    onPanEnd() {
      this.isPanning = false;
      this._enableAnnotationInteractivity();

      try {
        // 若触发点为注释链接且未发生有效位移
        if (this.maybeLinkTap && !this.panMoved && this.maybeTapTarget) {
          if (this._synthClickNeeded) {
            // 在拖拽中曾阻止默认行为，补发一次点击
            this.maybeTapTarget.click && this.maybeTapTarget.click();
          } // 否则交由浏览器的原生点击/高亮处理
        }
      } catch (_) {}

      this.maybeLinkTap = false;
      this.maybeTapTarget = null;
      this.panMoved = false;
      this._synthClickNeeded = false;
    },
  },
};
</script>

<style lang="less" scoped>
.gesture-container {
  width: 100%;
  height: 100%;
  overflow: hidden; // 不出现滚动条
  display: flex;
  justify-content: center;
  align-items: center; // 垂直居中
  padding: 0;
  min-height: 0;
  touch-action: none; // 允许自定义手势（禁用浏览器默认手势）
  user-select: none;
}

.gesture-container__pan {
  will-change: transform;
}

// 拖拽期间禁用注释层交互，避免链接阻塞平移
:deep(.annotationLayer.disabled) {
  pointer-events: none !important;
}
</style>
