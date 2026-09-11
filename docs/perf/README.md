# 성능 측정

성능 숫자는 실행 환경과 분리해서 읽을 수 없다. 이 저장소는 서로 다른 세 «계보»를
**별도 원장**에 기록한다. 서로의 값을 한 델타로 합치지 않는다.

| | `pnpm perf` → `history.md` | `pnpm perf --url <origin>` → `deploy-lighthouse.md` | `pnpm perf:deploy` → `deploy-latency.md` |
|---|---|---|---|
| 환경 | 로컬 production 빌드 + 로컬 Chromium + 호스팅된 Supabase | 배포된 production URL + 로컬 Chromium | 배포된 production URL |
| 지표 | Lighthouse 렌더링 지표, 페이지당 5회 | Lighthouse 렌더링 지표, 페이지당 5회 (워밍 후) | HTTP TTFB, 경로당 7회 |
| 보는 것 | 번들·하이드레이션·레이아웃 | CDN 전달·엣지↔함수 경로가 얹힌 렌더링 | 리전·리다이렉트·서버 응답 |
| 비교 조건 | 최종 URL·runtime error·계정·데이터·도구/실행 환경 | 왼쪽 + origin·배포 SHA·워밍 | 상태·Location·배포 SHA·리전·대조군 |

로컬 앱만 로컬이다. DB는 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`이 가리키는 원격
Supabase다. 반대로 배포 TTFB는 브라우저 렌더링 지표를 보지 않는다. 그래서 셋 다
필요하지만 **서로의 기준선은 될 수 없다**.

### 두 계보를 한 표에서 비교하지 않는다

로컬과 배포는 같은 Lighthouse로 같은 지표를 재지만, 절대값을 나란히 놓고 델타를 찍으면
안 된다. 차이를 만드는 것이 코드가 아니기 때문이다.

- **throttling이 겹친다.** Lighthouse의 simulated throttling은 관측한 네트워크 위에
  시뮬레이션을 얹는다. 로컬은 실제 지연이 0에 가까워 순수 시뮬레이션이지만, 배포는
  실제 왕복 지연 위에 같은 시뮬레이션이 더해진다. 같은 이름의 조건이 같은 조건이 아니다.
- **재는 대상이 다르다.** 배포 쪽에만 CDN 전달·엣지↔함수 경로가 크리티컬 패스에 들어
  있다. 로컬에서 이 구간은 0이다.
- **회선이 변수로 들어온다.** 배포 회차 간 차이에는 그날의 회선 상태가 섞인다.

그래서 배포 원장은 **자기 계보 안의 세로 비교**에만 쓴다. 두 계보를 나란히 읽어 «배포에서
얼마가 더 드는가»를 추정할 수는 있지만, 그 추정값에 회귀 경보를 걸지 않는다.

계보 분리는 문서 규약이 아니라 코드가 집행한다. 스냅샷 디렉터리와 원장 파일이 갈리고
(`ledger.mjs`의 `LINEAGES`), 같은 계보 안에서도 origin이 다르면 델타를 만들지 않는다.

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
- 모든 run의 요청·최종 URL·지표·적용 audit 가중치(W)가 스냅샷에 남는다

하나라도 실패하면 명령 전체가 실패하고 원장과 스냅샷을 쓰지 않는다. `--no-build`는
어느 체크아웃이 서버를 띄웠는지 증명할 수 없으므로 진단 결과만 출력한다.

각 페이지는 Perf 점수로 정렬한 아래쪽 중앙 run을 표의 대표값으로 사용한다. 개별 run은
JSON에 함께 남아 분산과 대상 URL을 다시 확인할 수 있다.

활성 원장의 시각은 실행 위치와 무관하게 UTC로 표기한다.

## 배포 Lighthouse

```bash
pnpm perf --url https://chuksung.vercel.app              # 전체 페이지
pnpm perf --url https://chuksung.vercel.app --page /daily
```

로컬 Lighthouse와 같은 하네스·같은 신뢰 조건을 쓰되 `build`/`start`를 건너뛰고 주어진
origin을 잰다. `--url`은 `--port`·`--no-build`와 함께 쓸 수 없다 — 무엇을 쟀는지가 원장에
잘못 적히기 때문이다.

### 워밍 후 측정한다 (콜드스타트는 이 원장의 축이 아니다)

측정 전 각 페이지를 인증 상태로 한 번 방문한 뒤 5회 run을 시작한다. 한 번의 워밍이 두
오염을 함께 없앤다.

- **콜드스타트가 run 1에만 얹히는 것.** 대표값은 Perf 점수의 median run이므로, 한 run만
  느리면 median «선택» 자체가 흔들린다. 5회 median은 이 혼입을 눌러 주지 못한다.
- **`/daily` 첫 로드의 템플릿 시딩.** 페이지가 `client_now`를 붙여
  `GET /api/tasks?scope=daily`를 부르고 서버 시간 게이트를 통과하면 `seed_daily_templates`가
  돈다. RPC는 `(template_id, applied_date)` 기준으로 멱등이라 행이 불어나지는 않지만,
  그날 첫 로드가 run 1에서 나오면 run 1과 run 2~5가 서로 다른 데이터 상태를 본다.

그래서 이 원장이 재는 것은 **warm 상태의 렌더링**이다. 콜드스타트를 `cold`라고 이름 붙여
기록하지 않는다 — 배포 TTFB가 첫 요청을 `cold`라 부르지 않는 것과 같은 이유로, 외부에서
서버리스 cold를 증명할 수 없다. 콜드스타트 영향은 이 하네스의 범위 밖이다.

### 측정 조건

측정 전후로 `/login`(비인증)의 응답 헤더에서 배포 커밋(`x-deploy-sha`)·프록시 리전
(`x-proxy-region`)·진입 엣지(`x-vercel-id`)를 읽는다. 관측하지 못하거나 측정 중 배포
커밋이 바뀌면 원장에 쓰지 않는다. 데이터 볼륨은 로컬 계보와 같은 방식으로 남긴다.

`--url` 측정은 프로덕션 DB의 perf 전용 계정에 그날치 시딩을 유발한다. 로컬 `/daily`
측정도 같은 계정에 같은 일을 하므로 새로운 부작용은 아니지만, 볼륨 기록이 이후 비교의
조건으로 남는다.

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

### 적용 audit 가중치(W)

Lighthouse는 페이지에 해당 요소가 없는 audit(notApplicable)과 informative·manual audit의
가중치를 0으로 만든 뒤 나머지를 가중평균한다. 즉 **남은 가중치 합(W)이 그 점수의
분모**다. 페이지 구조가 달라지면 W가 변하고, W가 다른 두 회차의 점수는 같은 저울로 잰
값이 아니다.

스냅샷은 run마다 `weights`를 `performance`·`accessibility`·`seo` 별로 남긴다. 원장은 같은
페이지의 W가 직전 회차와 다르면 **그 카테고리 열만** 값만 남기고 델타를 만들지 않으며,
이유를 표 아래에 적는다. 데이터 볼륨과 같은 계열의 «비교 조건» 기록이다.

한쪽 회차에 W가 없으면(2026-08-25 이전 스냅샷) 이 검사는 건너뛴다. 없는 값으로 기존
기준선을 무효화하지 않기 위해서다.

SEO 카테고리에는 순환소수 가중치를 가진 audit이 있어 합이 부동소수로 흔들린다. W는
소수점 3자리로 반올림해 기록한다. audit 하나의 최소 가중치가 1이므로 이 반올림이 서로
다른 audit 집합을 같은 값으로 만들지 않는다.

## 비교 계약과 산출물

비교 가능성의 단일 기준은 `measurement-contract.md`다. 요약하면 같은 계정·데이터·
설정·실행 환경이어야 하며, 숫자 델타가 성공 기준인 작업에서만 전후 측정한다.

- `history.md`: 신뢰 조건을 통과한 로컬 측정만 있는 활성 원장
- `deploy-lighthouse.md`: 신뢰 조건을 통과한 배포 Lighthouse 활성 원장
- `deploy-latency.md`: 신뢰 조건을 통과한 배포 TTFB 활성 원장
- `snapshots/`: 다음 비교에 사용하는 schema v2 JSON. **원장과 함께 커밋한다**.
  계보마다 하위 디렉터리가 갈린다 (`deploy-lighthouse/`, `deploy/`)
- `archive/`: 현재 비교기에서 제외된 legacy·오측정 자료
- `incidents/`: 오염 원인과 재발 방지 결정

과거 기록의 분류는 `archive/README.md`에 있다. 데이터 볼륨 오염과 로그인 화면
오측정의 교훈은 각각 `incidents/data-volume-contamination.md`,
`incidents/login-page-mismeasurement.md`에 남긴다.

## 계정과 데이터

세 명령 모두 `PERF_TEST_USER_EMAIL/PASSWORD` 전용 계정만 사용한다. E2E 계정으로
폴백하지 않는다. 로컬 원장은 측정마다 데이터 행 수를 기록하며, 직전 회차와 볼륨이
다르거나 읽을 수 없으면 델타 없이 새 기준선으로 취급한다. 계정 생성과 복제 규칙은
`accounts.md`에 있다.
