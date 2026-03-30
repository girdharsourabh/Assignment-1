import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^(next|error)$", "caughtErrorsIgnorePattern": "^error$" }],
      "no-console": "off"
    }
  }
];
