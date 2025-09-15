.v<template>
  <van-popup
    :value="isShow"
    @input="$emit('update:is-show', $event)"
    position="left"
    style="height: 100%; width: 100%"
    closeable
  >
    <div>显示内容</div>
  </van-popup>
</template>

<script>
export default {
  props: {
    isShow: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
