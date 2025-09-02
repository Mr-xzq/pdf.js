<template>
  <van-button
    :class="buttonClass"
    :type="type"
    :size="vantSize"
    :round="round"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot name="icon"></slot>
    <slot></slot>
  </van-button>
</template>

<script>
export default {
  name: "PdfButton",
  props: {
    type: { type: String, default: "default" },
    size: { type: String, default: "medium" }, // small | medium | large
    round: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    buttonClass() {
      return {
        "pdf-button": true,
        "pdf-button--round": this.round,
        "pdf-button--active": this.active,
      };
    },
    vantSize() {
      switch (this.size) {
        case "small":
          return "small";
        case "large":
          return "large";
        default:
          return "normal"; // 对应 Vant 的默认尺寸
      }
    },
  },
};
</script>

<style lang="less" scoped>
.pdf-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pdf-button--round {
  border-radius: 50%;
  padding: 0;
}

.pdf-button--active {
  // 由使用场景覆盖更具体的样式
}
</style>
