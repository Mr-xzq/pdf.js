<template>
  <div class="thumbnail-content">
    <div v-if="totalPages" ref="thumbList" class="thumb-list">
      <div
        v-for="page in totalPages"
        :key="page"
        class="thumb-item"
        :class="{ 'is-current': currentPage === page }"
        :data-page="page"
        @click="onSelect(page)"
      >
        <div class="thumb-media">
          <el-image v-if="thumbSrcs[page]" class="thumb-img" :src="thumbSrcs[page]" fit="cover" />
          <div v-else class="thumb-ph"></div>
        </div>
        <div class="thumb-label">{{ page }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import { isValidPageNumber } from "@/components/pdf/core/pdf-utils.js";

export default {
  props: {
    // 总页数
    totalPages: { type: Number, required: true },
    // 渲染指定页缩略图
    renderThumbnail: { type: Function, required: true },
    // 跳转到指定页
    goToPage: { type: Function, required: true },
    // 当前页码
    currentPage: { type: Number, default: 1 },
  },
  data() {
    return {
      // 标记缩略图是否已全部渲染
      thumbsRendered: false,
      // 浮层不可见时，待同步的页码
      pendingPage: null,
      // 存储缩略图的 Data URL，将 page 作为 key
      thumbSrcs: {},
      // 由父容器控制的可见性状态
      visible: false,
    };
  },
  watch: {
    // 当前页变化时，依据可见性决定是立即滚动还是记录待同步页码
    currentPage(n) {
      if (!isValidPageNumber(n)) return;
      if (!this.visible) {
        this.pendingPage = n;
      } else {
        this.$nextTick(() => this.scrollCurrentIntoView());
      }
    },
    // 总页数在浮层已打开且尚未渲染过时，触发一次渲染
    totalPages(n) {
      if (!n || this.thumbsRendered || !this.visible) return;
      this.$nextTick(() => {
        this.runWithLoadPending({
          message: "渲染缩略图",
          run: () => this.ensureRenderThumbnails(),
        });
      });
    },
  },
  mounted() {
    this.initHandleThumbWheel();
  },
  methods: {
    ...mapActions("pdfReaderCore", ["runWithLoadPending", "getPage"]),
    initHandleThumbWheel() {
      const list = this.$refs.thumbList;
      if (!list) return;

      // PC 鼠标滚轮适配：在横向缩略图区域内，用纵向滚轮控制左右滚动
      const onThumbWheel = (event) => {
        // 如果没有横向滚动条，直接终止，提供 1 px 误差干扰
        const hasHorizontalScroll = list.scrollWidth > list.clientWidth + 1;
        if (!hasHorizontalScroll) return;

        // 只处理以纵向为主的滚动（普通鼠标滚轮），避免干扰触控板的横向滚动
        const { deltaX, deltaY } = event;
        if (!deltaY || Math.abs(deltaY) < Math.abs(deltaX)) return;

        const maxScrollLeft = list.scrollWidth - list.clientWidth;
        // 容忍 1px 误差干扰，避免精度问题
        const tolerance = 1;
        const atLeft = list.scrollLeft <= tolerance;
        const atRight = list.scrollLeft >= maxScrollLeft - tolerance;

        // 如果已经在边缘并且继续往“外侧”滚，就放行给外层（不拦截）
        if ((deltaY < 0 && atLeft) || (deltaY > 0 && atRight)) {
          return;
        }

        const prev = list.scrollLeft;
        const next = Math.min(maxScrollLeft, Math.max(0, prev + deltaY));
        // 基本没有有效滚动空间时，也不拦截（防止边界抖动）
        if (Math.abs(next - prev) < 0.5) {
          return;
        }

        // 阻止页面整体滚动和事件冒泡，只在真正让缩略图区域滚动时才拦截
        event.preventDefault();
        event.stopPropagation();

        list.scrollTo({
          left: next,
          behavior: "auto",
        });

        console.log("onThumbWheel: ", {
          deltaX,
          deltaY,
          prev,
          next,
          atLeft,
          atRight,
        });
      };

      if (list) {
        // 使用 passive: false，提高性能，同时以便在需要时调用 preventDefault 阻止页面整体滚动
        list.addEventListener("wheel", onThumbWheel, { passive: false });
      }

      // 设置清理逻辑
      const cleanup = () => {
        console.log("cleanup - ThumbWheel Listener");

        list.removeEventListener("wheel", onThumbWheel);
      };

      this.$on("hook:beforeDestroy", cleanup);
    },
    // 根据容器高度，计算可用的缩略图高度
    getAvailableHeightFromContainer() {
      const list = this.$refs.thumbList;
      const style = window.getComputedStyle(list);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const contentHeight = list.clientHeight - paddingTop - paddingBottom;
      if (contentHeight <= 0) return 0;

      // 预留页码文字等占用的高度，避免被裁切, margin + lineHeight
      const labelReserve = 34 + 16;
      const availableHeight = Math.max(contentHeight - labelReserve, 0);
      return availableHeight > 0 ? availableHeight : 0;
    },
    // 按容器高度动态换算缩略图 scale
    async getScaleFromContainerHeight(containerHeight) {
      const page = await this.getPage(1);
      const viewport = page.getViewport({ scale: 1 });

      // 根据真实 pdf 高度来计算实际缩放比例
      const scaleY = containerHeight / viewport.height;

      console.log("getScaleFromContainerHeight: ", {
        containerHeight,
        viewport,
        scaleY,
      });

      // 得到缩放比例，它会影响实际渲染 canvas 的物理像素
      // 为了让其清晰些，我给了一个 1.5 倍精度渲染
      return scaleY * 1.5;
    },
    // 缩略图点击事件
    onSelect(page) {
      this.goToPage(page);
      this.$emit("selected", page);
    },
    // 父容器打开时调用
    onParentOpened() {
      this.visible = true;
      this.$nextTick(async () => {
        const needLoad = !this.thumbsRendered;
        if (needLoad) {
          await this.runWithLoadPending({
            message: "渲染缩略图",
            run: () => this.ensureRenderThumbnails(),
          });
        } else {
          await this.ensureRenderThumbnails();
        }
        const target = this.pendingPage != null ? this.pendingPage : this.currentPage;
        if (target != null) await this.scrollToPage(target);
        this.pendingPage = null;
      });
    },
    // 父容器关闭时调用
    onParentClosed() {
      this.visible = false;
    },
    // 确保所有缩略图被渲染
    async ensureRenderThumbnails() {
      if (this.thumbsRendered || !this.totalPages) return;

      // 标记开始渲染
      this.thumbsRendered = true;
      await this.$nextTick();

      // 优先根据容器高度直接计算缩略图 scale，让缩略图高度随容器自适应
      const availableHeight = this.getAvailableHeightFromContainer();
      const scale = await this.getScaleFromContainerHeight(availableHeight);

      // 循环遍历每一页，渲染缩略图
      for (let p = 1; p <= this.totalPages; p++) {
        const tmp = document.createElement("canvas");
        await this.renderThumbnail(p, tmp, { scale });
        const url = tmp.toDataURL("image/png");
        // 将生成的 Data URL 存入 thumbSrcs
        this.$set(this.thumbSrcs, p, url);

        // 释放 canvas 内存
        tmp.width = 0;
        tmp.height = 0;
      }
    },
    // 滚动到指定页的缩略图
    async scrollToPage(page) {
      const item = this.$el?.querySelector('.thumb-item[data-page="' + page + '"]');
      item?.scrollIntoView({ behavior: "smooth" });
    },
    // 滚动到当前页的缩略图
    scrollCurrentIntoView() {
      if (isValidPageNumber(this.currentPage)) {
        this.scrollToPage(this.currentPage);
      }
    },
  },
};
</script>

<style lang="less" scoped>
.thumbnail-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-list {
  box-sizing: border-box;
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 16px;
  padding: 8px 24px;
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;

  .thumb-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    // Desktop 横向缩略图：高度由外层容器控制，这里占满可用高度
    flex: 0 0 auto;
    height: 100%;
    box-sizing: border-box;
    transition: all 200ms ease;
    //border-radius: 8px;
    //外部圆角, 内部没有圆角, 隐藏内部溢出
    overflow: hidden;
    cursor: pointer;

    &:active {
      transform: scale(0.98);
      background: rgba(0, 0, 0, 0.04);
    }

    &.is-current {
      border: 2px solid #7e38d2;
    }

    .thumb-media {
      // 使用容器高度作为基准：媒体区域占满扣除页码文字后的高度，与 JS 中 labelReserve 保持一致
      // margin + lineHeight
      height: calc(100% - 34px - 16px);
      // 通过这个比例来计算初始宽度, 当内容宽度比它大时, 会撑宽(保证缩略图加载前有稳定宽高比和稳定高度，避免布局抖动)
      aspect-ratio: 3 / 4;

      .thumb-img,
      .thumb-ph {
        display: block;
        width: 100%;
        height: 100%;
      }

      .thumb-ph {
        background: #f7f7f7;
      }
    }

    .thumb-label {
      margin: 17px 0;
      line-height: 16px;
      font-size: 14px;
      color: #000000;
      letter-spacing: 0;
      font-weight: 400;
    }
  }
}
</style>
