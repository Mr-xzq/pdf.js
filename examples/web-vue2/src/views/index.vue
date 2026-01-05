<template>
  <div class="route-test">
    <van-nav-bar title="Demo" />

    <div class="content">
      <template v-for="demoConfigListItem in demoConfigList">
        <van-cell :key="demoConfigListItem.title" center>
          <template #title>
            <div class="cell-title">{{ demoConfigListItem.title }}</div>
          </template>
          <template #right-icon>
            <van-button
              type="primary"
              size="small"
              icon="arrow"
              @click="$router.push(demoConfigListItem.path)"
            ></van-button>
          </template>
        </van-cell>
      </template>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      demoConfigList: [
        { title: "MobileSimpleReaderDemo", path: "/mobile-simple-pdf-reader-demo" },
        { title: "MobileComplexReaderDemo", path: "/mobile-complex-pdf-reader-demo" },
        { title: "DesktopComplexReaderDemo", path: "/desktop-complex-pdf-reader-demo" },
      ],
    };
  },
  methods: {},
});
</script>

<style lang="less" scoped>
.route-test {
  min-height: 100vh;
  background-color: #f7f8fa;

  .content {
    padding: 12px;

    .van-cell {
      &:not(:last-child) {
        margin-bottom: 8px;
      }

      .cell-title {
        display: flex;
        align-items: center;
        margin-right: 8px;
      }
    }
  }
}
</style>
