<template>
  <div class="pdf-thumbnail">
    <!-- 加载状态 -->
    <div v-if="loading" class="pdf-thumbnail__loading">
      <van-loading size="20px" />
      <span class="pdf-thumbnail__loading-text">正在生成缩略图...</span>
    </div>

    <!-- 缩略图网格 -->
    <div v-else class="pdf-thumbnail__content">
      <div class="pdf-thumbnail__header">
        <span class="pdf-thumbnail__title">缩略图</span>
        <span class="pdf-thumbnail__count">{{ totalPages }} 页</span>
      </div>

      <div class="pdf-thumbnail__grid">
        <div
          v-for="pageNumber in totalPages"
          :key="`thumb-${pageNumber}`"
          class="pdf-thumbnail__item"
          :class="{
            'pdf-thumbnail__item--active': pageNumber === currentPage,
            'pdf-thumbnail__item--loading': isPageLoading(pageNumber),
          }"
          @click="onThumbnailClick(pageNumber)"
        >
          <!-- 缩略图容器 -->
          <div class="pdf-thumbnail__image-container">
            <img
              v-if="thumbnails[pageNumber]"
              :src="thumbnails[pageNumber].dataUrl"
              :alt="`第${pageNumber}页`"
              class="pdf-thumbnail__image"
            />

            <!-- 加载中状态 -->
            <div
              v-else-if="isPageLoading(pageNumber)"
              class="pdf-thumbnail__item-loading"
            >
              <van-loading size="16px" />
            </div>

            <!-- 未加载状态 -->
            <div v-else class="pdf-thumbnail__placeholder">
              <van-icon name="photo-o" size="24px" color="#c8c9cc" />
            </div>
          </div>

          <!-- 页码标签 -->
          <div class="pdf-thumbnail__page-label">
            {{ pageNumber }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapDocumentState, mapViewerState } from "../store/index.js";

