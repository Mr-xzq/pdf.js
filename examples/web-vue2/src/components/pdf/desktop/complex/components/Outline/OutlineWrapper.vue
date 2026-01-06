<template>
  <el-drawer
    :visible.sync="innerVisible"
    :with-header="false"
    :modal="false"
    :wrapperClosable="false"
    :append-to-body="false"
    custom-class="outline-wrapper"
    direction="ltr"
    :size="size"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <div class="outline-wrapper__container">
      <div v-if="showHeader" class="outline-wrapper__header">
        <div class="outline-wrapper__title">{{ title }}</div>
        <TouchIconButton
          :src="closeIconUrl"
          class="outline-wrapper__close-btn"
          img-class="outline-wrapper__close-img"
          :min-size="30"
          @click="handleClose"
        />
      </div>
      <div class="outline-wrapper__body">
        <slot />
      </div>
    </div>
  </el-drawer>
</template>

<script>
import closeIconUrl from "@/assets/images/complexPdfReader/close-2x.png";
import TouchIconButton from "../TouchIconButton.vue";

export default {
  name: "OutlineWrapper",
  components: {
    TouchIconButton,
  },
  props: {
    // 外部控制显隐，与 visible.sync 绑定
    isShow: { type: Boolean, default: false },
    // 标题文案，例如“目录”
    title: { type: String, default: "" },
    // 是否展示头部区域
    showHeader: { type: Boolean, default: true },
    // 抽屉宽度，支持 number 或 string，直接透传给 el-drawer
    size: { type: [String, Number], default: "20rem" },
  },
  data() {
    return {
      closeIconUrl,
      innerVisible: this.isShow,
    };
  },
  watch: {
    // 外部 isShow 变化时，同步到内部 visible
    isShow(val) {
      this.innerVisible = val;
    },
    // el-drawer 内部关闭/打开时，反向同步给外部
    innerVisible(val) {
      if (val !== this.isShow) {
        this.$emit("update:is-show", val);
      }
    },
  },
  methods: {
    handleClose() {
      this.innerVisible = false;
    },
  },
};
</script>

<style lang="less" scoped>
/deep/ .outline-wrapper {
  box-sizing: border-box;

  .el-drawer__body {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .outline-wrapper__container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
  }

  .outline-wrapper__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 3.5rem;
    padding: 0 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .outline-wrapper__title {
    font-size: 1.14rem;
    color: #000000;
    font-weight: 400;
  }

  .outline-wrapper__close-btn {
    position: absolute;
    right: 1.5rem;
  }

  .outline-wrapper__close-img {
    width: 0.81rem;
    height: 0.83rem;
  }

  .outline-wrapper__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
}
</style>
