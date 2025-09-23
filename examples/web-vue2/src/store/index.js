import Vue from "vue";
import Vuex from "vuex";
import { pdfReaderModule } from "../components/complexPdfReader/components/pdfReaderCore/store/index.js";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {},
  getters: {},
  mutations: {},
  actions: {},
  modules: {
    pdfReader: pdfReaderModule,
  },
});

export default store;
