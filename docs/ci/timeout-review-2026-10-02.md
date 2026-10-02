# CI 시간 상한 재평가 기록

## 범위와 승인

- 이슈: [#131](https://github.com/jaekwanAHN/chuksung/issues/131).
- 기준 커밋: `dc546afe1cc778916232057a76e7521743555d42`.
- 2026-10-02 사용자가 현 상한 유지 권고, 기록 집계·문서화·검증·커밋·푸시·PR 생성
  계획을 승인했다. 브랜치는 `docs/ci-timeout-review`다.
- 대상은 설치 스텝 20분, E2E job 30분, lint/build job 10분의 적정성이다.
  apt·캐시 구현, 직렬화, 액션 버전은 변경하지 않았다.

## 수집 방법

GitHub REST API를 읽기 전용으로 조회했다. 워크플로 실행 목록은
`repos/jaekwanAHN/chuksung/actions/workflows/ci.yml/runs?per_page=100&created=%3E%3D2026-08-20`
에서 68건을 반환했고 `total_count`도 68이었다. PR #132 병합 커밋 `89a42a3`의
시각인 `2026-08-20T03:58:38Z` 이후 생성된 67건을 선택했다. 병합 전 실행 1건은
제외했으며 조회 시점의 마지막 실행은 9월 22일이었다.

각 run의 `/actions/runs/{run_id}/jobs?filter=all&per_page=100`에서 job과 스텝의
시작/종료 시각·결론을 수집했다. 반환 job 수와 `total_count`가 같은지 확인했고
모든 run의 `run_attempt`는 1이었다. 초 단위 종료 시각에서 시작 시각을 빼며,
run 생성 시각부터의 대기 시간은 소요 시간에 넣지 않았다. 중앙값은 정렬한 표본의
중앙 값(짝수 표본은 중앙 두 값의 평균)이다.

E2E를 실행한 37건은 `/actions/runs/{run_id}/logs` ZIP도 조회했다. 이 환경의
`gh run view --log`는 빈 출력을 반환했으므로 이를 로그 부재로 해석하지 않고
REST ZIP의 E2E job 로그를 사용했다. 37건 모두 읽을 수 있었다.

- 적중: `Cache hit for: playwright-...`.
- 미적중: `Cache not found for input keys: playwright-...`.
- 메시지가 없거나 모순되면 판별 불가로 분류한다. 이번 표본에는 없었다.
- `node-cache-...` 키와 저장 단계의 메시지는 판정에서 제외했다.

[실행별 CSV](2026-10-02-timeouts.csv)에 run URL·커밋·시각·소요 시간·캐시 판정과
해당 로그 줄을 보관했다. 전체 로그나 인증 정보는 저장하지 않았다.
`not-run`은 E2E가 skipped인 경우이며 판별 불가와 다르다.
설치 스텝은 37건 모두 성공했다. E2E 실패 2건의 job 시간도 CSV에 남기되
성공 job 분포에는 포함하지 않는다.

## 원본 교차 확인 지점

- [설치 최대 44초](https://github.com/jaekwanAHN/chuksung/actions/runs/35051665714).
- [E2E 성공 최대 315초](https://github.com/jaekwanAHN/chuksung/actions/runs/35101559748).
- [lint/build 최대 60초](https://github.com/jaekwanAHN/chuksung/actions/runs/32848321875).
- E2E 실패: [35098721744](https://github.com/jaekwanAHN/chuksung/actions/runs/35098721744),
  [34985102051](https://github.com/jaekwanAHN/chuksung/actions/runs/34985102051).
  둘 다 실패 스텝은 `Run E2E tests`이며 설치는 성공했다.

판정과 표본별 분포의 원본 설명은 [E2E 가이드](../../e2e/README.md#ci-시간-상한)에 둔다.
전체 CI 성공 65건과 개별 job·스텝 성공 표본 수는 서로 다른 집계다.

## 검증

- CSV 67행을 수집한 API 응답과 대조하고 시각 차이·표본 수·중앙값·최대값을
  Python assertion으로 재계산했다. 모두 일치했다.
- 캐시 판정을 추출 로그 줄과 대조하고 적중/미적중별 분포를 다시 계산했다. 통과했다.
- 실제 workflow의 상한 600/1800/1200초와 비교했다. 성공 설치·job 모두 상한
  미만이며 잘리는 사례가 0건임을 확인했다.
- `git diff --check`와 문서 상대 경로 검사를 통과했다.
- 앱·스크립트·CI 설정 변경이 없어 lint/build·unit·E2E는 실행하지 않았다.
