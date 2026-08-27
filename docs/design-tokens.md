# 디자인 토큰과 폼 primitive

`src/components/ui/` 에 폼 컨트롤 primitive 가 없어 모든 입력이 각 파일에서 Tailwind
클래스를 손으로 적고 있었다. 그 결과 `inputClass` 라는 같은 이름의 상수가 세 파일에
서로 다른 값으로 존재했고(#124), 새 화면은 가까운 파일을 베끼며 그 상태를 복제했다.

이 문서는 무엇을 토큰으로 굳혔고 **무엇을 일부러 굳히지 않았는지**, 그리고 그 판정의
근거를 남긴다. 규칙 자체의 요약은 `AGENTS.md` 「컨벤션」에 한 줄로만 있고, 근거는 여기다.

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

`id` 는 접근성 때문이 아니라 테스트가 잡고 있어서 남긴 것만 있다 — `#task-title`,
`#task-date`(`.claude/skills/verify`), `#day-start-time`(`e2e/template.spec.ts`).

`ui/Select` 는 네이티브 `<select>` 를 유지한다. E2E 4개 스펙이 `selectOption()` 으로
조작하고 `page.locator('select')` 유일성에 기대는 곳이 있어, 리스트박스로 바꾸면 함께
다시 써야 한다. 구현체를 무엇으로 할지는 #119·#120 에서 판단한다.

## 남은 일

- **lint 집행 (#125).** 토큰이 있어도 강제되지 않으면 다시 표류한다. `rounded-lg` 같은
  원시 유틸리티를 폼·카드 자리에서 막는 룰이 붙어야 이 문서가 규칙이 된다
- **카드·모달 반경 스윕.** `--radius-card` 는 이번에 손댄 파일에만 적용했다. 남은
  `rounded-xl` 20여 곳은 순수한 클래스 치환이라 #125 와 함께 하는 편이 안전하다
- **시각 회귀 스냅샷.** Playwright 가 이미 있어 `toHaveScreenshot()` 비용은 낮지만,
  기준선은 위 스윕이 끝난 뒤에 떠야 의미가 있다
