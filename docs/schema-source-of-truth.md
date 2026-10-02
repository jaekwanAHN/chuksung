# 스키마의 소스 오브 트루스

`supabase/schema.sql` 이 현재 스키마의 소스 오브 트루스이고, `supabase/migrations/*.sql`
은 거기 도달하는 **경로의 기록**이다. 규칙 자체는 `AGENTS.md` 「명령어」에 있다.

## 왜 둘을 나눠 두나

마이그레이션은 시간순 델타라 "지금 스키마가 어떻게 생겼나"를 답하려면 11개 파일을
머릿속에서 합성해야 한다. `schema.sql` 은 그 합성 결과를 한 파일로 들고 있고, 주석으로
**왜 그렇게 되어 있는지**까지 담는다 — `security_invoker` 를 왜 켰는지, 어떤 인덱스가
어떤 조회 패턴을 겨냥하는지 같은 것들이다.

`supabase db dump` 로 기계 생성하는 방식은 이 주석과 의도가 통째로 사라지므로 쓰지 않는다.
대신 사람이 옮겨 적고, 옮겨 적기를 빠뜨렸는지는 아래 검사가 본다.

## 한 번 어긋났었다 (#101)

`completed_history` RPC 가 `20260728090454_history_aggregates.sql` 에만 있고
`schema.sql` 에는 없었다. **직전 마이그레이션(`0009`)까지는 전부 반영돼 있었고, 파일명
규칙이 순번(`0009_`)에서 타임스탬프(`20260728090454_`)로 바뀐 그 지점에서 끊겼다.**

증상이 조용했다. 원격 DB 에는 마이그레이션으로 이미 적용돼 있어 프로덕션은 멀쩡했고,
어긋남은 이런 형태로만 드러난다.

- `schema.sql` 만 보면 `/history` 가 무엇으로 집계되는지 알 수 없다
- `schema.sql` 로 새 환경을 세우면 `/api/tasks/history` 가
  `function public.completed_history does not exist` 로 죽는다 —
  **어떤 경로로 DB 를 세웠느냐에 따라 결과가 갈린다**

## 검사 — `pnpm db:check`

`scripts/db/check-schema-reflected.mjs` 가 마이그레이션이 만드는 객체(테이블·뷰·함수·
인덱스·트리거·타입·정책·제약·컬럼)의 이름을 뽑아 `schema.sql` 에 있는지 본다. CI 의
`lint-and-build` 에서도 실행된다.

**한계를 분명히 해 둔다. 이름만 대조한다.** 객체가 통째로 빠진 경우는 결정론적으로
잡지만, 이름은 같은데 정의가 다른 경우(파라미터가 하나 늘었다든지, `security invoker`
가 `definer` 로 바뀌었다든지)는 못 잡는다. #101 의 실패 모드가 정확히 전자였고, 그것을
막는 것이 이 검사의 목적이다.

정의 내용까지 보려면 `supabase db diff` 가 필요한데, shadow DB 용 Docker 와 DB 비밀번호가
있어야 한다. CI 에 넣으면 secret 이 하나 늘고, 이 저장소는 마이그레이션을 Supabase SQL
Editor 로 수동 적용해 와서 오탐이 나기 쉬운 구조다. 그래서 지금은 이름 대조만 둔다.

## Docker 없이 원격과 대조하는 법

`pnpm db:diff` 가 안 되는 환경에서도 특정 함수 하나는 PostgREST 로 확인할 수 있다.
#101 을 처리할 때 쓴 방법이다.

| 확인 | 방법 | 기대값 |
|---|---|---|
| 함수가 원격에 있나 | 인증 토큰으로 `POST /rest/v1/rpc/<함수>` 를 **정확한 파라미터 이름**으로 호출 | 200 |
| 시그니처가 맞나 | 없는 파라미터를 하나 넣어 호출 | `PGRST202` |
| `anon` revoke 가 살아 있나 | 같은 호출을 anon 키로 | 401 |

읽기 전용(`stable`) 함수에만 쓸 것. 쓰기 부작용이 있는 RPC 를 이렇게 두드리면 데이터
볼륨이 바뀌어 성능 원장이 오염된다
(`docs/perf/incidents/data-volume-contamination.md`).

## Management API로 원격 실제 상태 확인

Docker를 사용할 수 없어 `pnpm db:diff`가 막혔거나, 이름 검사로는 확인할 수 없는
함수 정의·정책 등을 대조해야 할 때 Management API의
`POST /v1/projects/<project-ref>/database/query`로 카탈로그를 조회할 수 있다.
Docker 사용 가능 여부는 실행 환경에서 확인하며, WSL이라는 이유만으로 없다고 가정하지 않는다.

이 절차는 **조회 전용**이다. Management API 액세스 토큰은 DB 조회만 가능한 키가
아니며 원격 대상은 운영 DB다. HTTP POST는 SQL 전달 방식일 뿐 쓰기 허가를 뜻하지 않는다.

1. 현재 작업의 Supabase URL과 연결된 프로젝트를 대조해 대상 project ref를 확인한다.
   예전 명령에 들어 있던 프로젝트 식별자를 그대로 복사하지 않는다.
2. 필요한 객체만 한정한 카탈로그 조회 SQL을 준비한다. 예를 들어 `pg_proc`와
   `pg_namespace`에서 스키마·함수 이름을 제한해 `pg_get_functiondef`로 정의를 읽거나,
   `pg_policies`에서 대상 테이블의 RLS 정책을 읽는다.
3. 기존에 구성된 Management API 인증으로 JSON 본문의 `query`에 조회 SQL을 전달한다.
   토큰은 요청 인증에만 사용하고 터미널 출력·문서·커밋에 남기지 않는다.
4. 결과를 `supabase/schema.sql` 및 관련 마이그레이션과 대조하고 대상 프로젝트,
   확인 시각, 확인한 저장소 커밋과 차이를 기록한다. 필요한 정의만 남기고 사용자 데이터는
   수집하지 않는다.

`SELECT`로 시작한다는 이유만으로 안전한 조회라고 판단하지 않는다. 쓰기 함수 호출,
데이터를 변경하는 CTE, DML·DDL·권한 변경은 이 절차에서 실행하지 않는다.
차이를 발견해도 여기서 수정 SQL을 실행하지 않고 저장소의 DB 변경 절차로 넘긴다.
토큰이나 권한이 없으면 확인하지 못한 범위를 기록한다. PostgREST 호출 결과만으로
함수 본문까지 일치한다고 보고하지 않는다.

## 남은 것

`completed_tasks_history` 뷰(`schema.sql`)는 `src/` 어디서도 쓰이지 않는다. 이 RPC 로
대체된 잔재로 보이나 드롭은 되돌리기 어려워 별건으로 둔다.
