import Vue from "vue";
import Vuex from "vuex";
import { installPdfReaderModule } from "../components/pdf-reader/store/index.js";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {},
  getters: {},
  mutations: {},
  actions: {},
  modules: {},
});

// 注册PDF阅读器模块
installPdfReaderModule(store);

export default store;
