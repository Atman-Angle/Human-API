import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".cache/**",
      "dist/**",
      "coverage/**",
      "apps/web/**",
      ".codex/**",
      ".data/**",
      "fixtures/**",
      "Temp/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
