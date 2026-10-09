import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Folder rules from AGENTS.md: cross-folder imports go through the ~/ alias, and nothing imports from a route.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["../*"], message: "Import from outside this folder with the ~/ alias (AGENTS.md, Folder structure)." },
            { group: ["~/app/*"], message: "Routes are leaves. Move shared code to src/components or src/server (AGENTS.md)." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    ".claude/**", // vendored agent skills, not app code
    ".codex/**",
  ]),
]);

export default eslintConfig;
