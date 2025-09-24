<template>
  <van-popup
    :value="isShow"
    @input="$emit('update:is-show', $event)"
    position="left"
    style="height: 100%; width: 100%"
    :closeable="false"
    :close-on-click-overlay="true"
    @opened="$emit('opened')"
    @closed="$emit('closed')"
  >
    <div class="drawer">
      <div v-if="showHeader" class="drawer__header">
        <slot name="header">
          <van-image
            class="drawer__back"
            :src="backIconUrl"
            @click="handleClose"
          ></van-image>
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

export default {
  name: "Drawer",
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
    display: flex;
    align-items: center;
    height: 3.5rem;
    padding: 0 12px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
  }

  .drawer__back {
    width: 0.6rem;
    height: 1.19rem;
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
