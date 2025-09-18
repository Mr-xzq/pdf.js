<template>
  <div class="thumbnail-panel">
    <div v-if="!totalPages" class="loading">加载缩略图中...</div>
    <div v-else class="thumb-list">
      <div
        v-for="page in totalPages"
        :key="page"
        class="thumb-item"
        @click="goToPage(page)"
      >
        <canvas :ref="'thumb-' + page" class="thumb-canvas"></canvas>
        <div class="thumb-label">第 {{ page }} 页</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ThumbnailPanel',
  props: {
    getTotalPages: { type: Function, required: true },
    renderThumbnail: { type: Function, required: true },
    goToPage: { type: Function, required: true },
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
    async ensureRenderThumbnails() {
      if (this.thumbsRendered || !this.totalPages) return;
      this.thumbsRendered = true;
      this.$nextTick(async () => {
        for (let p = 1; p <= this.totalPages; p += 1) {
          const canvas = this.$refs['thumb-' + p];
          if (canvas) {
            await this.renderThumbnail(p, canvas, { scale: 0.2 });
          }
        }
      });
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
}
.thumb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.thumb-canvas {
  width: 120px;
  height: 160px;
  background: #f7f7f7;
}
.thumb-label {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}
</style>

