import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  {
    ignores: [ "**/dist/*", "**/node_modules/*" ]
  },
  { languageOptions: { 
    globals: globals.browser,
    parserOptions: {  
      project: "./tsconfig.json",
      plugins: ["solid"]
    }
  }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  
]; 