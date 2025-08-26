const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const webpack = require("webpack");

const pdfjsDistBase = path.resolve(__dirname, "../../pdfjs-dist");

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        "pdfjs-dist": pdfjsDistBase,
      },
    },
    plugins: [
      new webpack.DefinePlugin({
        PDFJS_DIST_BASE_PATH: JSON.stringify(pdfjsDistBase),
      }),
    ],
  },
});
