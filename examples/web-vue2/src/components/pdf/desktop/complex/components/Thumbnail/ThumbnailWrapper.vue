<template>
  <el-dialog
    :visible.sync="innerVisible"
    :show-close="false"
    custom-class="thumbnail-wrapper"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <div v-if="showHeader" class="thumbnail-wrapper-header">
      <TouchIconButton
        :src="closeIconUrl"
        class="dialog-close-wrapper"
        img-class="dialog-close-img"
        :min-size="30"
        @click="handleClose"
      />
    </div>

    <div class="thumbnail-wrapper-body">
      <slot />
    </div>
  </el-dialog>
</template>

<script>
import closeIconUrl from "@/assets/images/complexPdfReader/close-2x.png";
import TouchIconButton from "../TouchIconButton.vue";

export default {
  components: {
    TouchIconButton,
  },
  props: {
    isShow: { type: Boolean, default: true },
    showHeader: { type: Boolean, default: true },
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
    // el-dialog 内部关闭/打开时，反向同步给外部
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
.el-dialog__wrapper {
  /deep/ .thumbnail-wrapper {
    box-sizing: border-box;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: 19.86rem;
    margin: 0 !important;

    .el-dialog__header {
      display: none;
    }

    .el-dialog__body {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;
    }

    .thumbnail-wrapper-header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-basis: 2.21rem;
      background: #fff;

      .dialog-close-wrapper {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        .dialog-close-img {
          width: 0.81rem;
          height: 0.83rem;
        }
      }
    }

    .thumbnail-wrapper-body {
      flex: 1;
      min-height: 0;
    }
  }
}
</style>
