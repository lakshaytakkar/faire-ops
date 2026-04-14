import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Cross-space import guard — enforce SPACE_PATTERN.md §7:
// "No imports from another space's _components/". Each space's private
// components stay private. If something is useful elsewhere, promote
// it to src/components/shared/ or src/lib/ first.
const CROSS_SPACE_IMPORT_RULE = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/app/(portal)/ets/_components/**"],
            message:
              "Cross-space import. Promote to src/components/shared/ or src/lib/. See SPACE_PATTERN.md §7.",
          },
          {
            group: ["**/app/(portal)/usdrop/_components/**"],
            message:
              "Cross-space import. Promote to src/components/shared/ or src/lib/. See SPACE_PATTERN.md §7.",
          },
          {
            group: ["**/app/(portal)/development/_components/**"],
            message:
              "Cross-space import. Promote to src/components/shared/ or src/lib/. See SPACE_PATTERN.md §7.",
          },
          {
            group: ["**/app/(portal)/b2b/_components/**"],
            message:
              "Cross-space import. Promote to src/components/shared/ or src/lib/. See SPACE_PATTERN.md §7.",
          },
          {
            group: ["**/app/(portal)/hq/_components/**"],
            message:
              "Cross-space import. Promote to src/components/shared/ or src/lib/. See SPACE_PATTERN.md §7.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Each space owns its own _components/; others must not import from it.
  // Applies everywhere EXCEPT inside the owning space's own folder.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/app/(portal)/ets/**",
      "src/app/(portal)/usdrop/**",
      "src/app/(portal)/development/**",
      "src/app/(portal)/b2b/**",
      "src/app/(portal)/hq/**",
    ],
    ...CROSS_SPACE_IMPORT_RULE,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
