import Vue from "vue";
import Vuex from "vuex";
import { pdfReaderModule } from "@/components/pdf/complexPdfReader/components/pdfReaderCore/store/index.js";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {},
  getters: {},
  mutations: {},
  actions: {},
  modules: {
    complexPdfReader: pdfReaderModule,
  },
});

export default store;
