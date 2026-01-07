<template>
  <transition name="drawer-slide" @after-enter="afterEnter" @after-leave="afterLeave">
    <div v-show="isShow" class="drawer__panel" :style="{ width: sizePx }">
      <div v-if="showHeader" class="drawer__header">
        <div class="drawer__title">{{ title }}</div>
        <TouchIconButton
          :src="closeIconUrl"
          class="drawer__close-btn"
          img-class="drawer__close-img"
          :min-size="30"
          @click="handleClose"
        />
      </div>
      <div class="drawer__body" v-if="rendered">
        <slot />
      </div>
    </div>
  </transition>
</template>

<script>
import closeIconUrl from "@/assets/images/complexPdfReader/close-2x.png";
import TouchIconButton from "../TouchIconButton.vue";

export default {
  components: {
    TouchIconButton,
  },
  props: {
    // 外部控制显隐
    isShow: { type: Boolean, default: false },
    // 标题文案，例如“目录”
    title: { type: String, default: "" },
    // 是否展示头部区域
    showHeader: { type: Boolean, default: true },
    // 抽屉宽度
    size: { type: [String, Number], default: "20rem" },
  },
  data() {
    return {
      closeIconUrl,
      // 是否已经真正渲染过 slot 内容（懒挂载）
      rendered: this.isShow,
    };
  },
  computed: {
    sizePx() {
      return typeof this.size === "number" ? `${this.size}px` : this.size;
    },
  },
  watch: {
    // 首次打开时懒挂载 slot
    isShow(val) {
      if (val && !this.rendered) {
        this.rendered = true;
      }
    },
  },
  methods: {
    handleClose() {
      this.$emit("update:is-show", false);
    },
    afterEnter() {
      this.$emit("opened");
    },
    afterLeave() {
      this.$emit("closed");
    },
  },
};
</script>

<style lang="less" scoped>
.drawer__panel {
  position: absolute;
  top: 10px;
  left: 10px;
  bottom: calc(10px + var(--bottom-toolbar-height));

  display: flex;
  flex-direction: column;
  background: #ffffff;
  box-shadow: 0 0.29rem 0.57rem 0 rgba(0, 0, 0, 0.15);

  .drawer__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.57rem 0 1rem;

    .drawer__title {
      font-size: 1.14rem;
      color: #000000;
      font-weight: 400;
    }

    .drawer__close-btn {
      position: absolute;
      right: 0.5rem;
    }

    /deep/ .drawer__close-img {
      width: 0.81rem;
      height: 0.83rem;
    }
  }

  .drawer__body {
    flex: 1;
    min-height: 0;
    padding: 0 1.36rem;
    margin-bottom: 0.64rem;
    overflow: auto;
  }
}

/* 抽屉开合动效：从左侧滑入/滑出 */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

.drawer-slide-enter,
.drawer-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
