<template>
  <Drawer
    :is-show.sync="innerVisible"
    :title="title"
    :show-header="showHeader"
    :width="width"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <slot />
  </Drawer>
</template>

<script>
import Drawer from "./Drawer.vue";

export default {
  components: {
    Drawer,
  },
  props: {
    // 外部控制显隐，与 .sync 绑定
    isShow: { type: Boolean, default: false },
    // 标题文案，例如“目录”
    title: { type: String, default: "" },
    // 是否展示头部区域
    showHeader: { type: Boolean, default: true },
    // 抽屉宽度，支持 number 或 string
    width: { type: [String, Number], default: "20rem" },
  },
  data() {
    return {
      innerVisible: this.isShow,
    };
  },
  watch: {
    // 外部 isShow 变化时，同步到内部 visible
    isShow(val) {
      this.innerVisible = val;
    },
    // 内部抽屉显隐变化时，反向同步给外部
    innerVisible(val) {
      if (val !== this.isShow) {
        this.$emit("update:is-show", val);
      }
    },
  },
};
</script>
