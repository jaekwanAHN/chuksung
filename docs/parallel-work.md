# 병렬 작업 — 워크트리와 슬롯

작업 갈래를 여러 개 동시에 돌리기 위한 구조. 브랜치를 만들듯 워크트리를 만들고,
끝나면 함께 지운다.

```bash
pnpm wt:new fix/header-date   # 워크트리 생성 + 부트스트랩 (슬롯 자동 배정)
cd .claude/worktrees/fix+header-date
# … 작업 · PR · 머지 …
pnpm wt:rm fix/header-date     # 워크트리 삭제 (슬롯 자동 반납)
pnpm wt:ls                     # 지금 몇 번을 쓰고 있나
```

## 슬롯이 왜 필요한가

`git worktree` 는 **파일만** 갈라준다. 작업에 필요한 것 중 파일이 아닌 게 둘 있다.

| 자원 | 어디에 있나 | 워크트리가 갈라주나 |
|---|---|---|
| 소스 · `node_modules` · `.next` | 디스크 | 갈라진다 |
| **localhost 포트** | 이 머신에 하나 | 안 갈라진다 |
| **Supabase E2E 테스트 계정** | 원격 DB 에 하나 | 안 갈라진다 |

나누지 않으면 두 가지가 터진다.

**포트 — 조용한 오탐.** `playwright.config.ts` 의 `webServer.reuseExistingServer` 가
로컬에서 `true` 다. 워크트리 둘이 같은 포트를 쓰면 나중 실행이 **먼저 뜬 워크트리의
dev 서버를 그대로 재사용한다.** 에러 없이, 다른 브랜치의 코드를 테스트하고 통과한다.
죽는 실패가 아니라 초록불이 뜨는 실패라 알아채기 어렵다.

**계정 — 무작위 빨간불.** 모든 스펙이 한 계정의 실 DB 를 조작한다. 두 갈래가 동시에
시딩·설정 변경·목록 조작을 하면 서로의 데이터를 지우고 만든다.

**슬롯은 이 둘을 한 세트로 묶은 번호다.**

| 슬롯 | 체크아웃 | 포트 | E2E 계정 | perf |
|---|---|---|---|---|
| 0 | 기본 체크아웃 | 3100 | `E2E_TEST_USER_*` | 여기서만 |
| 1 | 워크트리 | 3101 | `E2E_TEST_USER_*_1` | 불가 |
| 2 | 워크트리 | 3102 | `E2E_TEST_USER_*_2` | 불가 |

슬롯별 값은 그 워크트리의 `.env.local` 에만 쓴다. **스펙 코드는 한 줄도 고치지 않는다**
— 포트도 계정도 이미 환경변수로 갈라져 있다 (`playwright.config.ts`, `e2e/auth.setup.ts`).

## 슬롯을 기록하지 않는 이유

점유 현황을 파일에 적어두지 않는다. **살아 있는 워크트리에서 역산한다** — 각 워크트리
`.env.local` 의 `WT_SLOT` 을 읽어 쓰이는 번호를 모으고, 남은 최소 번호를 준다
(`scripts/worktree/slots.mjs`).

상태 파일을 두면 `pnpm wt:rm` 을 거치지 않은 삭제(손으로 `git worktree remove`,
디렉터리 통째로 삭제)에서 조용히 어긋난다. 어긋난 대장은 있는 번호를 없다고 하거나
없는 번호를 준다. 역산에는 그 실패가 없다 — 디렉터리가 사라지면 번호는 저절로 빈다.

대신 한 가지를 포기했다: **부트스트랩이 안 된 워크트리는 슬롯을 잡지 못한다.**
`.env.local` 이 없으면 `WT_SLOT` 도 없기 때문이다. 그런 워크트리는 어차피 빌드도 E2E 도
못 돌므로 실질적인 손해가 아니고, `pnpm wt:ls` 가 「슬롯 없는 워크트리」로 따로 보여준다.

## 부트스트랩 — 무엇을 채우나

`git worktree add` 는 **git 이 추적하는 파일만** 펼친다. gitignore 된 것은 따라오지
않으므로, 갓 만든 워크트리는 소스만 있고 돌아가지는 않는다.

| 없는 것 | 왜 gitignore 인가 | `wt:new` 가 하는 일 |
|---|---|---|
| `.env.local` | service role key · 테스트 계정 비밀번호 | 기본 체크아웃에서 복사 + 슬롯 값으로 치환 |
| `node_modules` | 크기 · 플랫폼 의존 바이너리 | `pnpm install --frozen-lockfile` |
| `.claude/settings.local.json` | 개인 로컬 설정 | 복사 (없으면 넘어감) |
| `next-env.d.ts` | 빌드 산출물 | 아무것도 안 함 — `next build` 가 만든다 |

**gitignore 를 푸는 것은 해결책이 아니다.** service role key 는 RLS 를 통째로 우회하는
키라 히스토리에 한 번 들어가면 재발급 말고는 되돌릴 방법이 없다. 그리고 애초에 필요가
없다 — 이 값들은 이미 이 머신의 기본 체크아웃에 있고, 부트스트랩은 **로컬 안에서 옆으로
복사하는 일**이라 원격이 관여하지 않는다.

Playwright 브라우저 바이너리는 `~/.cache/ms-playwright` 에 있어 머신 전체가 공유한다 —
워크트리마다 다시 받지 않는다.

