# 라이트 전용 선언

이 앱은 다크 테마를 지원하지 않는다. 그 사실을 **`src/app/globals.css` 의 `:root`
한 곳에만** 적는다.

```css
:root {
  color-scheme: light;
}
```

## 왜 한 줄이면 되나

`color-scheme` 은 **상속 속성**이다. 루트에 선언하면 문서 전체가 물려받으므로,
네이티브 폼 컨트롤(체크박스·`<select>`·`date`/`time` 입력)이 OS 다크 설정을 따라
반전되는 일이 전부 사라진다. 요소마다 붙일 필요가 없다.

이 구조는 **그 상속에 기대고 있다.** 저 한 줄을 지우면 빌드도 테스트도 통과하고,
라이트 모드로 개발하는 동안에는 아무 증상이 없다. 다크 모드 사용자에게만 컨트롤이
반전돼 보인다.

## 그전에는 요소마다 붙이고 있었다

2026-08-19 이전에는 `[color-scheme:light]` 가 5개 파일 12곳에 복제돼 있었다
(`TemplateManager` 5, `TaskForm` 3, `TaskFilters` 2, `Modal` 1, `DayStartTimeModal` 1).

문제는 복제 자체가 아니라 **빠뜨려도 드러나지 않는다**는 점이었다. 실제로
`TaskCard` 의 완료 체크박스에는 붙어 있지 않았고, 일간 목록에서 다크 모드로 재면
체크박스 30개가 `color-scheme: normal` 로 나왔다. 루트 선언 하나가 이 실패 모드를
없앤다 — 새 컨트롤을 추가할 때 아무것도 기억하지 않아도 된다.

## `<meta name="color-scheme">` 는 넣지 않았다

`viewport.colorScheme`(→ `<meta name="color-scheme" content="light">`)은 "첫 페인트
전 캔버스가 검게 보인다"는 #109 의 원 보고를 고치려던 수단이었다. 측정 결과
**그 검정은 앱의 문서가 칠하는 것이 아니었고**, meta 를 응답 HTML 의 `<head>` 맨
앞에 주입해도 관측이 달라지지 않았다.

- 이미 그려진 페이지에서 이동하거나 하드 리프레시하면 검정이 한 프레임도 없다.
  Chromium 이 첫 페인트까지 이전 프레임을 붙든다(paint holding) — 커밋 484ms →
  첫 페인트 1,486ms 로 1초의 창이 있었는데도 그랬다
- 새 탭에서 진입할 때만 검정이 보이는데, 그 프레임은 **커밋 이전**이다. 같은
  시나리오를 라이트로 돌리면 그 자리가 흰색이다 — 브라우저의 빈 탭 색이다

측정 전문은 [#109 코멘트](https://github.com/jaekwanAHN/chuksung/issues/109#issuecomment-5337335479).
넣어도 해가 없지만 **아무것도 하지 않는 선언**이라 두지 않았다. 다시 검토한다면
위 측정부터 뒤집어야 한다.

## `prefers-color-scheme: dark` 블록을 지운 이유

create-next-app 기본값이 `globals.css` 에 남아 있었다.

```css
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
```

`--background` 는 #79 이후 루트 레이아웃이 `<html style>` 로 덮으므로 쓰이지 않았고
(`docs/hydration.md` 사례 2), `--foreground` 는 이를 재정의하는 테마가 하나도 없어
다크 모드에서 `body { color: #ededed }` 가 그대로 적용됐다. 배경은 `#fafafa` 라
대비가 약 1.04:1 이다.

당장 깨진 화면은 없었다 — 로그인과 대시보드 7개 페이지를 전수 조사했을 때 그 색을
상속받아 텍스트를 그리는 요소가 0개였다. 모든 컴포넌트가 `text-zinc-*` 를 명시하고
있기 때문이다. **그래서 지운 것이다**: 무해한 채로 남아 있다가, `text-zinc-*` 를
쓰지 않은 요소가 하나 추가되는 순간 밝은 배경에 밝은 글자가 된다.

## 회귀 방지

`e2e/theme.spec.ts` 의 **"문서와 모든 폼 컨트롤이 라이트로 고정된다"** 가 다크 모드를
강제한 컨텍스트에서 세 가지를 함께 본다.

| 단언 | 지키는 것 |
|---|---|
| `documentElement` 의 `color-scheme === 'light'` | 루트 선언 자체 |
| `body` 의 색이 `rgb(23, 23, 23)` | 다크 블록이 되살아나지 않음 |
| 보이는 `input`·`select`·`textarea` 전부가 `light` | 상속이 실제로 닿음 |

세 번째가 핵심이다. 요소별 클래스로 돌아가는 변경은 첫 단언만으로는 잡히지 않는다.
**다크를 강제하지 않으면 이 테스트는 아무것도 잡지 못한다** — 라이트 컨텍스트에서는
선언이 없어도 전부 라이트로 나온다.
