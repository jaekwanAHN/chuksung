# API 남용 방어 — 검증 절차

`docs/security/README.md` 에 적은 가드가 실제로 동작하는지 확인하는 재현 절차다.
방어 코드를 고칠 때마다 여기를 그대로 다시 돌린다.

최초 실측: 2026-08-05, 커밋 `4eabb4c`, `next dev` 기준.

## 왜 수동 절차인가

가드 대부분이 **정상 클라이언트가 만들 수 없는 요청**을 대상으로 한다. 조작된
`client_now`, 200KB 본문, 분당 320회 호출은 브라우저를 몰아서는 재현되지 않고
`apiClient` 를 거치지도 않는다. Playwright 의 `request` 픽스처로 옮길 수는 있으나
E2E 스위트가 매 실행마다 레이트 리밋 예산을 소모하게 되므로 지금은 분리해 둔다.
자동화 후보는 맨 아래에 적었다.

## 준비

E2E 인증 셋업이 만든 세션 쿠키를 그대로 쓴다. 없으면 `pnpm test:e2e` 를 한 번
돌리거나 `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` 를 채우고 setup 프로젝트만
실행한다.

```bash
pnpm dev --port 3101

node -e "
const s = require('./e2e/.auth/user.json')
console.log(s.cookies.map(k => k.name + '=' + k.value).join('; '))
" > /tmp/cookie.txt

C=$(cat /tmp/cookie.txt)
B=http://localhost:3101
```

> 실제 Supabase 프로젝트의 **테스트 계정 데이터**를 건드린다. 아래 3-2 는 태스크를
> 1건 만들므로 마지막의 정리 단계까지 반드시 수행할 것.

## 1. 시딩 게이트 — 조작된 `client_now`

게이트가 클라이언트 시각만 믿던 시절의 공격 요청을 그대로 보낸다.

```bash
curl -s -H "Cookie: $C" \
  "$B/api/tasks?scope=daily&target_date=2030-01-01&client_now=2030-01-01T23:59"
```

기대: `[]`. 서버 시각과 24시간 넘게 벌어진 `client_now` 는 게이트에 들어가지 못하므로
시딩이 일어나지 않고, 해당 날짜에 태스크도 없어 빈 배열이 나온다.

수정 전이라면 활성 템플릿 수만큼의 태스크가 시딩되어 응답에 실려 나왔다. 날짜를
바꿔가며 반복하면 그만큼 행이 계속 늘어난다.

**실측: `[]` (0건).**

## 2. 시딩 게이트 — 정상 요청 회귀

가드가 정상 경로를 막지 않는지 같이 본다. 이 확인 없이 1번만 통과하는 것은
"시딩을 통째로 껐다"와 구별되지 않는다.

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M)
TODAY=$(date -u +%Y-%m-%d)
curl -s -H "Cookie: $C" \
  "$B/api/tasks?scope=daily&target_date=$TODAY&client_now=$NOW"
```

기대: 오늘자 태스크 목록이 평소대로 나온다. 활성 템플릿이 아직 적용 전이면 이
호출에서 시딩된다.

**실측: 30건.**

> `date -u` 로 UTC 를 넣어도 통과해야 정상이다. `client_now` 는 로컬 벽시계지만
> 허용 오차 24시간이 타임존 폭(+14 / −12)을 덮기 때문이다. 이 확인이 곧 오차 범위가
> 실제 타임존을 수용하는지에 대한 검증이기도 하다.

## 3. 본문 크기 상한

### 3-1. `Content-Length` 가 있는 경우

```bash
node -e "
const big = { title: 'x'.repeat(200000), scope: 'daily', target_date: '2026-08-05' }
require('fs').writeFileSync('/tmp/big.json', JSON.stringify(big))
"

curl -s -X POST -H "Cookie: $C" -H 'Content-Type: application/json' \
  --data-binary @/tmp/big.json "$B/api/tasks" -w '\n%{http_code}\n'
```

기대: `413`, `{"error":"본문이 너무 큽니다."}`.

**실측: `413`.**

### 3-2. `Content-Length` 를 숨긴 chunked 전송

헤더만 보고 끊었다면 여기서 뚫린다. 스트림 누적 바이트 검사가 붙어 있어야 막힌다.

```bash
curl -s -X POST -H "Cookie: $C" -H 'Content-Type: application/json' \
  -H 'Transfer-Encoding: chunked' \
  --data-binary @/tmp/big.json "$B/api/tasks" -w '\n%{http_code}\n'
```

기대: `413`.

**실측: `413`.**

### 3-3. 정상 크기 회귀

```bash
curl -s -X POST -H "Cookie: $C" -H 'Content-Type: application/json' \
  -d '{"title":"__probe__","scope":"daily","target_date":"2026-08-05"}' \
  "$B/api/tasks" -w '\n%{http_code}\n'
