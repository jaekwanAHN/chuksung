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

  // ─────────────────────────────────────────────────────────────────────
  // AGENTS.md 「하드 룰」 중 기계로 판정 가능한 것.
  //
  // 하드 룰은 대부분 의미 판단이 필요해 코드 리뷰에 의존하지만, 아래 둘은
  // 구문만 보고 확정할 수 있다. 여기서 결정론적으로 잡으면 리뷰는 판단이
  // 필요한 룰에만 집중할 수 있다.
  //
  // 룰의 단일 원본은 AGENTS.md 다. 여기는 그 집행 수단일 뿐이므로,
  // 규칙 자체를 바꿀 때는 AGENTS.md 를 먼저 고친다.
  // ─────────────────────────────────────────────────────────────────────

  // 하드 룰: 훅 파일에는 'use client' 명시
  //
  // 대상을 `use*` 네이밍으로 한정한다 — 이 저장소의 훅 파일은 모두 이 규칙을
  // 따르고, `_hooks/` 디렉터리 전체를 잡으면 서버 컴포넌트가 import 하는
  // `profileKeys.ts` 같은 비-훅 파일까지 걸려 오히려 잘못된 지시가 된다.
  //
  // no-restricted-syntax 의 `:not(:has(...))` 로도 표현되지만 esquery 가
  // 기대대로 매칭하지 않아 전 파일 오탐이 났다. 하드 룰 게이트라 동작이
  // 확실해야 하므로 AST 를 직접 보는 로컬 룰로 둔다.
  {
    files: ["src/**/use*.ts", "src/**/use*.tsx"],
    plugins: {
      chuksung: {
        rules: {
          "require-use-client": {
            meta: {
              type: "problem",
              docs: {
                description:
                  "훅 파일은 'use client' 지시문으로 시작해야 한다 (AGENTS.md 「하드 룰」)",
              },
              schema: [],
            },
            create(context) {
              return {
                Program(node) {
                  const first = node.body[0];
                  const isUseClient =
                    first?.type === "ExpressionStatement" &&
                    first.expression?.type === "Literal" &&
                    first.expression.value === "use client";
                  if (isUseClient) return;
                  context.report({
                    node: first ?? node,
                    message:
                      "훅 파일은 'use client' 로 시작할 것 (AGENTS.md 「하드 룰」). 서버 컴포넌트에서 실수로 import 되는 것을 막는다.",
                  });
                },
              };
            },
          },
        },
      },
    },
    rules: {
      "chuksung/require-use-client": "error",
    },
  },

  // 하드 룰: 클라이언트 API 호출은 @/lib/axios 의 apiClient
  //
  // (a) axios 를 직접 import 해 별도 인스턴스를 만드는 것을 막는다.
  //     유일한 예외는 apiClient 를 정의하는 src/lib/axios.ts 자신.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/lib/axios.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                "axios 를 직접 import 하지 말 것 (AGENTS.md 「하드 룰」). '@/lib/axios' 의 apiClient 를 쓴다 — baseURL 과 401 → /login 리다이렉트가 그곳에 일원화되어 있다.",
            },
          ],
        },
      ],
    },
  },

  // (b) 클라이언트 코드에서 raw fetch 를 막는다.
  //     route handler(src/app/api/**)는 서버 코드라 대상이 아니다.
  //     서버 컴포넌트가 외부 API 를 부르는 등 정당한 필요가 생기면
  //     `eslint-disable-next-line` 주석에 이유를 적는다 — 리뷰에서 보이게.
  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx", "src/components/**/*.tsx"],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "raw fetch 대신 '@/lib/axios' 의 apiClient 를 쓸 것 (AGENTS.md 「하드 룰」).",
        },
      ],
    },
  },
]);

export default eslintConfig;
