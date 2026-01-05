import Vue from "vue";
import Vuex from "vuex";
// 通过 core/store.js 暴露稳定的 pdfReaderCore 模块入口
import { pdfReaderCoreModule } from "@/components/pdf/core/store.js";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {},
  getters: {},
  mutations: {},
  actions: {},
  modules: {
    pdfReaderCore: pdfReaderCoreModule,
  },
});

export default store;
