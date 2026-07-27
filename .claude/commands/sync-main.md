---
description: main 최신화 + main에 머지 완료된 로컬 브랜치·worktree 정리
argument-hint: "[base 브랜치 — 기본 main]"
allowed-tools: Bash(git branch:*), Bash(git worktree:*), Bash(git fetch:*), Bash(git status:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git checkout:*), Bash(git merge:*), Bash(gh pr view:*)
---

base 브랜치(기본 `main`)를 원격 기준으로 최신화하고, base에 **머지가 완료된** 로컬 브랜치와 worktree를 제거한다.

## 자동 수집 컨텍스트

- 현재 브랜치: !`git branch --show-current`
- 작업 트리 상태: !`git status -sb`
- 로컬 브랜치(추적 상태 포함): !`git branch -vv`
- worktree 목록: !`git worktree list`

## 절차

base 는 인자로 받고, 없으면 `main`.

1. **가드**:
   - 현재 브랜치에 커밋되지 않은 변경(위 `git status -sb`에 파일 표시)이 있으면 **중단**하고 커밋/스태시를 안내한다 (아래 단계가 브랜치를 이동/삭제할 수 있으므로).
   - `?? .claude/…` 같은 untracked 로컬 툴링만 있고 tracked 변경이 없으면 그대로 진행해도 된다.

2. **원격 동기화 + prune**: `git fetch origin --prune` — 원격에서 삭제된 추적 브랜치 참조를 정리한다.

3. **base 최신화** (fast-forward만, 병합 커밋 만들지 않음):
   - 현재 base 브랜치 위라면: `git merge --ff-only origin/<base>`
   - 다른 브랜치 위라면 체크아웃 없이: `git fetch origin <base>:<base>` (fast-forward 불가 시 실패하면, base가 로컬에서 갈라진 것 → 그 사실을 보고하고 base 정리는 건너뛴다)

4. **머지 완료 브랜치 식별**:
   - 병합 커밋으로 머지된 것: `git branch --merged <base>` 결과에서 `<base>`와 **현재 브랜치**, `*` 표시를 제외.
   - squash/rebase 머지되어 원격이 삭제된 것: `git branch -vv`에서 `: gone]`로 표시된 브랜치 (upstream이 사라짐 = 원격 PR 머지 후 브랜치 삭제됨). 확신이 필요하면 `gh pr view <브랜치> --json state,mergedAt`로 MERGED 확인.
   - 두 목록을 합치되, **현재 체크아웃된 브랜치와 `<base>`는 절대 삭제 대상에서 제외**한다.

5. **worktree 정리**: `git worktree list`의 각 항목 중, 메인 작업 디렉토리가 아니고 그 브랜치가 4번의 삭제 대상이면 `git worktree remove <경로>` (변경 있어 거부되면 사용자에게 알리고 건너뜀). 이후 `git worktree prune`으로 끊긴 참조 정리. **브랜치를 삭제하기 전에 worktree를 먼저 제거해야 한다** (worktree가 브랜치를 점유 중이면 브랜치 삭제 불가).

6. **브랜치 삭제**:
   - `--merged`로 잡힌 것: `git branch -d <브랜치>` (안전 삭제 — 미머지면 git이 거부).
   - `: gone]`로 잡힌 것: `-d`가 거부하면, 원격 머지가 확인된 경우에 한해 `git branch -D <브랜치>`. 확인 안 되면 삭제하지 말고 목록만 보고한다.

7. **보고**: base 최신화 결과(업데이트된 커밋 수/최신 커밋), 삭제한 브랜치·worktree 목록, 건너뛴 항목과 사유를 요약한다. 삭제할 대상이 없으면 "정리할 브랜치·worktree 없음"이라고 알린다.

주의: 삭제는 되돌리기 어렵다. 안전 삭제(`-d`)를 기본으로 쓰고, 강제 삭제(`-D`)는 원격 머지가 확인된 `gone` 브랜치에만 적용한다. 현재 브랜치와 base는 어떤 경우에도 삭제하지 않는다.

인자(base 브랜치 지정 등): $ARGUMENTS