```

기대: `201` + 생성된 행. **응답의 `id` 를 적어둘 것 — 정리 단계에서 지운다.**

**실측: `201`.**

## 4. 레이트 리밋

읽기 상한이 300/분이므로 **60초 안에** 320회를 보내야 경계가 드러난다. 순차 호출로는
윈도가 먼저 넘어가 재현되지 않으니 반드시 병렬로 보낸다.

```bash
seq 1 320 | xargs -P 32 -I{} \
  curl -s -o /dev/null -w '%{http_code}\n' -H "Cookie: $C" "$B/api/ddays" \
  | sort | uniq -c
```

기대: `300` 개의 `200` + `20` 개의 `429`. 상한이 정확히 300에서 걸리는지가 핵심이다.

```bash
curl -s -D - -o /dev/null -H "Cookie: $C" "$B/api/ddays" | grep -iE '^(HTTP|retry-after)'
```

기대: `429` 와 남은 윈도 초를 담은 `Retry-After`.

**실측: `300 × 200`, `20 × 429`, `retry-after: 56` (5초 소요).**

> 쓰기 버킷(100/분)은 같은 방식으로 확인할 수 있지만 100건의 행이 생기므로 일상적인
> 회귀 확인에서는 생략한다. 읽기와 쓰기가 같은 코드 경로를 타고 상한만 다르다.

### 읽기 폭주가 쓰기를 막지 않는지

버킷 분리가 목적대로 동작하는지 본다. 위 320회 직후, 읽기가 아직 차단 상태일 때
쓰기를 한 번 보낸다.

```bash
curl -s -X DELETE -H "Cookie: $C" "$B/api/tasks/<3-3에서 받은 id>" -w '%{http_code}\n'
```

기대: `204`. 읽기 예산이 소진돼도 쓰기는 자기 예산으로 통과한다. 이 호출이 3-3 이
만든 탐침 데이터 정리를 겸한다.

**실측: `204`.**

## 5. 프록시 matcher

`getUser()` 왕복이 2회에서 1회로 줄었는지는 응답만 봐서는 드러나지 않으므로 matcher
정규식을 직접 확인한다.

```bash
node -e "
const re = new RegExp('^/((?!api|_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)\$).*)\$')
for (const p of ['/api/tasks','/api/tasks/history','/daily','/login','/auth/callback','/_next/static/x.js','/logo.svg']) {
  console.log((re.test(p) ? '통과' : '제외').padEnd(4), p)
}
"
```

기대: `/api/*` 와 정적 자산은 **제외**, `/daily` · `/login` · `/auth/callback` 은 **통과**.
`/auth/callback` 이 제외되면 OAuth 콜백의 세션 갱신이 깨지므로 특히 중요하다.

**실측: 기대와 일치.**

프록시가 보호하던 페이지 리다이렉트는 E2E 의 `login.spec.ts` · `navigation.spec.ts` 가
덮으므로 별도 확인하지 않는다.

## 6. `tz` 검증

```bash
curl -s -H "Cookie: $C" "$B/api/tasks/history?tz=Not/AZone&limit=0" -w '\n%{http_code}\n'
curl -s -H "Cookie: $C" "$B/api/tasks/history?tz=Asia/Seoul&limit=0" -w '\n%{http_code}\n'
```

기대: 앞은 `400` + `tz 가 올바른 IANA 타임존이 아닙니다.`, 뒤는 `200`.
수정 전에는 앞이 Postgres 예외를 거쳐 `500` 으로 나갔다.

**실측: `400` / `200`.**

## 정리

```bash
# 3-3 이 만든 탐침 태스크가 남아 있으면 삭제 (4번에서 지웠다면 불필요)
curl -s -X DELETE -H "Cookie: $C" "$B/api/tasks/<id>"

rm -f /tmp/cookie.txt /tmp/big.json
```

dev 서버를 내리고, 1번이 남긴 데이터가 없는지 마지막으로 확인한다.

```bash
curl -s -H "Cookie: $C" "$B/api/tasks?scope=daily&target_date=2030-01-01"
```

기대: `[]`.

## 함께 도는 것

- `pnpm lint && pnpm build`
- `pnpm test:e2e` — 48개 전부 통과해야 한다. 스위트 전체가 레이트 리밋 상한 아래로
  들어오는지에 대한 확인을 겸한다. 여기서 `429` 가 나오면 상한이 정상 사용량보다
  낮게 잡힌 것이므로 `src/lib/api/rate-limit.ts` 의 상수를 재검토할 것

## 자동화 후보

- 1·2번(시딩 게이트)은 Playwright `request` 픽스처로 옮기기 가장 쉽다. 데이터를 만들지
  않고 판정이 명확하다
- 3번(본문 크기)도 마찬가지다. 3-3 만 정리 단계가 필요하다
- 4번(레이트 리밋)은 스위트에 넣으면 다른 테스트의 예산을 잠식하므로, 옮긴다면 전용
  프로젝트로 분리하고 윈도가 지난 뒤 실행되게 해야 한다
