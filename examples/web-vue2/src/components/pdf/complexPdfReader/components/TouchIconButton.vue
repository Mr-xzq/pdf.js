<template>
  <div
    class="touch-icon-button"
    :style="wrapperStyle"
    @click="$emit('click', $event)"
  >
    <van-image class="icon-img" :class="imgClass" :src="src" />
  </div>
</template>

<script>
export default {
  name: "TouchIconButton",
  props: {
    src: { type: String, required: true },
    // 传入原有用于控制图片尺寸的类名，保持视觉尺寸不变
    imgClass: { type: [String, Array, Object], default: "" },
    // 互斥控制：若 padding 为有效数值，则仅使用 padding 扩大热区；否则使用 minSize 限制最小可点尺寸
    // 点击热区的最小宽高（像素）
    minSize: { type: Number, default: 40 },
    // 额外内边距（像素），在不改变图片尺寸的情况下扩大可点击区域；当设置为数字时优先生效
    padding: { type: Number, default: null },
  },
  computed: {
    wrapperStyle() {
      const usePadding = ![null, undefined].includes(this.padding);
      if (usePadding) {
        return { padding: this.padding + "px" };
      }
      const size = Number(this.minSize) || 0;
      return { minWidth: size + "px", minHeight: size + "px" };
    },
  },
};
</script>

<style lang="less" scoped>
.touch-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;

  .icon-img {
    display: block;
  }
}
</style>
