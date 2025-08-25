import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import VConsole from 'vconsole';
import Vant from 'vant';
import 'vant/lib/index.css';

Vue.use(Vant);

// 检查是否为移动设备
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 仅在非生产环境且移动端下启用 VConsole
// if (process.env.NODE_ENV !== 'production' && isMobile) {
//   new VConsole();
// }

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount("#app");
