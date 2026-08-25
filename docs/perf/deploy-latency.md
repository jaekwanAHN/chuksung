# 배포 production TTFB 원장

`pnpm perf:deploy`가 배포된 production URL을 측정해 최신 섹션을 아래 마커 바로 밑에
추가한다. 로컬 Lighthouse 렌더링 지표와 직접 비교하지 않는다.

첫 요청은 실제 cold start를 보장하지 않아 `first`, 이후 요청의 대표값은
`repeat median`으로 표기한다. 측정 방법과 신뢰 조건은 `README.md`와
`measurement-contract.md`, 과거 수동 실험은 `archive/README.md` 참조.

<!-- perf:deploy — 자동 기록은 이 줄 바로 아래에 삽입된다 -->
