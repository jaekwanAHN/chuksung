---
description: 최근 작업 내용을 ~/projects/blog에 블로그 글(mdx)로 작성
argument-hint: "[주제 — 생략 시 이 세션의 최근 작업]"
allowed-tools: Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(npm run build:*), Bash(cd:*)
---

이 세션에서 진행한 작업(또는 인자로 받은 주제)을 `~/projects/blog`에 블로그 글로 작성한다.

## 블로그 저장소 컨벤션

- 위치: `~/projects/blog` (chuksung과 **다른 저장소** — 패키지 매니저는 **npm**, pnpm 아님)
- 글 경로: `content/posts/YYYY-MM-DD-slug.mdx` (날짜는 오늘, slug는 영문 kebab-case)
- frontmatter (이 4개 필드만):

  ```yaml
  ---
  title: "제목"
  date: "YYYY-MM-DD"
  description: "한 문장 요약 — 무엇을 어떻게 했는지"
  tags: ["소문자", "영문", "키워드"]
  ---
  ```

## 문체·구조 (기존 글과 일관성 유지)

- 본문 첫 줄은 반드시: `경험을 토대로 AI를 활용하여 작성한 글 입니다.`
- 1인칭 반말체 서술형 ("~했다", "~였다"). 기술 블로그 특유의 담백한 디버깅 기록 톤
- 구조: **문제 발견(계기) → 왜 문제인지 → 해결 과정(코드 포함) → 검증 → 교훈** 순의 내러티브.
  섹션 나열이 아니라 이야기가 흐르게 쓴다
- 스타일 참조 글: `content/posts/2026-07-10-api-mass-assignment-zod.mdx`,
  `content/posts/2026-07-06-optimistic-update-checkbox-delay.mdx`
- 코드 블록은 핵심만 발췌 (전체 파일 복사 금지). 실측 결과(EXPLAIN, curl 응답,
  검증 로그)가 있으면 근거로 인용
- "AI가 했다"가 아니라 작성자가 직접 겪고 해결한 1인칭 시점으로 서술

## 절차

1. **소재 수집**: 인자가 있으면 그 주제, 없으면 이 세션의 최근 작업(커밋/PR/검증 기록)에서
   글감을 뽑는다. 단순 변경 나열이 아니라 **"뜻밖의 발견"이나 "왜 그렇게 했는가"**가
   글의 축이 될 만한 지점을 찾는다 (예: 검증에서 잡은 버그, 우회로, 설계 트레이드오프)
2. **중복 확인**: `ls ~/projects/blog/content/posts/`로 같은 주제의 기존 글이 있는지 확인
3. **작성**: 위 컨벤션·문체로 mdx 파일 생성
4. **검증**: `cd ~/projects/blog && npm run build` — MDX 렌더링 에러 없이 SSG 경로에
   새 글이 포함되는지 확인
5. **보고**: 파일 경로·제목·구성 요약을 보고한다. **커밋은 하지 않는다**
   (사용자가 내용 확인 후 별도 요청 시에만)
