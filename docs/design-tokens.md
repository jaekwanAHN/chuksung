# 디자인 토큰과 폼 primitive

`src/components/ui/` 에 폼 컨트롤 primitive 가 없어 모든 입력이 각 파일에서 Tailwind
클래스를 손으로 적고 있었다. 그 결과 `inputClass` 라는 같은 이름의 상수가 세 파일에
서로 다른 값으로 존재했고(#124), 새 화면은 가까운 파일을 베끼며 그 상태를 복제했다.

이 문서는 무엇을 토큰으로 굳혔고 **무엇을 일부러 굳히지 않았는지**, 그리고 그 판정의
근거를 남긴다. 규칙의 원본은 `AGENTS.md` 「하드 룰」·「컨벤션」이고, 근거는 여기다.

## 시맨틱 토큰

`src/app/globals.css` 의 `@theme inline` 에 정의한다. 이름이 "언제 `lg` 고 언제 `xl`
인가" 를 대신 대답하게 하는 것이 목적이다.

| 토큰 | 값 | 유틸리티 | 역할 |
|---|---|---|---|
| `--radius-field` | `0.5rem` | `rounded-field` | 입력·버튼·인라인 수정 행 |
| `--radius-card` | `0.75rem` | `rounded-card` | 카드·패널·편집 표면 |
| `--radius-modal` | `1rem` | `rounded-modal` | 모달·토스트 |
| `--color-border-subtle` | `zinc-200` | `border-border-subtle` | 컨트롤·카드 기본 테두리 |
| `--color-border-muted` | `zinc-100` | `border-border-muted` | 카드 안쪽 구분선·비활성 행 |
| `--color-focus-ring` | `zinc-500` | `outline-focus-ring` | 포커스 표시 |

색 토큰은 값을 직접 쓰지 않고 **`var(--color-zinc-*)` 를 경유한다.** 테마 4종이
`--color-zinc-*` 스케일 자체를 `<html>` 에 주입하므로(`src/lib/themes.ts`), 값을 굳히면
테마 전환에서 토큰만 홀로 남는다. `globals.css:12-21` 의 emerald ↔ `--color-primary-*`
매핑도 같은 이유로 건드리지 않았다 (`docs/color-scheme.md`).

`cn` 은 이 토큰들을 기본 스케일과 같은 그룹으로 알고 있어야 한다 (`src/lib/utils.ts` 의
`extendTailwindMerge`). 알려 주지 않으면 `cn('rounded-field', 'rounded-card')` 가 둘 다
살아남아 CSS 순서로 승자가 정해진다 — 덮어쓰기가 조용히 깨진다. **토큰을 늘릴 때
`utils.ts` 도 함께 늘린다.**

## 소수값 판정 — 무엇을 예외로 남겼나

#124 착수 시점(`3032e1d`) 분포와 판정이다. 분포를 그대로 토큰으로 옮기면 이름만 바뀌고
문제는 남으므로, 다수값을 기본으로 잡고 소수값은 하나씩 판정했다.

| 값 | 건수 | 판정 |
|---|---:|---|
| `rounded-lg` | 29 | 다수값 → `--radius-field` |
| `rounded-xl` | 24 | 카드의 다수값 → `--radius-card` |
| `rounded-full` | 16 | **예외** — pill·아바타. 기하학적 의미가 있어 역할 이름이 필요 없다 |
| `rounded-md` | 12 | 입력 9건은 **표류** → field 로 흡수. Badge·미니 달력 3건은 유지 |
| `rounded-sm` | 7 | **예외** — 히트맵 셀. 3px 사각형이라 역할 토큰과 무관 |
| `rounded-2xl` | 3 | 모달·토스트·로그인 카드 → `--radius-modal` |
| `border-zinc-200` | 47 | 다수값 → `--color-border-subtle` |
| `border-zinc-100` | 12 | **의도** → `--color-border-muted` (안쪽 구분선) |
| `border-zinc-400` | 11 | 9건이 `focus:` → 포커스 토큰이 대체 |
| `border-zinc-300` | 9 | 폼 6건은 **표류** → subtle. 체크박스·점선 빈 상태는 유지 |
| `shadow-inner` | 7 | 폼 6건은 **표류** → 제거. 타이머 큰 숫자 입력 1건은 예외 |

### 간격 토큰은 만들지 않았다

패딩은 컨트롤 **사이즈의 속성**이지 앱 전역의 역할이 아니다. `--spacing-field-x` 를
만들어도 참조자가 primitive 하나뿐이라 집행력은 생기지 않고 간접층만 는다. 대신
`fieldStyles.ts` 의 사이즈 맵이 소유한다.

- `md` (`px-3 py-2`) — 기본
- `sm` (`px-2 py-1`) — 목록 행 안의 인라인 수정처럼 세로 공간이 없는 자리

`TemplateManager`·`DdayManager` 의 인라인 수정 행이 `rounded-md px-2 py-1` 이었던 것은
**반경은 표류, 패딩은 의도**였다. 반경만 field 로 흡수하고 좁은 패딩은 `sm` 으로 남겼다.

### `--color-border-strong` 은 정의하지 않았다

#124 는 `subtle`/`strong` 쌍을 제안했지만, 이관 후 남은 `zinc-300` 은 체크박스 테두리와
점선 빈 상태뿐이라 소비자가 없다. 유일한 후보였던 "강조된 테두리" 는 포커스 표시이고
그건 `--color-focus-ring` 이 이미 담당한다. 쓰이지 않는 토큰은 다음 사람에게 잘못된
선택지를 준다.

## 폼 primitive

`Button.tsx` 의 기존 방식(`base` + 맵 + `cn`)을 그대로 따른다. 새 의존성은 없다.

| 파일 | 역할 |
|---|---|
| `ui/fieldStyles.ts` | 공통 겉모습 + 사이즈 맵. **포커스는 여기서만 정의한다** |
| `ui/Input` `ui/Select` `ui/Textarea` | 네이티브 요소 + `fieldClass` |
| `ui/Field` | 라벨 + 컨트롤 + 에러 슬롯 |

사이즈 prop 은 `fieldSize` 다. `size` 는 `<input>`/`<select>` 의 네이티브 속성이라 쓸 수
없다. props 타입은 `ComponentPropsWithRef` 라 React 19 에서 `ref` 가 그대로 전달된다.

### 포커스 — `outline-none` 단독 사용 금지

이관 전 앱에는 포커스 표시가 **세 종류**였다. 브라우저 기본 링(`TaskForm`), 테두리
색만 바꾸기(`TemplateManager`·`DdayManager`·`DayStartTimeModal`·`goal`), 그리고
`focus:ring-2`(`goal`·타이머). 가운데 것은 `outline-none` 으로 기본 링까지 지운 뒤
`focus:border-zinc-400` 으로 대체하는데, 대비 2.5:1 이라 평상시와 거의 구분되지 않았다.

지금은 한 곳에서만 정의한다.

```
focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring
```

`zinc-500` 은 `docs/a11y.md` 의 "새로 쓰지 않는다" 대상이지만 그 규칙은 **텍스트** 대비
4.5:1 을 지키기 위한 것이다. 포커스 표시는 비텍스트라 요구치가 3:1(WCAG 1.4.11)이고,
최악 테마에서도 4.6:1 이라 여유가 있다. `focus-visible` 을 쓰므로 마우스 클릭에는 뜨지
않는다.

예외는 `Modal.tsx` 의 패널 하나다. `tabIndex={-1}` 로 열릴 때 프로그램적으로만 포커스를
받는 컨테이너라 링을 띄우면 오히려 잡음이 된다.

### 라벨 연결

`Field` 는 `<label>` 이 컨트롤을 **감싸** 암시적으로 연결한다. `id`/`htmlFor` 를 맞출
필요가 없고, 빠뜨려서 접근 이름이 사라지는 사고(#103)도 구조적으로 막힌다. E2E 가
`getByLabel('제목'/'카테고리'/'상태'/'마감일')` 로 잡으므로 **이 연결을 끊지 말 것.**

`Field` 의 `required` 는 라벨에 `*` 를 그리는 시각 표시 전용이다. 브라우저 검증까지
걸려면 컨트롤에도 네이티브 `required` 를 따로 붙인다 — `TaskForm` 은 붙였고
`JobPostingModal` 은 저장 버튼을 비활성화하는 쪽이라 붙이지 않았다. 하나만 넣고
넘어가지 않도록 둘의 관계를 여기 적어 둔다.

시각 라벨을 둘 자리가 없거나 두면 같은 이름이 중복되는 컨트롤은 `Field` 대신
`aria-label` 로 이름만 준다 (#122). 현재 그런 곳은 셀렉트 6개다.

- `TaskFilters` — 왼쪽 모드 버튼이 이미 `전체`/`카테고리`/`우선순위` 를 보여준다.
  같은 이름을 셀렉트에 다시 주면 화면에 이름이 둘씩 생기므로 `카테고리 필터` /
  `우선순위 필터` 로 구분한다
- `TemplateManager` 추가 폼 — 제목·설명이 placeholder 만 쓰는 컴팩트한 구성이라
  셀렉트에만 시각 라벨을 붙이면 어긋난다 (`카테고리` / `우선순위`)
- `TemplateManager` 수정 행 — 인라인 편집이라 자리가 없고, **추가 폼과 같은 페이지에
  동시에 존재**한다. 이름이 겹치지 않게 `카테고리 수정` / `우선순위 수정` 을 쓴다
  (편집 행은 한 번에 하나뿐이라 행끼리는 겹치지 않는다)

시각 라벨을 둘 자리가 있으면 `aria-label` 로 늘리지 말고 `Field` 를 쓴다 — 눈으로
보는 사용자에게도 이름이 필요하다.

`id` 는 접근성 때문이 아니라 테스트가 잡고 있어서 남긴 것만 있다 — `#task-title`,
`#task-date`(`.claude/skills/verify`), `#day-start-time`(`e2e/template.spec.ts`).

`ui/Select` 는 네이티브 `<select>` 를 유지한다. E2E 4개 스펙이 `selectOption()` 으로
조작하므로 리스트박스로 바꾸면 그 상호작용을 함께 다시 써야 한다. 다만 로케이터는
#127 에서 `getByRole('combobox')` 로 옮겨 `page.locator('select')` 유일성에 기대는
곳은 없다 (`e2e/README.md` 「로케이터 원칙」). 구현체를 무엇으로 할지는 #119·#120
에서 판단한다.

## lint 집행 (#125)

`eslint.config.mjs`가 `scripts/eslint/style-rules.mjs`의 두 룰을 `error`로 적용한다.
대상은 `src/**/*.ts(x)`이며, 원시 요소와 스타일을 정의하는 `src/components/ui/**`만
두 룰에서 제외한다. 다른 lint 규칙은 이 경로에도 계속 적용된다.

- `no-raw-style-utilities`: `className`과 이름이 `cn`인 호출의 문자열 리터럴,
  조건식의 결과 분기, 논리식, 배열·객체 키, 템플릿의 완성된 정적 클래스를 검사한다.
  `rounded-md/lg/xl/2xl`, `border-zinc-*`, 대체 표시 없는 `outline-none`이 대상이다.
  상태·반응형·임의 variant, important 표시, 색상 투명도가 붙어도 검사한다.
  `rounded-full`과 `rounded-sm`은 기하학적 값으로 허용하며 사용 목적까지 추론하지 않는다.
- `no-raw-form-control`: raw `input/select/textarea`를 검사한다. `input`의 최종 `type`이
  문자열 리터럴로 checkbox/radio임을 확인할 수 있을 때만 허용한다. 뒤의 spread가
  `type`을 덮을 수 있거나 동적 값이면 허용하지 않는다. 공용 `Input/Select/Textarea`를 쓴다.

포커스 대체는 같은 표현식에서 함께 적용되는 `focus:outline-2` +
`focus:outline-focus-ring` 또는 `focus-visible:` 쌍으로 확인한다. 조건부 클래스는
다른 분기의 포커스 제거를 정당화하지 못한다. variant가 붙은 `outline-none`은 같은
variant의 대체 표시를 요구한다. 이 검사는 구문상 표시 유무를 확인할 뿐 실제 색 대비나
CSS 우선순위를 증명하지 않는다. 폼에서는 직접 조합보다 공용 primitive를 사용한다.

문자열 변수의 값 추적, 다른 파일·함수의 반환값, 동적 클래스 조립, `cn`의 별칭은 분석하지
않는다. 클래스 상수도 선언 시 `cn('...')`으로 감싸 검사 대상에 둔다(`LoginButton` 참고).
조건 비교 문자열·객체 값·일반 메시지는 클래스가 아니므로 검사하지 않는다. 정적 분석의
범위를 넓히기 위해 모든 문자열을 검사하면 이런 값에 오탐이 생긴다.

### 국소 예외

소수값을 전역 허용하면 일반 폼·카드에서도 재사용되므로 다음 다섯 곳만
`eslint-disable-next-line chuksung/no-raw-style-utilities`와 이 문서 포인터를 둔다.
파일 전체를 제외하지 않으며, 같은 파일의 다른 위반은 계속 실패한다.

| 위치 | 값 | 유지 근거 |
|---|---|---|
| `MonthMiniCalendar` | `rounded-md` | 위 소수값 판정에서 유지한 미니 달력 셀 |
| `TaskCard` | `border-zinc-300` | primitive 대상이 아닌 네이티브 체크박스 |
| `TaskForm` | `border-zinc-400` | primitive 대상이 아닌 네이티브 라디오 |
| `goal/page` | `border-zinc-300` | 점선 빈 상태의 경계 |
| `timer/page` | `hover:border-zinc-300` | 기존 숫자 입력의 hover 피드백, 포커스는 Input이 소유 |

나머지 반경·테두리는 기존 값과 동일한 토큰으로 치환했다. `rounded-md` 예외를
`rounded-field`로 강제하지 않으므로 달력의 반경도 바뀌지 않는다. 추가 강한 테두리
토큰이나 앱 동작 변경은 필요하지 않다.

### 승인 범위와 검증 기록

사용자의 “기다리는 동안 #125 진행해줘” 요청으로 앞서 제시한 계획의 구현·검증·커밋·
푸시·PR 생성 범위를 승인받았다. 작업 브랜치는 `chore/enforce-style-tokens`, 기준은
`7173384`다. #178의 작업 시작 전 main 최신화 변경은 이미 별도 병합되었다.

초기 warn 검사에서 66건을 확인했다. 위 다섯 예외를 명시하고 나머지를 이관한 뒤
warn 0건을 확인해 error로 승격했다. 문자열 상수였던 로그인 버튼도 토큰화하고
`cn()`으로 감쌌다. raw 폼 요소 세 곳은 모두 checkbox/radio여서 그대로 통과한다.

검증 명령은 `git diff --check`, `node --test scripts/eslint/style-rules.test.mjs`,
`pnpm lint`, `pnpm build`다. 룰 테스트는 실제 ESLint 설정의 error 수준·primitive 제외,
금지 클래스와 폼 요소, 조건부 포커스, variant·템플릿·객체 클래스, 국소 예외를 확인한다.
앱 변경은 같은 값의 클래스 치환과 lint 예외 표시뿐이어서 로컬 E2E·성능 측정은
선택하지 않았다. 전체 E2E는 PR의 기존 CI에서 실행한다.

결과: diff 검사·룰 테스트·lint·build 모두 통과했다. 개별 결과를 출력하는
`node scripts/eslint/style-rules.test.mjs`로도 58개 테스트 통과를 확인했다.
첫 build는 샌드박스의 Google Fonts 연결 실패로 중단됐고, 네트워크 권한으로 재실행한
build에서 컴파일·타입 검사·21개 페이지 생성까지 통과했다. 워크트리와 기본 체크아웃의
중복 lockfile에 대한 기존 Next.js 루트 추론 경고는 남아 있다.

## 남은 일

- **시각 회귀 스냅샷.** Playwright 가 이미 있어 `toHaveScreenshot()` 비용은 낮지만,
  이번 스윕 이후 상태를 기준선으로 삼는 후속 작업이다
