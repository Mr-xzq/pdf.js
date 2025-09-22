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
    getTotalPages: { type: Function, required: true },
    renderThumbnail: { type: Function, required: true },
    goToPage: { type: Function, required: true },
    currentPage: { type: Number, default: 1 },
    // 指定缩略图列数；<=0 或未传则自适应
    columns: { type: Number, default: 3 },
  },
  data() {
    return {
      totalPages: 0,
      thumbsRendered: false,
      visible: false,
      pendingPage: null,
      thumbSrcs: {},
    };
  },
  async mounted() {
    this.showLoadingToast();
    try {
      this.totalPages = await this.getTotalPages();
      await this.ensureRenderThumbnails();
      this.trySyncCurrent();
    } finally {
      this.clearLoadingToast();
    }
  },
  watch: {
    currentPage(n) {
      if (!this.visible) {
        this.pendingPage = n;
      } else {
        this.$nextTick(() => this.scrollCurrentIntoView());
      }
    },
  },
  computed: {
    // 网格列数样式：传入 columns > 0 时生效
    gridStyle() {
      if (this.columns > 0) {
        return { gridTemplateColumns: `repeat(${this.columns}, 1fr)` };
      }
      return null;
    },
  },
  methods: {
    // 计算第一个缩略图的 CSS 宽度（与列数/容器宽度相关）
    getCssThumbWidth() {
      const list = this.$el && this.$el.querySelector(".thumb-list");
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

    showLoadingToast() {
      const t = this.$toast;
      if (t && typeof t.loading === "function") {
        t.loading({
          message: "加载中",
          duration: 0,
          forbidClick: true,
        });
      }
    },
    clearLoadingToast() {
      const t = this.$toast;
      if (t && typeof t.clear === "function") t.clear();
    },
    onSelect(page) {
      this.goToPage(page);
      this.$emit("selected", page);
    },
    onParentOpened() {
      this.visible = true;
      this.$nextTick(async () => {
        let needToast = !this.thumbsRendered;
        if (needToast) this.showLoadingToast();
        try {
          await this.ensureRenderThumbnails();
          const target =
            this.pendingPage != null ? this.pendingPage : this.currentPage;
          if (target != null) await this.scrollToPage(target);
          this.pendingPage = null;
        } finally {
          if (needToast) this.clearLoadingToast();
        }
      });
    },
    onParentClosed() {
      this.visible = false;
    },
    trySyncCurrent() {
      if (this.visible && this.thumbsRendered) {
        this.$nextTick(() => this.scrollCurrentIntoView());
      } else {
        this.pendingPage = this.currentPage;
      }
    },
    async ensureRenderThumbnails() {
      if (this.thumbsRendered || !this.totalPages) return;
      this.thumbsRendered = true;
      await this.$nextTick();
      const cssWidth = this.getCssThumbWidth() || 120;
      const scale = this.getScaleFromWidth(cssWidth);
      let rendered = 0;
      for (let p = 1; p <= this.totalPages; p += 1) {
        try {
          const tmp = document.createElement("canvas");
          await this.renderThumbnail(p, tmp, { scale });
          const url = tmp.toDataURL("image/png");
          this.$set(this.thumbSrcs, p, url);
          tmp.width = 0;
          tmp.height = 0;
          rendered += 1;
        } catch (_) {}
      }
      console.log(
        "[Demo1] Thumbnails rendered",
        rendered,
        "/",
        this.totalPages
      );
    },
    async scrollToPage(page) {
      const item =
        this.$el &&
        this.$el.querySelector('.thumb-item[data-page="' + page + '"]');
      if (item && typeof item.scrollIntoView === "function") {
        item.scrollIntoView({ behavior: "smooth" });
      }
    },
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
    padding: 3px;
    transition: all 200ms ease;

    &:active {
      transform: scale(0.98);
      background: rgba(0, 0, 0, 0.04);
    }

    &.is-current {
      box-shadow: 0 0 0 2px #1989fa inset;
    }

    .thumb-media {
      width: 100%;
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
      font-size: 12px;
      color: #666;
    }
  }
}
</style>
