# 병렬 작업 (git worktree)

여러 작업을 동시에 진행할 때 쓰는 worktree 규칙. worktree는 **작업 디렉토리와 git 인덱스만**
분리한다 — 이 프로젝트가 병렬 작업에서 깨지는 지점은 전부 worktree 밖의 공유 자원이다.

## 빠른 시작

```bash
pnpm wt feat/weekly-filter        # 생성 + .env.local 복사 + 포트 할당 + pnpm install
cd .claude/worktrees/feat-weekly-filter && claude
```

옵션: `--base <ref>` (기본 `main`), `--no-install`.

정리는 `/sync-main` — main에 머지된 브랜치의 worktree를 제거한 뒤 브랜치를 지운다
(worktree가 브랜치를 점유하므로 이 순서가 중요).

## 공유 자원 — 병렬로 돌리면 안 되는 것

| 자원 | 문제 |
|---|---|
| **원격 Supabase DB** | 프로젝트가 하나뿐이고, E2E·`/verify`가 **`e2e@example.com` 단일 계정**을 실 DB에서 공유한다. 동시 실행 시 서로의 데이터를 지운다 |
| `docs/perf/history.md` | append-only 델타 원장. 두 브랜치가 `pnpm perf`를 돌리면 머지 충돌이 확정적으로 난다 |
| `supabase/migrations` + `db:push` | 원격 DB 단일. 병렬 push는 마이그레이션 순서가 꼬인다 |

→ **코드는 병렬로, 검증은 직렬로.** `pnpm lint && pnpm build`는 worktree마다 `.next/`가
독립이라 병렬로 돌려도 안전하다. `pnpm test:e2e` / `pnpm perf` / `pnpm db:push`는 한 번에 하나.

## 포트

`playwright.config.ts`가 `E2E_PORT`를 읽어 dev 서버까지 그 포트로 띄우므로, `.env.local`의
`E2E_PORT` 한 줄이 dev·E2E를 동시에 해결한다. `pnpm wt`가 3110부터 10씩 올려가며
겹치지 않는 값을 자동 할당한다.

| 용도 | 포트 |
|---|---|
| `next dev` 기본 | 3000 |
| E2E 기본 (`E2E_PORT` 미지정) | 3100 |
| worktree 할당 대역 | 3110, 3120, 3130 … |
| Playwright 리포트 (`test:e2e:view`) | 9323 — 동시 실행 불가 |

## 새 worktree에 따라오지 않는 것

gitignore 대상이라 커밋에 없다. `pnpm wt`가 앞의 둘을 자동으로 복사한다.

- `.env.local` — **없으면 빌드·E2E가 전부 실패한다.** 가장 흔한 함정
- `.claude/settings.local.json` — 권한 허용 목록
- `node_modules` — `pnpm install` 필요 (pnpm store 하드링크라 대개 수 초)
- `e2e/.auth/` — `auth.setup.ts`가 실행 시 재생성하므로 복사 불필요

## 작업 분배 기준

- ✅ 라우트/도메인이 겹치지 않는 기능 (`/daily` ↔ `/weekly`), 문서 ↔ 코드, 리팩터링 ↔ 신규 기능
- ⚠️ 양쪽이 `src/components/ui/`나 `AGENTS.md` 같은 공용 파일을 건드리는 작업
- ❌ DB 마이그레이션 2건, `pnpm perf` 2건, E2E 2건 동시 실행

## Windows Terminal

탭 하나 = worktree 하나 = Claude 세션 하나. 탭 우클릭 → Rename Tab으로 브랜치명을 붙여두면
세션이 헷갈리지 않는다. 짧은 작업은 `Alt+Shift+D` 분할로 한 화면에 두고 봐도 된다.
