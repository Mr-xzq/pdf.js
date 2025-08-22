<template>
  <div class="route-test">
    <van-nav-bar title="路由测试" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="content">
      <van-cell-group inset title="路由跳转测试">
        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>Redirect 跳转</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="info" size="small" icon="arrow" @click="redirectToWxView"> 跳转到 wx-view</van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>海报生成器</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="info" size="small" icon="photo-o" @click="goToPoster">跳转到海报页</van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>popup 测试页</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="info" size="small" icon="photo-o" @click="goToPopup">跳转到 popup 测试页</van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>canvas 测试页</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="info" size="small" icon="photo-o" @click="goToCanvas">跳转到 canvas 测试页</van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>调查问卷</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="info" size="small" icon="photo-o" @click="goToInvest">跳转到调查问卷</van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>PDF阅读器</span>
              <van-tag plain type="primary">内部路由</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="info" size="small" icon="description" @click="goToPdfReader">跳转到PDF阅读器</van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>外部跳转</span>
              <van-tag plain type="warning">location.href</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="warning" size="small" icon="external" @click="redirectToCustom">
              跳转到自定义页面
            </van-button>
          </template>
        </van-cell>

        <van-cell center>
          <template #title>
            <div class="cell-title">
              <span>参数测试</span>
              <van-tag plain type="success">随机参数</van-tag>
            </div>
          </template>
          <template #right-icon>
            <van-button type="primary" size="small" icon="replay" @click="updateRouteWithRandomParams">
              添加随机参数
            </van-button>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset title="当前路由信息" class="query-info">
        <van-cell title="fullPath" label="fullPath">
          {{ $route.fullPath }}
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script>
export default {
  mounted() {
    console.log('mounted-views-index');
  },
  methods: {
    redirectToWxView() {
      this.$router.push({
        path: 'redirect',
        query: {
          redirect: 'wx-view',
        },
      });
    },
    redirectToCustom() {
      // window.location.hash = window.location.hash;
      // window.location.href = window.location.href;

      console.log(window.location.href);
      // 外部链接跳转方式1: window.location
      window.location.href = 'https://www.baidu.com';

      // push 的路径会在当前路径后面 append, 和你写的是不是绝对 url 没关系
      // this.$router.push(window.location.href)
      // this.$router.push('http://www.baidu.com')

      // this.$router.push({
      //   path: '/',
      //   query: {
      //     redirect: 'index',
      //   },
      // });
    },
    updateRouteWithRandomParams() {
      // 合并现有 query 和新的随机参数
      const newQuery = {
        ...this.$route.query,
        timestamp: Date.now(),
        random: Math.random().toString(36).slice(2, 8),
      };

      this.$router.push({
        path: this.$route.path,
        query: newQuery,
      });
    },
    goToPoster() {
      this.$router.push({
        path: '/poster-playground',
      });
    },
    goToPopup() {
      this.$router.push({
        path: '/popup-playground',
      });
    },
    goToCanvas() {
      this.$router.push({
        path: '/canvas-playground',
      });
    },

    goToInvest() {
      this.$router.push({
        path: '/invest',
      });
    },

    goToPdfReader() {
      this.$router.push({
        path: '/pdf-reader',
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

  .query-info {
    margin-top: 12px;
  }
}
</style>
