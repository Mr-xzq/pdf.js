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
          <van-icon
            name="arrow-left"
            class="drawer__back"
            @click="handleClose"
          />
          <div class="drawer__title">{{ title }}</div>
          <div class="drawer__header-spacer" />
        </slot>
      </div>
      <div class="drawer__body">
        <slot />
      </div>
    </div>
  </van-popup>
</template>

<script>
export default {
  name: "Drawer",
  props: {
    isShow: { type: Boolean, default: false },
    title: { type: String, default: "" },
    showHeader: { type: Boolean, default: true },
  },
  methods: {
    handleClose() {
      this.$emit("update:is-show", false);
      this.$emit("close");
    },
  },
};
</script>

<style lang="less" scoped>
.drawer {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.drawer__header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.drawer__back {
  font-size: 18px;
}
.drawer__title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}
.drawer__header-spacer {
  width: 18px;
}
.drawer__body {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: #fff;
}
</style>
