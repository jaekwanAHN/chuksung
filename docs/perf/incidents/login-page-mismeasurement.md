# 대시보드 대신 로그인 화면을 측정한 사건 (#145)

## 영향

2026-08-20 05:15 로컬 Lighthouse 회차는 `/daily` 등 8개 경로를 요청했지만 로그인
화면을 측정했다. Perf 97·A11y 93·SEO 100·LCP 2.41~2.42초가 모든 페이지에서
반복된 것이 지문이다. 원문과 JSON은 `../archive/`에 보관한다.

이 회차는 활성 기준선이 아니며 알려진 오측정이다. 2026-07-21~08-05 자료는 같은
오측정이라고 단정하지 않지만 최종 URL과 현재 메타데이터가 없어 legacy로 함께 격리했다.

## 원인

하네스가 Supabase 쿠키를 Lighthouse `extraHeaders.Cookie`의 고정 문자열로 보냈다.
서버가 세션을 갱신해 새 쿠키를 내려도 다음 요청이 옛 refresh token을 다시 덮어썼고,
API 401 뒤 앱이 `/login?session=invalid`로 이동했다. 하네스는 `finalDisplayedUrl`과
`runtimeError`를 확인하지 않아 이 결과를 정상 숫자로 저장했다.

## 재발 방지

- Lighthouse가 쓰는 Playwright 브라우저 저장소에 쿠키를 주입
- 모든 run의 최종 URL과 runtime error를 기록 전에 검증
- 개별 run과 최종 URL을 schema v2 JSON에 보존
- legacy·`valid: false` 스냅샷을 비교기에서 자동 제외
- 코드 신원을 모르는 `--no-build` 실행은 원장에 기록하지 않음

배포 측정도 같은 인증 도우미를 쓰므로 `Set-Cookie` 회전을 반영하고, 기대 상태와
리다이렉트 Location을 모든 sample에서 검사한다.
