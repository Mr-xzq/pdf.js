<template>
  <div
    ref="container"
    :class="['gesture-container', { 'is-panning': isPanning }]"
    @touchstart="onPanStart"
    @touchmove="onPanMove"
    @touchend="onPanEnd"
  >
    <div class="gesture-container__pan" :style="panStyle" ref="pan">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: "GestureContainer",
  props: {
    // 启用或禁用手势功能
    gesturesEnabled: { type: Boolean, default: true },
    // CSS 选择器，用于在 slot 内容中定位需要进行尺寸观察的内容节点
    contentSelector: { type: String, required: true, default: "" },
    // 拖拽手势的触发阈值（单位：像素）
    // 触摸移动的距离超过这个值才会被识别为拖拽，以区分轻微抖动和真正的拖拽
    panThreshold: { type: Number, default: 6 },
  },
  data() {
    return {
      // --- 平移与边界状态 ---
      // 当前 X 轴的平移量
      panX: 0,
      // 当前 Y 轴的平移量
      panY: 0,
      // 触摸开始时的 X 坐标 (clientX)
      panStartX: 0,
      // 触摸开始时的 Y 坐标 (clientY)
      panStartY: 0,
      // 触摸开始时，panX 的初始值
      panAtStartX: 0,
      // 触摸开始时, panY 的初始值
      panAtStartY: 0,
      // 标志位，表示当前是否正处于拖拽状态
      isPanning: false,

      // --- 用于处理链接点击与拖拽冲突的状态 ---
      // 这是一个特殊处理，用于确保当用户意图是点击链接（而不是拖拽）时，点击事件能够被正确触发
      // 标志位，触摸起始点是否可能是一个链接
      maybeLinkTap: false,
      // 触摸起始点的 DOM 元素
      maybeTapTarget: null,
      // 标志位，本次触摸操作是否发生了有效的位移
      panMoved: false,

      // 记录在拖拽过程中是否曾调用过 preventDefault()
      // 如果调用过，浏览器的原生 click 事件可能被阻止，此时需要我们手动合成一个点击事件
      synthClickNeeded: false,

      // 内容节点的宽度
      contentWidth: 0,
      // 内容节点的高度
      contentHeight: 0,
      // 外部容器的宽度
      containerWidth: 0,
      // 外部容器的高度
      containerHeight: 0,

      // 监听外部容器尺寸变化的 ResizeObserver
      containerResizeObserver: null,
      // 监听内容节点尺寸变化的 ResizeObserver
      contentResizeObserver: null,
    };
  },
  computed: {
    // 动态计算平移容器的样式
    panStyle() {
      return {
        // 使用 translate 实现平移，性能较好
        transform: `translate(${this.panX}px, ${this.panY}px)`,
        // 提前通知浏览器该元素的 transform 属性会频繁变化，浏览器有可能会对其有所优化
        willChange: "transform",
      };
    },
  },

  mounted() {
    this.initSizeObservers();
  },

  methods: {
    // 初始化 ResizeObserver，用于监听容器和内容尺寸的变化
    initSizeObservers() {
      const container = this.$refs.container;
      const pan = this.$refs.pan;

      // 观察外部容器的尺寸变化
      if (typeof ResizeObserver !== "undefined" && container) {
        this.containerResizeObserver = new ResizeObserver(() => {
          const rect = container.getBoundingClientRect();
          this.containerWidth = rect.width || 0;
          this.containerHeight = rect.height || 0;
          // 容器尺寸变化后，需要重新计算并校正平移边界
          this.clampPan();
        });
        this.containerResizeObserver.observe(container);
      }

      // 根据 contentSelector 找到要观察的内容节点
      const pickContentTarget = () => {
        if (!pan || !this.contentSelector) return;
        return pan.querySelector(this.contentSelector);
      };

      // 观察内容节点的尺寸变化
      if (typeof ResizeObserver !== "undefined") {
        this.contentResizeObserver = new ResizeObserver(entries => {
          const rect = entries?.[0]?.contentRect;
          if (!rect) return;
          this.contentWidth = rect.width || 0;
          this.contentHeight = rect.height || 0;

          // 内容尺寸变化后，也需要重新计算并校正平移边界
          this.clampPan();
        });
        const contentTarget = pickContentTarget();

        if (contentTarget) {
          this.contentResizeObserver.observe(contentTarget);
        }
      }

      // 设置清理逻辑
      const cleanup = () => {
        this.containerResizeObserver?.disconnect?.();
        this.contentResizeObserver?.disconnect?.();
      };
      this.$on("hook:beforeDestroy", cleanup);
    },

    /**
     * 计算某一条轴向（X 或 Y）的平移边界（对齐驱动）
     * - overflow: 溢出量（内容尺寸 - 容器尺寸；<= 0 表示无溢出，不允许平移）
     * - align: center | start | end
     *   center: 以中心为零位，区间 [-(overflow/2), +(overflow/2)]
     *   start:  以起始边（左/上）为锚点，区间 [-(overflow), 0]
     *   end:    以末端边（右/下）为锚点，区间 [0, +(overflow)]
     */
    computeAxisBounds({ overflow, align }) {
      if (!overflow || overflow <= 0) return [0, 0];
      switch (align) {
        case "start":
          return [-overflow, 0];
        case "end":
          return [0, overflow];
        case "center":
        default:
          return [-(overflow / 2), overflow / 2];
      }
    },

    // 限制平移的边界（依据容器/内容尺寸与对齐方式）
    clampPan() {
      const cw = this.containerWidth || 0;
      const ch = this.containerHeight || 0;
      const pw = this.contentWidth || 0;
      const ph = this.contentHeight || 0;

      const overflowX = Math.max(0, pw - cw);
      const overflowY = Math.max(0, ph - ch);

      const horizontalAlign = "center";
      const verticalAlign = "center";
      const [minX, maxX] = this.computeAxisBounds({
        overflow: overflowX,
        align: horizontalAlign,
      });
      const [minY, maxY] = this.computeAxisBounds({
        overflow: overflowY,
        align: verticalAlign,
      });

      // 校正当前的 panX 和 panY，确保它们落在边界区间内
      if (this.panX < minX) this.panX = minX;
      if (this.panX > maxX) this.panX = maxX;
      if (this.panY < minY) this.panY = minY;
      if (this.panY > maxY) this.panY = maxY;
    },

    // --- 手势事件处理 ---

    onPanStart(e) {
      if (!this.gesturesEnabled) return;
      const touches = e?.touches;

      // 记录起始目标元素，为处理链接点击做准备
      this.maybeTapTarget = e.target;
      // 判断起始点是否在 `.annotationLayer a` 元素（PDF注释链接 - 目录）
      this.maybeLinkTap = !!this.maybeTapTarget?.closest(".annotationLayer a");
      // 重置状态
      this.panMoved = false;
      this.synthClickNeeded = false;

      // 忽略多指操作（比如捏合缩放功能等）
      if (touches?.length >= 2) {
        return;
      }

      // 对于单指触摸，先记录起始信息，但不立即进入“拖拽”状态
      const point = touches ? touches[0] : e;
      this.isPanning = false;
      this.panStartX = point.clientX;
      this.panStartY = point.clientY;
      this.panAtStartX = this.panX;
      this.panAtStartY = this.panY;
    },

    onPanMove(e) {
      if (!this.gesturesEnabled) return;
      const touches = e?.touches;

      const point = touches ? touches[0] : e;
      // 计算 X 轴位移
      const dx = point.clientX - this.panStartX;
      // 计算 Y 轴位移
      const dy = point.clientY - this.panStartY;
      // 判断总位移是否超过阈值
      const moved = Math.hypot(dx, dy) > this.panThreshold;

      // 检查内容是否在任一方向上溢出容器（需要加 1px 的容错）
      const overflowX =
        (this.contentWidth || 0) > (this.containerWidth || 0) + 1;
      const overflowY =
        (this.contentHeight || 0) > (this.containerHeight || 0) + 1;
      const overflow = overflowX || overflowY;

      // 当尚未进入拖拽状态、内容确实溢出、且移动距离超过阈值时，才正式进入拖拽模式，并阻止浏览器的默认行为（如页面滚动）
      if (!this.isPanning && overflow && moved) {
        this.isPanning = true;
        // 表明该事件是否可以被取消
        if (e?.cancelable) {
          // 阻止默认行为
          e.preventDefault();
          // 标记需要后续合成点击事件
          this.synthClickNeeded = true;
        }
        // 标记已发生有效位移
        this.panMoved = true;
      }

      // 如果不处于拖拽状态，则直接返回
      if (!this.isPanning) return;

      // 更新平移量
      this.panX = this.panAtStartX + dx;
      this.panY = this.panAtStartY + dy;
      // 实时根据边界裁剪
      this.clampPan();
    },

    onPanEnd() {
      // 退出拖拽状态
      this.isPanning = false;

      // --- 处理链接点击的特殊逻辑 ---
      // 如果触摸起始点是一个链接，并且整个过程没有发生有效拖拽
      if (this.maybeLinkTap && !this.panMoved && this.maybeTapTarget) {
        // 并且在拖拽过程中曾阻止过默认事件
        if (this.synthClickNeeded) {
          // 那么我们需要手动触发一次 click 事件，因为原生的可能被阻止了
          this.maybeTapTarget?.click();
        }
        // 否则（即没有阻止过默认事件），则让浏览器自行处理原生的点击事件即可
      }

      // 重置所有与单次手势相关的状态
      this.maybeLinkTap = false;
      this.maybeTapTarget = null;
      this.panMoved = false;
      this.synthClickNeeded = false;
    },
  },
};
</script>

<style lang="less" scoped>
.gesture-container {
  display: flex;
  // 内容区域水平垂直居中
  justify-content: center;
  align-items: center;

  // 隐藏滚动条，内容的移动通过 transform 控制
  overflow: hidden;

  width: 100%;
  height: 100%;
  // flex 子元素有个默认的 min-height: min-content;
  min-height: 0;
  // 禁用浏览器默认的触摸行为（如滚动、缩放），以便我们完全接管手势处理
  touch-action: none;
  // 禁止用户在拖拽时选中文本
  user-select: none;

  &.is-panning {
    /deep/ .annotationLayer {
      // 在拖拽期间，临时禁用注释层（通常包含链接）的鼠标事件
      // 这是为了防止链接的点击区域捕获触摸事件，从而阻碍平移手势的流畅进行
      pointer-events: none !important;
    }
  }
}
</style>
