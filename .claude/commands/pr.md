---
description: 현재 브랜치로 PR 생성 (gh + 프로젝트 PR 템플릿 자동 작성)
argument-hint: "[base 브랜치 — 기본 main]"
allowed-tools: Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(git fetch:*), Bash(git push:*), Bash(gh pr create:*), Bash(gh pr view:*)
---

현재 체크아웃된 브랜치로 GitHub PR을 생성한다. base 브랜치는 인자로 받고, 없으면 `main`.

## 자동 수집 컨텍스트

- 현재 브랜치: !`git branch --show-current`
- main 대비 커밋: !`git log --oneline main..HEAD`
- main 대비 변경 파일: !`git diff --stat main...HEAD`
- 브랜치/원격 상태: !`git status -sb | head -1`
- PR 템플릿(이 구조를 그대로 사용): @.github/pull_request_template.md

## 절차

1. **가드**: 현재 브랜치가 base(기본 `main`)와 같으면 중단하고, 작업 브랜치로 전환하라고 안내한다. 위 "커밋" 목록이 비어 있으면(차이 없음/이미 머지됨) 중단하고 그 사실을 알린다.
2. **push**: `git status`상 원격에 브랜치가 없거나 로컬이 앞서 있으면 `git push -u origin HEAD`로 먼저 올린다.
3. **본문 작성**: 위 PR 템플릿의 섹션 구조를 그대로 사용해 채운다.
   - `## 작업 내용` — 이 브랜치가 왜 필요한지 / 무엇을 해결하는지 1~2줄. diff 나열이 아니라 의도를 쓴다.
   - `## 변경사항` — 커밋과 diff에서 도출한 핵심 변경을 불릿으로. 검증(lint/build/test)을 했다면 한 줄 추가한다.
   - `## 관련 이슈` — 브랜치명·커밋 메시지에 `#번호`가 있으면 채우고, 없으면 `- 없음`.
4. **제목**: 커밋 컨벤션 `feat|fix|test|docs|refactor|chore: 한국어 요약`을 따른다. 대표 커밋 성격을 반영한다.
5. **생성**: `gh pr create --base <base> --head <현재 브랜치> --title "<제목>" --body "<채운 본문>"` 를 실행한다.
6. **보고**: 생성된 PR URL을 출력한다. "already exists" 에러가 나면 `gh pr view --json url,number` 로 기존 PR URL을 찾아 알린다.

주의: 본문은 반드시 위에서 읽은 `@.github/pull_request_template.md` 의 실제 섹션 제목을 그대로 쓴다(임의로 섹션을 바꾸지 않는다). base 브랜치를 인자로 지정했다면 `main` 대신 그 브랜치로 비교/생성한다.

인자(base 브랜치 지정 등): $ARGUMENTS
