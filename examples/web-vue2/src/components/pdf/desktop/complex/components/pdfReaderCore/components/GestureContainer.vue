<template>
  <div ref="container" :class="['gesture-container', { 'is-panning': isPanning }]">
    <div
      class="gesture-container__pan"
      :style="panStyle"
      ref="pan"
      @mousedown="onPanStart"
      @mousemove="onPanMove"
      @mouseup="onPanEnd"
      @mouseleave="onPanEnd"
    >
      <slot />
    </div>
  </div>
</template>

<script>
import { throttle } from "lodash";

export default {
  name: "GestureContainer",
  props: {
    // 启用或禁用手势功能（PC 端：鼠标拖拽 + 拖拽翻页）
    gesturesEnabled: { type: Boolean, default: true },
    // CSS 选择器，用于在 slot 内容中定位需要进行尺寸观察的内容节点
    contentSelector: { type: String, required: true, default: "" },
    // 拖拽触发阈值（单位：像素），鼠标移动超过该距离才会开始真正平移
    panThreshold: { type: Number, default: 6 },
    // 滚轮触发阈值，防止滚轮的轻微抖动导致的翻页，只有 |deltaY| 超过该阈值才会触发一次翻页
    wheelDeltaThreshold: { type: Number, default: 10 },
  },
  data() {
    return {
      // --- 平移与边界状态 ---
      // 当前 X 轴的平移量
      panX: 0,
      // 当前 Y 轴的平移量
      panY: 0,
      // 鼠标按下时的 X 坐标 (clientX)
      panStartX: 0,
      // 鼠标按下时的 Y 坐标 (clientY)
      panStartY: 0,
      // 开始拖拽时 panX 的初始值
      panAtStartX: 0,
      // 开始拖拽时 panY 的初始值
      panAtStartY: 0,
      // 标志位，表示当前是否正处于拖拽状态
      isPanning: false,

      // 内容节点的宽度
      contentWidth: 0,
      // 内容节点的高度
      contentHeight: 0,
      // 外部容器的宽度
      containerWidth: 0,
      // 外部容器的高度
      containerHeight: 0,

      // ResizeObserver 实例，监听多个元素大小改变
      resizeObserver: null,
      // 当前被观察的元素引用（用于区分 entries，也就是不同的元素）
      observedContainer: null,
      observedContent: null,
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
    this.initHandleFlipPageWheel();
  },

  methods: {
    // 初始化 ResizeObserver，用于监听容器和内容尺寸的变化
    initSizeObservers() {
      const container = this.$refs.container;
      const pan = this.$refs.pan;

      if (typeof ResizeObserver === "undefined") return;

      // 单一 Observer，同时监听多个元素
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const target = entry.target;

          // 优先使用 borderBoxSize（含 padding/border，box-sizing: border-box），不行就回退到 contentRect
          const box = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
          const rect = entry?.contentRect;
          const width = typeof box?.inlineSize === "number" ? box.inlineSize : rect?.width;
          const height = typeof box?.blockSize === "number" ? box.blockSize : rect?.height;
          if (typeof width !== "number" || typeof height !== "number") return;

          if (target === this.observedContainer) {
            console.log("container - resized: clampPan", { width, height });
            this.containerWidth = width || 0;
            this.containerHeight = height || 0;
          } else if (target === this.observedContent) {
            console.log("content - resized: clampPan", { width, height });
            this.contentWidth = width || 0;
            this.contentHeight = height || 0;
          }

          // 尺寸变化后，重新计算并校正平移边界
          this.clampPan();
        });
      });

      // 观察外部容器
      if (container) {
        this.observedContainer = container;
        this.resizeObserver.observe(container, { box: "border-box" });
      }

      // 根据 contentSelector 找到要观察的内容节点
      const pickContentTarget = () => {
        if (!pan || !this.contentSelector) return;
        return pan.querySelector(this.contentSelector);
      };

      const contentTarget = pickContentTarget();
      if (contentTarget) {
        this.observedContent = contentTarget;
        this.resizeObserver.observe(contentTarget, { box: "border-box" });
      }

      // 设置清理逻辑
      const cleanup = () => {
        console.log("cleanup - resize observer");

        this.resizeObserver?.disconnect?.();
        this.observedContainer = null;
        this.observedContent = null;
      };
      this.$on("hook:beforeDestroy", cleanup);
    },
    // 初始化翻页滚轮监听
    initHandleFlipPageWheel() {
      const containerEl = this.$refs.container;
      if (!containerEl) return;

      const handleWheelInner = (event) => {
        if (!this.gesturesEnabled) return;
        if (!event) return;
        const deltaY = event.deltaY || 0;
        if (Math.abs(deltaY) < this.wheelDeltaThreshold) {
          return;
        }

        // 向下滚（deltaY > 0）通常表示用户希望查看下一页；向上滚则为上一页
        if (deltaY > 0) {
          this.$emit("next-page");
        } else {
          this.$emit("prev-page");
        }

        // 容器本身没有滚动条，这里阻止默认行为以避免个别浏览器触发页面滚动/回弹
        if (event.cancelable) {
          event.preventDefault();
        }
      };

      // 将滚轮事件处理函数做节流，避免一次滚动触发多次翻页
      // leading: true 确保第一次滚动立刻翻页；trailing: false 避免结束后再补一次
      const handleWheelThrottled = throttle(handleWheelInner, 400, {
        leading: true,
        trailing: false,
      });

      containerEl.addEventListener("wheel", handleWheelThrottled);

      // 设置清理逻辑
      const cleanup = () => {
        console.log("cleanup - HandleFilpPageWheel");

        // 组件销毁前取消节流回调，避免持有无效的组件引用
        handleWheelThrottled.cancel?.();
        containerEl.removeEventListener("wheel", handleWheelThrottled);
      };

      this.$on("hook:beforeDestroy", cleanup);
    },

    /**
     * 计算某一条轴向（X 或 Y）的平移边界
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

    // --- 鼠标拖拽事件处理（PC），行为与 mobile 版一致 ---

    onPanStart(e) {
      if (!this.gesturesEnabled) return;
      // 仅响应左键按下
      if (e.button !== 0) return;

      // 记录起始信息，但不立即进入“拖拽中”状态
      this.isPanning = false;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panAtStartX = this.panX;
      this.panAtStartY = this.panY;
    },

    onPanMove(e) {
      if (!this.gesturesEnabled) return;
      // 仅在按住左键时才更新
      if (e.buttons !== 1) return;

      // 计算位移
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      // 判断总位移是否超过阈值
      const moved = Math.hypot(dx, dy) > this.panThreshold;

      // 检查内容是否在任一方向上溢出容器（需要加 1px 的容错）
      const overflowX = (this.contentWidth || 0) > (this.containerWidth || 0) + 1;
      const overflowY = (this.contentHeight || 0) > (this.containerHeight || 0) + 1;
      const overflow = overflowX || overflowY;

      // 当尚未进入拖拽状态、内容确实溢出、且移动距离超过阈值时，才正式进入拖拽模式
      if (!this.isPanning && overflow && moved) {
        this.isPanning = true;
        if (e.cancelable) {
          e.preventDefault();
        }
      }

      if (!this.isPanning) return;

      // 更新平移量
      this.panX = this.panAtStartX + dx;
      this.panY = this.panAtStartY + dy;
      // 实时根据边界裁剪
      this.clampPan();
    },

    onPanEnd() {
      if (!this.gesturesEnabled) return;
      // 桌面端仅保留拖拽平移能力，不再通过拖拽触发翻页
      this.isPanning = false;
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
