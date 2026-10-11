// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // a page method that forgets to await an action is the commonest Playwright bug
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/naming-convention": "off",
    },
  },
  { files: ["eslint.config.mjs"], ...tseslint.configs.disableTypeChecked },
);
