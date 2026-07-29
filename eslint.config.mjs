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
    // Playwright 로컬 산출물 (gitignore 되어 있지만 ESLint는 별도 지정 필요)
    "playwright-report/**",
    "test-results/**",
    "playwright/.cache/**",
    // Claude Code 가 만드는 격리 워크트리 — 리포 전체 사본이라 린트하면
    // 같은 파일이 두 번 잡히고 node_modules 까지 딸려 들어온다.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
