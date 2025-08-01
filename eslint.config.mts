/*
 * @Author: phil
 * @Date: 2025-08-01 19:52:24
 */
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
]);
