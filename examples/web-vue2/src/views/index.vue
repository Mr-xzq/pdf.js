<template>
  <div class="route-test">
    <van-nav-bar
      title="路由测试"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="content">
      <van-cell-group inset title="PDF.js 迁移测试">
        <van-cell center>
          <template #title>
            <div class="cell-title">complexReaderDemo</div>
          </template>
          <template #right-icon>
            <van-button
              type="primary"
              size="small"
              icon="description"
              @click="goToComplexReaderDemo"
              >complexReaderDemo</van-button
            >
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    goToComplexReaderDemo() {
      this.$router.push({
        path: "/complex-pdf-reader-demo",
      });
    },
  },
};
</script>

<style lang="less" scoped>
.route-test {
  min-height: 100vh;
  background-color: #f7f8fa;

  .content {
    padding: 12px;
  }

  .cell-title {
    display: flex;
    align-items: center;
    margin-right: 8px;
  }
}
</style>
