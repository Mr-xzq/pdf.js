import Vue from "vue";
import VueRouter from "vue-router";

const originalPush = VueRouter.prototype.push;
const originalReplace = VueRouter.prototype.replace;

// Vue Router 3.1.0 版本之后。当尝试导航到当前所在的路由位置时，会抛出 NavigationDuplicated 错误
// 重写 push 方法
VueRouter.prototype.push = function push(location) {
  // 增加错误捕获
  return originalPush.call(this, location).catch(err => {
    // 如果是重复导航错误，则忽略
    if (err.name === "NavigationDuplicated") {
      // 返回 Promise.resolve 让链式调用继续
      return Promise.resolve(err);
    }
    // 如果是其他错误，则继续抛出
    return Promise.reject(err);
  });
};

// 重写 replace 方法
VueRouter.prototype.replace = function replace(location) {
  return originalReplace.call(this, location).catch(err => {
    if (err.name === "NavigationDuplicated") {
      return Promise.resolve(err);
    }
    return Promise.reject(err);
  });
};

const routes = [
  {
    path: "/",
    component: () => import("@/views/index.vue"),
  },
  {
    path: "/stage1-test",
    component: () => import("@/views/Stage1Test.vue"),
  },
  {
    path: "/stage2-test",
    component: () => import("@/views/Stage2Test.vue"),
  },
  {
    path: "/stage3-test",
    component: () => import("@/views/Stage3Test.vue"),
  },
  {
    path: "/stage4-test",
    component: () => import("@/views/Stage4Test.vue"),
  },
  {
    path: "/simple-reader-demo",
    component: () => import("@/views/SimpleReaderDemo.vue"),
  },
  {
    path: "/demo1",
    component: () => import("@/views/Demo1/index.vue"),
  },
  {
    path: "/tree-test",
    component: () => import("@/views/Demo1/components/Tree/Test.vue"),
  },
];

Vue.use(VueRouter);

const router = new VueRouter({
  routes,
});

export default router;
