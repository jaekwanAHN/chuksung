---
name: verify
description: chuksung 앱의 변경사항을 실제 브라우저/HTTP로 구동 검증하는 레시피 (인증 세션 발급, dev 서버, Playwright 드라이버)
---

# chuksung 런타임 검증 레시피

## dev 서버

```bash
pnpm dev --port 3101   # 3000은 다른 세션과 충돌 가능 — 3101 사용
curl -s -o /dev/null -w "%{http_code}" http://localhost:3101/login   # 200이면 준비됨
```

## 인증 세션 (OAuth 우회)

앱 로그인은 Google/Kakao OAuth 전용. 검증은 `e2e/auth.setup.ts`와 같은 방식으로
`.env.local`의 `E2E_TEST_USER_EMAIL/PASSWORD`(e2e@example.com 테스트 계정)로
`@supabase/ssr` `createServerClient` + 커스텀 쿠키 스토어 → `signInWithPassword`
→ 발급된 쿠키를 curl `Cookie:` 헤더나 Playwright `ctx.addCookies()`에 주입.

주의: ESM 해석 때문에 스크립트는 **프로젝트 루트**에 임시 파일(`.xxx.tmp.mjs`)로
두고 실행 후 삭제할 것 (scratchpad에서 실행하면 `@supabase/ssr` 못 찾음).

## 브라우저 구동 (GUI 검증)

`@playwright/test`의 chromium을 직접 import해 드라이버 스크립트 작성
(테스트 러너 말고 스크립트로). 브라우저 바이너리는 설치돼 있음.

### 자주 쓰는 셀렉터
- 사이드바 내비: `aside nav a[href="/weekly"]` (Link 전환 후)
- 새 태스크 버튼: `getByRole('button', { name: '새 태스크' })`
- 태스크 폼: `#task-title`, `#task-date`(type=date), 저장 버튼
- 태스크 카드: 완료 토글은 `<input type="checkbox">`(role=checkbox, aria-label
  `완료`/`완료 취소`) — button 아님. 수정/삭제는 aria-label `수정`/`삭제` 버튼.
  카드 컨테이너는 `div.rounded-xl`
- 날짜 이동: `전날`/`다음날` aria-label 버튼
- 타이머 표시: `div.text-7xl` (⚠️ `/\d{2}:\d{2}:\d{2}/` 정규식으로 body를 매칭하면
  **헤더의 현재 시각 시계**가 잡힘 — 반드시 이 셀렉터 사용)
- 타이머 버튼: `시작`/`일시정지`/`재개`/`초기화`("리셋" 아님), 완료 토스트: `타이머 완료! 🎉`

### 함정
- 삭제는 네이티브 `confirm()` — `page.on('dialog', d => d.accept())` 필수
- dev는 React StrictMode: 이펙트 2회 실행으로 포커스/타이밍 동작이 prod와 다를 수 있음
- 검증 중 만든 데이터는 반드시 삭제(테스트 계정이지만 실 DB). goal PUT은 기존 값을
  덮어쓰므로 건드리지 말 것
- 검증용 태스크 제목에 `검증-<타임스탬프>` 마커를 넣으면 정리하기 쉬움

## API 검증 (curl)

발급한 쿠키를 `-H "Cookie: ..."`로 붙여 `http://localhost:3101/api/...` 호출.
401/400/404 매핑과 zod 스트립 동작 검증에 사용.

## 원격 DB 상태 확인 (Docker 없음 주의)

WSL2에 Docker가 없어 `supabase db dump/diff` 불가. 대신 Management API:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/ywwsdezbttlwhiikasjq/database/query" \
  -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
  -d '{"query":"select ... (문자열은 $$...$$ 인용)"}'
```
