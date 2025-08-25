<template>
  <div class="route-test">
    <van-nav-bar
      title="路由测试"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="content">
      <van-cell-group inset title="路由跳转测试">
        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>PDF阅读器</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button
              type="info"
              size="small"
              icon="description"
              @click="goToPdfReader"
              >跳转到PDF阅读器</van-button
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
    goToPdfReader() {
      this.$router.push({
        path: "/pdf-reader",
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
    gap: 8px;
  }
}
</style>
