import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  pluginJs.configs.recommended,
  {
    ignores: ["node_modules/**", "data/**", "public/js/i18n.js"],
  },
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "warn",
    },
  },
];
