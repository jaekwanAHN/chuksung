# 성능 측정

성능 숫자는 실행 환경과 분리해서 읽을 수 없다. 이 저장소는 서로 다른 두 축을 **별도
원장**에 기록한다. 두 값을 한 델타로 합치지 않는다.

| | `pnpm perf` → `history.md` | `pnpm perf:deploy` → `deploy-latency.md` |
|---|---|---|
| 환경 | 로컬 Next.js production-mode 빌드 + 로컬 Chromium + 호스팅된 Supabase | 배포된 production URL |
| 지표 | Lighthouse 렌더링 지표, 페이지당 5회 | HTTP TTFB, 경로당 7회 |
| 보는 것 | 번들·하이드레이션·레이아웃 | 리전·리다이렉트·서버 응답 |
| 비교 조건 | 최종 URL·runtime error·계정·데이터·도구/실행 환경 | 상태·Location·배포 SHA·리전·대조군 |

로컬 앱만 로컬이다. DB는 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`이 가리키는 원격
Supabase다. 반대로 배포 TTFB는 브라우저 렌더링 지표를 보지 않는다. 그래서 둘 다
필요하지만 **서로의 기준선은 될 수 없다**.

## 로컬 Lighthouse

```bash
pnpm perf                         # 전체 대시보드 페이지, 5회
pnpm perf --page /daily           # 특정 페이지
pnpm perf --page /daily,/weekly   # 여러 페이지
pnpm perf --runs 3                # 진단용 실행 횟수 조정
pnpm perf --no-build --port 3101  # 이미 뜬 서버 진단 — 원장에는 기록하지 않음
pnpm perf:diagnose /jobs          # 원본 LHR과 상세 audit을 임시 디렉토리에 저장
```

기록 경로는 항상 `pnpm build`와 `pnpm start`로 현재 체크아웃을 직접 띄운다. 인증 쿠키는
Lighthouse가 붙는 Playwright 브라우저 저장소에 넣고 저장소 초기화를 끈다. 그래야 서버의
토큰 회전이 다음 run에도 이어진다. 각 run은 다음 조건을 모두 통과해야 한다.

- `lhr.runtimeError`가 없다
- `lhr.finalDisplayedUrl`이 요청 URL과 정확히 같다
- 모든 run의 요청·최종 URL과 지표가 스냅샷에 남는다

하나라도 실패하면 명령 전체가 실패하고 원장과 스냅샷을 쓰지 않는다. `--no-build`는
어느 체크아웃이 서버를 띄웠는지 증명할 수 없으므로 진단 결과만 출력한다.

각 페이지는 Perf 점수로 정렬한 아래쪽 중앙 run을 표의 대표값으로 사용한다. 개별 run은
JSON에 함께 남아 분산과 대상 URL을 다시 확인할 수 있다.

활성 원장의 시각은 실행 위치와 무관하게 UTC로 표기한다.

## 배포 TTFB

```bash
pnpm perf:deploy                 # 등록된 전체 경로
pnpm perf:deploy --path /daily   # 특정 경로
pnpm perf:deploy --dry-run       # 측정만 하고 기록하지 않음
```

첫 요청은 별도로 기록하고 나머지 요청의 median을 대표값으로 쓴다. 첫 요청이 실제
서버리스 cold start였다는 보장은 없으므로 `cold`라고 부르지 않는다.

인증 응답의 `Set-Cookie`를 다음 요청에 반영하며, 모든 sample의 기대 상태와 리다이렉트
Location을 확인한다. 배포 SHA나 프록시 리전을 관측하지 못하거나 측정 중 값이 바뀌면
원장에 기록하지 않는다. 진입 엣지와 정적 자산 대조군이 흔들리거나 측정 runner가
달라진 회차는 델타를 만들지 않는다.

`/login (비인증)`과 `/login (인증)`은 의도된 측정 대상이다. 각각 페이지 함수와 인증
프록시 리다이렉트 비용을 격리한다. 대시보드 경로를 요청했는데 로그인 화면으로 이동한
로컬 Lighthouse 오측정과는 다르다.

## 지표

로컬 Lighthouse는 모바일 폼팩터와 simulated throttling을 사용한다.

| 지표 | 의미 | 프로젝트 기준 |
|---|---|---:|
| Perf | Lighthouse 성능 종합 점수 | ≥ 90 |
| A11y | 자동 접근성 audit 점수 | ≥ 95 |
| SEO | 검색 노출 기본 audit 점수 | ≥ 95 |
| LCP | 가장 큰 콘텐츠가 뜨는 시점 | < 2.5s |
| TBT | 메인스레드 blocking 총합 | < 200ms |
| CLS | 레이아웃 밀림 | < 0.1 |
| FCP | 첫 콘텐츠가 뜨는 시점 | < 1.8s |
| SI | 화면이 시각적으로 채워지는 속도 | < 3.4s |

A11y 100은 자동 audit 통과일 뿐이다. 키보드 이동·포커스 순서·스크린리더 흐름은 별도
검증 영역이다. 실사용 INP도 lab 측정이 아니라 필드 데이터가 필요하다.

## 비교 계약과 산출물

비교 가능성의 단일 기준은 `measurement-contract.md`다. 요약하면 같은 계정·데이터·
설정·실행 환경이어야 하며, 숫자 델타가 성공 기준인 작업에서만 전후 측정한다.

- `history.md`: 신뢰 조건을 통과한 로컬 측정만 있는 활성 원장
- `deploy-latency.md`: 신뢰 조건을 통과한 배포 TTFB 활성 원장
- `snapshots/`: 다음 비교에 사용하는 schema v2 JSON. **원장과 함께 커밋한다**
- `archive/`: 현재 비교기에서 제외된 legacy·오측정 자료
- `incidents/`: 오염 원인과 재발 방지 결정

과거 기록의 분류는 `archive/README.md`에 있다. 데이터 볼륨 오염과 로그인 화면
오측정의 교훈은 각각 `incidents/data-volume-contamination.md`,
`incidents/login-page-mismeasurement.md`에 남긴다.

## 계정과 데이터

두 명령 모두 `PERF_TEST_USER_EMAIL/PASSWORD` 전용 계정만 사용한다. E2E 계정으로
폴백하지 않는다. 로컬 원장은 측정마다 데이터 행 수를 기록하며, 직전 회차와 볼륨이
다르거나 읽을 수 없으면 델타 없이 새 기준선으로 취급한다. 계정 생성과 복제 규칙은
`accounts.md`에 있다.
