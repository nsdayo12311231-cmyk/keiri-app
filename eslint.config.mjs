import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-console": "off", // Allow console statements
      "prefer-const": "warn", // Make it warning instead of error
      "@typescript-eslint/no-unused-vars": "warn", // Make it warning instead of error
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn", // Allow empty interfaces
      "react-hooks/exhaustive-deps": "warn", // Make it warning
      "@next/next/no-img-element": "warn", // Allow img elements
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "jest.config.js",
      "jest.setup.js",
    ],
  },
];

export default eslintConfig;
