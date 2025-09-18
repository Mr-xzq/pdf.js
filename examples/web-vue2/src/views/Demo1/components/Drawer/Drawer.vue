<template>
  <van-popup
    :value="isShow"
    @input="$emit('update:is-show', $event)"
    position="left"
    style="height: 100%; width: 100%"
    closeable
  >
    <div class="drawer">
      <slot />
    </div>
  </van-popup>
</template>

<script>
export default {
  name: 'Drawer',
  props: {
    isShow: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
.drawer {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>

