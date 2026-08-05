# 하이드레이션 불일치

서버가 보낸 HTML 과 클라이언트의 **첫 렌더**가 다르면 React 는 그 서브트리를 버리고
클라이언트에서 통째로 다시 그린다. SSR 이득이 사라지고 LCP·TBT 가 나빠진다.
경고는 콘솔에만 찍혀서 화면상으로는 멀쩡해 보이는 채로 오래 남는다.

이 저장소에서 실제로 겪은 것들과, 각각을 어떻게 처리했는지 정리한다.

## 판별 기준

원인은 달라도 형태는 하나다. **서버가 알 수 없는 값을 첫 렌더에 쓰면 어긋난다.**

서버가 알 수 없는 값의 예: `localStorage`, `window` 크기, 현재 시각, `Math.random()`,
그리고 **아직 도착하지 않은 비동기 데이터**.

마지막 항목이 함정이다. 값 자체는 서버도 알지만 *타이밍*이 갈린다.

## 사례 1 — 스트리밍 쿼리의 도착 타이밍 (#70)

`/daily` 에서 E2E 실행당 18건 발생했다.

```
- <p className="text-sm text-zinc-500">   (서버: 로딩)
+ <div className="flex flex-col gap-2">   (클라이언트: 본문)
```

`(dashboard)/layout.tsx` 는 프로필을 `await` 없이 `prefetchQuery` 한다. 셸 렌더를
막지 않으려는 의도적 선택이고, pending 쿼리째로 dehydrate 되도록
`shouldDehydrateQuery` 에 `status === 'pending'` 을 포함시켜 스트리밍으로 넘긴다.

그래서 서버 렌더 시점에 이 쿼리는 **항상** pending 이다 → `useEffectiveToday` 의
`ready` 가 false → 서버는 반드시 로딩을 그린다.

문제는 클라이언트다. 스트리밍된 프로필이 하이드레이션 **전에** 도착하면 첫 렌더에서
이미 `ready === true` 라 본문을 그린다. 서버가 빠르고 JS 번들 파싱이 느릴수록 잘 걸린다.

### 해결

첫 렌더를 서버와 같은 로딩으로 고정하고, 마운트 이후에 본문으로 넘어간다.

```tsx
const hydrated = useHydrated()
const { ready, ... } = useEffectiveToday()
if (!hydrated || !ready) return <로딩 />
```

`src/hooks/useHydrated.ts` 는 `useSyncExternalStore` 로 SSR·하이드레이션 중에는
`false`, 마운트 후 `true` 를 돌려준다.

```ts
useSyncExternalStore(subscribe, () => true, () => false)
```

`useState(false)` + `useEffect(() => setHydrated(true))` 와 결과는 같지만, effect 에서
state 를 쓰지 않아 `react-hooks/set-state-in-effect` 예외 주석이 필요 없다. React 가
서버 스냅샷과 클라이언트 스냅샷을 구분해 주는 용도로 만든 API 라 의도도 더 정확히 드러난다.

**layout 의 프리페치는 그대로 뒀다.** `await` 로 되돌리면 불일치는 사라지지만 셸 렌더가
프로필 응답만큼 지연된다. 프리페치를 뺀 이유가 바로 그 지연이었으므로, 첫 렌더 한 번을
맞추는 쪽이 싸다.

### 결과

| | 하이드레이션 실패 | Perf | LCP | TBT | SI |
|---|---|---|---|---|---|
| 수정 전 | 18건 | 92 | 2.69s | 114ms | 3.66s |
| 수정 후 | 0건 | 95 | 2.39s | 89ms | 1.52s |

`pnpm perf --page /daily` 5회 median, 같은 데이터 볼륨(태스크 9,151). 원장은
`docs/perf/history.md` 의 2026-08-05 항목.

로딩을 한 프레임 더 보여주는 변경인데 지표가 좋아지는 게 역설적으로 보이지만,
서브트리를 통째로 다시 그리는 비용이 그보다 크다. 이게 하이드레이션 불일치를 성능
문제로도 취급해야 하는 이유다.

## 사례 2 — 서버/클라이언트 분기 (#79, 미해결)

```
- 기본        (서버)
+ 에메랄드     (클라이언트)
at Header (src/components/layout/Header.tsx:103)
```

`useTheme.tsx` 의 `useState` 초기화 함수가 `typeof window === 'undefined'` 로 분기해
서버는 기본 테마, 클라이언트는 `localStorage` 값을 쓴다. 첫 렌더부터 값이 다르다.

CSS 변수도 `useEffect` 에서 주입하므로 첫 페인트는 항상 기본 테마 색이다(FOUC).

라벨만 고칠 거면 `useHydrated` 로 충분하지만, FOUC 까지 없애려면 테마를 쿠키로 옮겨
서버가 값을 알게 해야 한다. #79 에서 다룬다.

## 사례 3 — 클라이언트 전용 값을 null 로 시작

같은 `Header.tsx` 의 현재 시각은 이미 해결돼 있다.

```tsx
const [now, setNow] = useState<Date | null>(null)
```

서버와 클라이언트 첫 렌더가 똑같이 `null` 이고, 마운트 후 rAF 루프가 채운다.
값이 하나뿐이고 "없음" 상태를 렌더할 수 있으면 이 방법이 가장 간단하다.

## 사례 4 — 시드 고정

퀴즈 셔플(`4c12f66`)은 `Math.random()` 대신 시드 기반 셔플을 써서 서버·클라이언트가
같은 순서를 내도록 했다. 무작위성이 필요하지만 양쪽이 일치해야 할 때 쓴다.

## 선택 기준

| 상황 | 방법 |
|---|---|
| 비동기 데이터의 도착 타이밍이 갈린다 | `useHydrated` 로 첫 렌더 고정 |
| 클라이언트 전용 값이고 "없음"을 렌더할 수 있다 | `null` 로 시작하고 마운트 후 채움 |
| 서버도 값을 알아야 한다 (FOUC 동반) | 쿠키로 옮겨 서버 렌더에 반영 |
| 무작위지만 양쪽이 같아야 한다 | 시드 고정 |

`suppressHydrationWarning` 은 쓰지 않는다. 경고만 지울 뿐 재렌더 비용은 그대로다.

## 회귀 감시

E2E 로그에 경고가 그대로 찍히므로 건수를 세면 된다.

```bash
pnpm test:e2e 2>&1 | tee /tmp/e2e.log
grep -c "Hydration failed" /tmp/e2e.log
grep -oE "at [A-Za-z]+ \(src/[^)]+\)" /tmp/e2e.log | sort | uniq -c | sort -rn
```

두 번째 명령이 어느 컴포넌트인지 알려준다. 2026-08-05 기준 남은 1건은 #79 (Header 테마)다.

테스트를 실패시키지는 않는다 — 경고가 stderr 로만 나오고 스펙은 통과하므로, 지금은
수동 확인 항목이다. 자동화하려면 Playwright 의 `console` 이벤트를 수집해 건수를
단언하는 스펙을 따로 두면 된다.
