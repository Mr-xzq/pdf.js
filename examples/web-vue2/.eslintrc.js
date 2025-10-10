module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ["eslint:recommended", "plugin:vue/essential"],
  parserOptions: {
    parser: "@babel/eslint-parser",
  },
  rules: {
    indent: ["error", 2],
    "no-eval": 2,
    "vue/script-setup-uses-vars": "off",
    "vue/multi-word-component-names": "off",
    "vue/no-mutating-props": "off",
    "vue/no-reserved-component-names": "off",
  },
  globals: {
    // PDFJS_DIST_BASE_PATH: true,
  },
};
