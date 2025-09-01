const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const webpack = require("webpack");

const pdfjsDistBase = path.resolve(__dirname, "../../pdfjs-dist");

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: "warning",
  devServer: {
    // overlay: {
    //   warnings: true,
    //   errors: true,
    // },
  },
  configureWebpack: {
    devtool: "source-map",
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
