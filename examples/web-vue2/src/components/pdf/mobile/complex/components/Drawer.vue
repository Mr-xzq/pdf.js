<template>
  <van-popup
    style="height: 100%; width: 100%"
    :value="isShow"
    :closeable="false"
    position="left"
    close-on-click-overlay
    @input="$emit('update:is-show', $event)"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <div class="drawer">
      <div v-if="showHeader" class="drawer__header">
        <slot name="header">
          <TouchIconButton
            :src="backIconUrl"
            class="back-wrapper"
            img-class="drawer__back"
            :min-size="40"
            @click="handleClose"
          />
          <div class="drawer__title">{{ title }}</div>
        </slot>
      </div>
      <div class="drawer__body">
        <slot />
      </div>
    </div>
  </van-popup>
</template>

<script>
import backIconUrl from "@/assets/images/complexPdfReader/back-2x.png";
import TouchIconButton from "./TouchIconButton.vue";

export default {
  name: "Drawer",
  components: { TouchIconButton },
  props: {
    isShow: { type: Boolean, default: false },
    title: { type: String, default: "" },
    showHeader: { type: Boolean, default: true },
  },
  data() {
    return {
      backIconUrl,
    };
  },
  methods: {
    handleClose() {
      this.$emit("update:is-show", false);
    },
  },
};
</script>

<style lang="less" scoped>
.drawer {
  height: 100%;
  display: flex;
  flex-direction: column;

  .drawer__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 3.5rem;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
  }

  /deep/ .back-wrapper {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    .drawer__back {
      width: 0.6rem;
      height: 1.19rem;
    }
  }

  .drawer__title {
    flex: 1;
    text-align: center;

    font-size: 1.14rem;
    color: #000000;
    letter-spacing: 0;
    font-weight: 400;
  }

  .drawer__body {
    flex: 1;
    overflow: auto;
    background: #fff;
  }
}
</style>