### 새 워크트리에서는 `pnpm build` 를 먼저 돌린다

`npx tsc --noEmit` 을 먼저 돌리면 실제로 없는 오류가 뜬다.

```
src/app/api/tasks/[id]/route.ts(4,31): error TS2304: Cannot find name 'RouteContext'.
```

`RouteContext` 는 Next 가 `.next/types/` 에 **생성하는** 전역 타입이라 빌드를 한 번도
돌리지 않은 워크트리에는 없다. `pnpm build` 후에는 `tsc` 가 통과한다.

`/work` 6번은 "`tsc` 를 먼저 돌린다"고 안내하는데, 그 순서는 `.next` 가 이미 있는
체크아웃을 전제한다. 새 워크트리에서의 **첫 검증만** 순서를 뒤집으면 되고, 그 뒤로는
평소대로 `tsc` 를 먼저 돌리는 게 빠르다.

## 워크트리에 주지 않는 것

`wt:new` 는 `.env.local` 을 복사하면서 두 가지를 **지운다.** 규칙으로 지키는 대신
**닿을 수 없게** 만드는 쪽을 택했다.

**`PERF_TEST_USER_*`** — perf 계정 오염은 몇 주 뒤에야 드러나는 종류의 사고다. 성능
원장의 세로 비교가 그 계정의 데이터 볼륨이 고정되어 있다는 전제 위에 서 있고, 한 번
쓰면 전제가 조용히 깨진다 (`docs/perf/accounts.md`). 값이 없으면 워크트리에서 실수로
perf 를 돌려도 그 계정에 닿지 못한다.

**`SUPABASE_SERVICE_ROLE_KEY`** — RLS 를 통째로 우회하는 키다. 쓰는 곳은
`scripts/e2e/provision-account.mjs` 하나뿐이고, 계정 풀은 기본 체크아웃 `.env.local` 에
등록해야 하므로 프로비저닝은 본래 거기서 하는 작업이다. 워크트리가 늘어날 때마다
사본이 늘어날 이유가 없다.

둘 다 없어서 실패할 때는 각 스크립트가 무엇이 없는지 적어 멈춘다 — 조용히 잘못된
계정을 쓰는 것보다 낫다.

## 직렬로 남긴 것

병렬화하지 않는다. 슬롯을 늘려도 풀리지 않는 것들이다.

| 대상 | 왜 |
|---|---|
| `pnpm perf` | perf 계정 1개 + 원장 파일 1개(`docs/perf/history.md`). 동시 실행이 서로를 덮는다 |
| `pnpm db:push` | 원격 Supabase 프로젝트가 하나. 두 갈래가 동시에 스키마를 바꾸면 충돌한다 |
| 한 프로세스 안의 E2E 워커 | `workers: 1` 유지. 슬롯은 워크트리 *사이*를 가를 뿐, 한 프로세스 안 워커들은 여전히 같은 계정을 공유한다 |
| CI 의 `e2e` job | `concurrency: e2e-shared-account` 유지. CI 병렬화는 별도 과제다 (아래) |

## 계정 풀 만들기

기본 체크아웃 `.env.local` 에 슬롯 수만큼 계정을 둔다.

```bash
pnpm e2e:provision --email <슬롯1 주소> --email <슬롯2 주소>
```

`scripts/e2e/provision-account.mjs` 가 기준 계정(`E2E_TEST_USER_EMAIL`)의 데이터를
복제해 계정을 만들고, 붙여넣을 두 줄을 출력한다. 출력의 `PERF_TEST_USER_*` 를
**슬롯 번호를 붙인 이름으로 바꿔** 넣는다.

```bash
# 기본 체크아웃 .env.local
E2E_TEST_USER_EMAIL=<기준 계정>          # 슬롯 0
E2E_TEST_USER_PASSWORD=<기준 계정 비번>

E2E_TEST_USER_EMAIL_1=<슬롯 1 계정>       # 워크트리용 풀
E2E_TEST_USER_PASSWORD_1=<슬롯 1 비번>
E2E_TEST_USER_EMAIL_2=<슬롯 2 계정>
E2E_TEST_USER_PASSWORD_2=<슬롯 2 비번>
```

`E2E_TEST_USER_EMAIL_1` 부터 끊길 때까지 세어 풀 크기를 정한다. 즉 **계정을 늘리면
슬롯이 늘어난다.** 풀이 꽉 차면 `wt:new` 가 무엇이 막고 있는지 적어 실패한다.

계정은 실 DB 에 만들어지고 삭제는 Supabase 대시보드 수동이다. 그래서 워크트리마다
새로 만들지 않고 **미리 만들어 돌려쓴다** — 매번 만들면 기준 계정 데이터를 통째로
복제하느라 느리고, 버려진 계정이 쌓인다.

## 남은 과제 — CI 병렬화

CI 의 `e2e` job 은 여전히 전역 직렬이다(`concurrency: e2e-shared-account`). 로컬은
이 문서로 풀렸지만 CI 는 PR→슬롯 매핑과 반납 처리가 필요해 성격이 다르고, 잘못
건드리면 `e2e` 가 required check 라 저장소 전체의 머지가 막힌다. 한계와 전제는
`e2e/README.md` 「데이터 취급 원칙」에 있다.
