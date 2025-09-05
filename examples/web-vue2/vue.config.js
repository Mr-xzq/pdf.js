const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const webpack = require("webpack");

// const globalPdfjsDistBase = path.resolve(__dirname, "../../pdfjs-dist");
// const localPdfjsDistBase = path.resolve(__dirname, "public/lib/pdfjs-dist");

module.exports = defineConfig({
  transpileDependencies: true,
  // lintOnSave: "warning",
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
        // "global-pdfjs-dist": globalPdfjsDistBase,
        // "local-pdfjs-dist": localPdfjsDistBase,
      },
    },
    plugins: [
      new webpack.DefinePlugin({
        // GLOBAL_PDFJS_DIST_BASE_PATH: JSON.stringify(globalPdfjsDistBase),
        // LOCAL_PDFJS_DIST_BASE_PATH: JSON.stringify(localPdfjsDistBase),
      }),
    ],
  },
});
