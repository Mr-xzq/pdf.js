<template>
  <div class="thumbnail-panel">
    <div v-if="totalPages" class="thumb-list" :style="gridStyle">
      <div
        v-for="page in totalPages"
        :key="page"
        class="thumb-item"
        :class="{ 'is-current': currentPage === page }"
        :data-page="page"
        @click="onSelect(page)"
      >
        <div class="thumb-media">
          <van-image
            v-if="thumbSrcs[page]"
            class="thumb-img"
            :src="thumbSrcs[page]"
            fit="contain"
            width="100%"
          />
          <div v-else class="thumb-ph"></div>
        </div>
        <div class="thumb-label">{{ page }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ThumbnailPanel",
  props: {
    totalPages: { type: Number, required: true },
    // 渲染指定页缩略图
    renderThumbnail: { type: Function, required: true },
    goToPage: { type: Function, required: true },
    currentPage: { type: Number, default: 1 },
    // 缩略图的列数，<=0 或未传则自适应
    columns: { type: Number, default: 3 },
  },
  data() {
    return {
      // 标记缩略图是否已全部渲染
      thumbsRendered: false,
      // 标记 popup 是否可见
      visible: false,
      // 当 popup 不可见时，待同步的页码
      pendingPage: null,
      // 存储缩略图的 Data URL，将 page 作为 key
      thumbSrcs: {},
    };
  },
  async mounted() {
    this.$emit("loading-start", { source: "viewer", message: "加载中" });
    try {
      await this.ensureRenderThumbnails();
      this.trySyncCurrent();
    } finally {
      this.$emit("loading-stop", { source: "viewer" });
    }
  },
  watch: {
    currentPage(n) {
      if (!this.visible) {
        // popup 不可见时，缓存待同步的页码
        this.pendingPage = n;
      } else {
        // popup 可见时，滚动到当前页
        this.$nextTick(() => this.scrollCurrentIntoView());
      }
    },
    // 如果总页数存在且未渲染过，则开始渲染
    totalPages(n) {
      if (n && !this.thumbsRendered) {
        this.$nextTick(() => this.ensureRenderThumbnails());
      }
    },
  },
  computed: {
    // 根据 columns 属性计算缩略图渲染列数
    gridStyle() {
      if (this.columns <= 0) return;

      return { gridTemplateColumns: `repeat(${this.columns}, 1fr)` };
    },
  },
  methods: {
    // 计算第一个缩略图的实际 CSS 宽度（与列数/容器宽度相关）
    getCssThumbWidth() {
      const list = this.$el?.querySelector(".thumb-list");
      if (!list) return 0;
      const item = list.querySelector(".thumb-item");
      const w = item ? item.clientWidth : 0;
      return w || 0;
    },
    // 按列宽动态换算 scale；以 120px 对应 0.2 作为基准
    getScaleFromWidth(cssWidth) {
      const baseCss = 120;
      const baseScale = 0.2;
      if (!cssWidth) return baseScale;
      return (cssWidth / baseCss) * baseScale;
    },
    // 缩略图点击事件
    onSelect(page) {
      // 导航到指定页
      this.goToPage(page);
      this.$emit("selected", page);
    },
    // 父容器打开时
    onParentOpened() {
      this.visible = true;
      this.$nextTick(async () => {
        const needLoad = !this.thumbsRendered;
        if (needLoad) {
          this.$emit("loading-start", { source: "viewer", message: "加载中" });
        }
        try {
          await this.ensureRenderThumbnails();
          const target =
            this.pendingPage != null ? this.pendingPage : this.currentPage;
          if (target != null) await this.scrollToPage(target);
          this.pendingPage = null;
        } finally {
          if (needLoad) this.$emit("loading-stop", { source: "viewer" });
        }
      });
    },
    // 父容器关闭时的处理函数
    onParentClosed() {
      this.visible = false;
    },
    // 尝试同步当前页的滚动位置
    trySyncCurrent() {
      if (this.visible && this.thumbsRendered) {
        this.$nextTick(() => this.scrollCurrentIntoView());
      } else {
        this.pendingPage = this.currentPage;
      }
    },
    // 确保所有缩略图被渲染
    async ensureRenderThumbnails() {
      if (this.thumbsRendered || !this.totalPages) return;
      // 标记开始渲染
      this.thumbsRendered = true;
      await this.$nextTick();
      const cssWidth = this.getCssThumbWidth() || 120;
      // 计算缩放比例
      const scale = this.getScaleFromWidth(cssWidth);
      let rendered = 0;
      // 循环遍历每一页，渲染缩略图
      for (let p = 1; p <= this.totalPages; p += 1) {
        const tmp = document.createElement("canvas");
        await this.renderThumbnail(p, tmp, { scale });
        const url = tmp.toDataURL("image/png");
        // 将生成的 Data URL 存入 thumbSrcs
        this.$set(this.thumbSrcs, p, url);
        // 释放 canvas 内存
        tmp.width = 0;
        tmp.height = 0;
        rendered += 1;
      }
      console.log("Thumbnails rendered", rendered, "/", this.totalPages);
    },
    // 滚动到指定页的缩略图
    async scrollToPage(page) {
      const item = this.$el?.querySelector(
        '.thumb-item[data-page="' + page + '"]'
      );
      item?.scrollIntoView({ behavior: "smooth" });
    },
    // 滚动到当前页的缩略图
    scrollCurrentIntoView() {
      if (typeof this.currentPage === "number") {
        this.scrollToPage(this.currentPage);
      }
    },
  },
};
</script>

<style lang="less" scoped>
.thumbnail-panel {
  height: 100%;
}

.thumb-list {
  box-sizing: border-box;
  display: grid;
  // 自适应网格布局，每列最小 120px，最大 1fr
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding: 8px 12px;
  width: 100%;

  .thumb-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    border-radius: 8px;
    min-width: 0;
    transition: all 200ms ease;
    // 外部圆角, 内部没有圆角, 隐藏内部溢出
    overflow: hidden;

    &:active {
      transform: scale(0.98);
      background: rgba(0, 0, 0, 0.04);
    }

    &.is-current {
      border: 2px solid #7e38d2;
    }

    .thumb-media {
      width: 100%;
      // 保持 3:4 的宽高比
      aspect-ratio: 3 / 4;

      .thumb-img,
      .thumb-ph {
        display: block;
        width: 100%;
        background: #f7f7f7;
        border-radius: 4px;
      }

      .thumb-img {
        height: auto;
      }

      .thumb-ph {
        height: 100%;
      }
    }

    .thumb-label {
      margin: 2px 0;
      font-size: 14px;
      color: #000000;
      letter-spacing: 0;
      font-weight: 400;
    }
  }
}
</style>
