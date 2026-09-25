import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Legacy plain-JS test runners (CommonJS node scripts, not TS modules):
    // require() and unused locals are idiomatic there.
    files: ["tests/**/*.js", "test/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Test code legitimately casts mocks/query builders to loose shapes
    // (vi.mock adapters, thenable query-builder assertions, harness helpers).
    // Product code (app/lib/components/scripts) keeps strict typing.
    files: ["test/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