export default {
  name: "PdfThumbnail",

  props: {
    // 缩略图尺寸
    thumbnailSize: {
      type: Number,
      default: 120,
    },
    // 缩略图质量
    thumbnailScale: {
      type: Number,
      default: 0.5,
    },
    // 预加载范围
    preloadRange: {
      type: Number,
      default: 5,
    },
  },

  data() {
    return {
      // 加载状态
      loading: false,
      // 缩略图数据
      thumbnails: {},
      // 正在加载的页面
      loadingPages: [],
      // 观察器
      intersectionObserver: null,
    };
  },

  computed: {
    // 映射Vuex状态 - 遵循状态收敛原则
    ...mapDocumentState(["pdfDocument"]),
    ...mapViewerState(["currentPage"]),

    // 总页数 - 从Vuex状态计算
    totalPages() {
      return this.pdfDocument ? this.pdfDocument.numPages : 0;
    },
  },

  watch: {
    // 监听文档变化
    pdfDocument: {
      handler(newDoc, oldDoc) {
        if (newDoc && newDoc !== oldDoc) {
          this.initializeThumbnails();
        }
      },
      immediate: true,
    },

    // 监听当前页变化
    currentPage(newPage, oldPage) {
      if (newPage !== oldPage) {
        this.preloadAroundCurrentPage(newPage);
        // 滚动到当前页面的缩略图
        this.$nextTick(() => {
          this.scrollToCurrentPage(newPage);
        });
      }
    },
  },

  mounted() {
    this.setupIntersectionObserver();
  },

  beforeDestroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  },

  methods: {
    /**
     * 初始化缩略图
     */
    async initializeThumbnails() {
      if (!this.pdfDocument) {
        this.thumbnails = {};
        return;
      }

      try {
        this.loading = true;
        this.thumbnails = {};
        this.loadingPages = [];

        // 预加载当前页面周围的缩略图
        await this.preloadAroundCurrentPage(this.currentPage);
      } catch (error) {
        console.error("初始化缩略图失败:", error);
        this.$emit("error", error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 预加载当前页面周围的缩略图
     */
    async preloadAroundCurrentPage(currentPage) {
      if (!this.pdfDocument) return;

      const startPage = Math.max(1, currentPage - this.preloadRange);
      const endPage = Math.min(
        this.totalPages,
        currentPage + this.preloadRange
      );

      // 优先加载当前页
      await this.loadThumbnail(currentPage);

      // 加载周围页面
      for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
        if (pageNumber !== currentPage) {
          this.loadThumbnail(pageNumber);
        }
      }
    },

    /**
     * 加载单个缩略图
     */
    async loadThumbnail(pageNumber) {
      if (
        !this.pdfDocument ||
        this.thumbnails[pageNumber] ||
        this.loadingPages.includes(pageNumber)
      ) {
        return;
      }

      try {
        // 添加加载状态
        if (!this.loadingPages.includes(pageNumber)) {
          this.loadingPages.push(pageNumber);
        }

        // 获取页面对象
        const page = await this.pdfDocument.getPage(pageNumber);

        // 计算缩略图尺寸
        const viewport = page.getViewport({ scale: this.thumbnailScale });

        // 创建临时canvas进行渲染
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // 渲染页面到canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // 转换为Image并立即释放Canvas内存
        const dataUrl = canvas.toDataURL("image/png");

        // 立即释放Canvas内存（学习PDF.js官方做法）
        canvas.width = 0;
        canvas.height = 0;

        // 保存缩略图数据（只保存dataUrl，不保存Canvas）
        this.thumbnails = {
          ...this.thumbnails,
          [pageNumber]: {
            dataUrl: dataUrl,
            width: viewport.width,
            height: viewport.height,
          },
        };
      } catch (error) {
        console.error(`加载第${pageNumber}页缩略图失败:`, error);
      } finally {
        // 移除加载状态
        const index = this.loadingPages.indexOf(pageNumber);
        if (index > -1) {
          this.loadingPages.splice(index, 1);
        }
      }
    },

    /**
     * 检查页面是否正在加载
     */
    isPageLoading(pageNumber) {
      return this.loadingPages.includes(pageNumber);
    },

    /**
     * 处理缩略图点击
     */
    onThumbnailClick(pageNumber) {
      this.$emit("page-click", pageNumber);
      this.$emit("navigate-to-page", pageNumber);
    },

    /**
     * 设置交叉观察器（用于懒加载）
     */
    setupIntersectionObserver() {
      if (!window.IntersectionObserver) return;

      this.intersectionObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const pageNumber = parseInt(entry.target.dataset.pageNumber);
              if (pageNumber && !this.thumbnails[pageNumber]) {
                this.loadThumbnail(pageNumber);
              }
            }
          });
        },
        {
          rootMargin: "50px",
          threshold: 0.1,
        }
      );

      // 观察所有缩略图项
      this.$nextTick(() => {
        const thumbnailItems = this.$el.querySelectorAll(
          ".pdf-thumbnail__item"
        );
        thumbnailItems.forEach((item, index) => {
          item.dataset.pageNumber = index + 1;
          this.intersectionObserver.observe(item);
        });
      });
    },

    /**
     * 滚动到当前页面的缩略图
     */
    scrollToCurrentPage(pageNumber) {
      if (!pageNumber || pageNumber < 1) return;

      const thumbnailItems = this.$el.querySelectorAll(".pdf-thumbnail__item");
      const targetItem = thumbnailItems[pageNumber - 1];

      if (targetItem) {
        const container = this.$el.querySelector(".pdf-thumbnail__grid");
        if (container) {
          // 计算目标元素相对于容器的位置
          const containerRect = container.getBoundingClientRect();
          const targetRect = targetItem.getBoundingClientRect();
          const scrollTop = container.scrollTop;

          // 计算需要滚动的距离，让目标元素在容器中央
          const targetScrollTop =
            scrollTop +
            (targetRect.top - containerRect.top) -
            containerRect.height / 2 +
            targetRect.height / 2;

          // 平滑滚动到目标位置
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: "smooth",
          });
        }
      }
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-thumbnail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #969799;
  }

  &__loading-text {
    margin-left: 8px;
    font-size: 14px;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #ebedf0;
    background: #fafafa;
  }

  &__title {
    font-size: 16px;
    font-weight: 500;
    color: #323233;
  }

  &__count {
    font-size: 12px;
    color: #969799;
  }

  &__grid {
    flex: 1;
    overflow-y: auto;
    padding: 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    border-radius: 8px;
    padding: 8px;
    transition: all 0.2s ease;
    border: 2px solid transparent;

    &:hover {
      background-color: #f5f7fa;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &--active {
      border-color: #1989fa;
      background-color: #e8f4ff;
    }

    &--loading {
      pointer-events: none;
    }
  }

  &__image-container {
    width: 100px;
    height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f7f8fa;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #ebedf0;
  }

  &__image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }

  &__item-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #969799;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  &__page-label {
    margin-top: 8px;
    font-size: 12px;
    color: #646566;
    font-weight: 500;
  }
}
</style>

