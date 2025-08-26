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
            <div class="cell-title">
              <span>阶段1测试 - 基础架构</span>
              <van-tag plain type="success">Stage 1</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button
              type="primary"
              size="small"
              icon="description"
              @click="goToStage1Test"
              >测试基础架构</van-button
            >
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>阶段2测试 - 基础架构</span>
              <van-tag plain type="success">Stage 2</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button
              type="primary"
              size="small"
              icon="description"
              @click="goToStage2Test"
              >测试基础架构</van-button
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
    goToStage1Test() {
      this.$router.push({
        path: "/stage1-test",
      });
    },
    goToStage2Test() {
      this.$router.push({
        path: "/stage2-test",
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
