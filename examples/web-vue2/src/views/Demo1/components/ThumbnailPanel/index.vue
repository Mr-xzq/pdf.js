<template>
  <div class="thumbnail-panel">
    <div v-if="!totalPages" class="loading">加载缩略图中...</div>
    <div v-else class="thumb-list">
      <div
        v-for="page in totalPages"
        :key="page"
        class="thumb-item"
        :class="{ 'is-current': currentPage === page }"
        @click="onSelect(page)"
      >
        <canvas
          :ref="'thumb-' + page"
          class="thumb-canvas"
          :data-page="page"
        ></canvas>
        <div class="thumb-label">第 {{ page }} 页</div>
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
  },
  data() {
    return {
      totalPages: 0,
      thumbsRendered: false,
    };
  },
  async mounted() {
    this.totalPages = await this.getTotalPages();
    this.ensureRenderThumbnails();
  },
  methods: {
    onSelect(page) {
      this.goToPage(page);
      this.$emit("selected", page);
    },
    // 从 $refs / DOM 获取某页的 canvas 元素（兼容 v-for refs 为数组）
    getCanvasEl(page) {
      const r = this.$refs["thumb-" + page];
      const byRef = Array.isArray(r) ? r[0] : r;
      if (byRef instanceof HTMLCanvasElement) return byRef;
      const byQuery =
        this.$el &&
        this.$el.querySelector('canvas.thumb-canvas[data-page="' + page + '"]');
      return byQuery || byRef || null;
    },
    // 等待某页 canvas 出现，最多等待 2s
    waitForCanvas(page, maxMs = 2000) {
      const start = Date.now();
      return new Promise(resolve => {
        const check = () => {
          const el = this.getCanvasEl(page);
          if (el) return resolve(el);
          if (Date.now() - start > maxMs) return resolve(null);
          this.$nextTick(() => requestAnimationFrame(check));
        };
        check();
      });
    },
    async ensureRenderThumbnails() {
      if (this.thumbsRendered || !this.totalPages) return;
      this.thumbsRendered = true;
      await this.$nextTick();
      let rendered = 0;
      for (let p = 1; p <= this.totalPages; p += 1) {
        const canvas = await this.waitForCanvas(p, 2000);
        if (canvas instanceof HTMLCanvasElement) {
          try {
            await this.renderThumbnail(p, canvas, { scale: 0.2 });
            rendered += 1;
          } catch (e) {
            /* 忽略单页失败，继续后续页 */
          }
        }
      }
      console.log(
        "[Demo1] Thumbnails rendered",
        rendered,
        "/",
        this.totalPages
      );
    },
  },
};
</script>

<style scoped>
.thumbnail-panel {
  height: 100%;
}
.loading {
  color: #999;
  padding: 12px;
}
.thumb-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding: 8px 12px;
}
.thumb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  border-radius: 8px;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.thumb-item:active {
  transform: scale(0.98);
  background: rgba(0, 0, 0, 0.04);
}
.thumb-item.is-current {
  box-shadow: 0 0 0 2px #1989fa inset;
}
.thumb-canvas {
  width: 120px;
  height: 160px;
  background: #f7f7f7;
  border-radius: 4px;
}
.thumb-label {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}
</style>
