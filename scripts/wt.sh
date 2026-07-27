#!/usr/bin/env bash
#
# worktree 부트스트랩 — 병렬 작업용 git worktree를 한 번에 준비한다.
#
#   pnpm wt <브랜치명> [--base <ref>] [--no-install]
#
# 하는 일:
#   1. 최신 origin/<base>에서 worktree + 브랜치 생성 (.claude/worktrees/<디렉토리명>)
#   2. .env.local 복사 (gitignore 대상이라 새 worktree엔 없음 — 없으면 빌드/E2E 전부 실패)
#   3. E2E_PORT를 worktree마다 겹치지 않게 할당 (dev·Playwright 서버 포트가 여기서 갈림)
#   4. .claude/settings.local.json 복사 (있으면 — 권한 허용 목록 유지)
#   5. pnpm install (--no-install로 생략)
#
set -euo pipefail

PORT_BASE=3110  # 3100은 기본 E2E 포트라 비워둔다
PORT_STEP=10

die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
info() { printf '\033[36m→\033[0m %s\n' "$*"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

branch=""
base="main"
do_install=1

while [ $# -gt 0 ]; do
  case "$1" in
    --base) base="${2:-}"; [ -n "$base" ] || die "--base 뒤에 ref가 필요합니다"; shift 2 ;;
    --no-install) do_install=0; shift ;;
    -h|--help) awk 'NR>1 && !/^#/{exit} NR>1{sub(/^# ?/, ""); print}' "$0"; exit 0 ;;
    -*) die "알 수 없는 옵션: $1" ;;
    *) [ -z "$branch" ] || die "브랜치명은 하나만 지정하세요 (받은 값: $branch, $1)"; branch="$1"; shift ;;
  esac
done

[ -n "$branch" ] || die "사용법: pnpm wt <브랜치명> [--base <ref>] [--no-install]"

# git worktree list의 첫 항목이 메인 작업 트리 — .env.local 등 원본은 항상 여기 있다.
main_wt=$(git worktree list --porcelain | head -1 | cut -d' ' -f2-)
[ -n "$main_wt" ] || die "git 저장소가 아닙니다"

# feat/foo-bar → feat-foo-bar (경로에 슬래시가 들어가면 중첩 디렉토리가 되므로 평탄화)
dirname=${branch//\//-}
wt_dir="$main_wt/.claude/worktrees/$dirname"

[ -e "$wt_dir" ] && die "이미 존재합니다: $wt_dir"

# ── 1. worktree 생성 ──────────────────────────────────────────────
info "origin/$base 최신화"
git -C "$main_wt" fetch origin "$base" --quiet

if git -C "$main_wt" show-ref --verify --quiet "refs/heads/$branch"; then
  warn "브랜치 '$branch'가 이미 있습니다 — 새로 만들지 않고 체크아웃합니다"
  git -C "$main_wt" worktree add "$wt_dir" "$branch"
else
  git -C "$main_wt" worktree add "$wt_dir" -b "$branch" "origin/$base"
fi
ok "worktree: $wt_dir  (브랜치 $branch)"

# ── 2. .env.local 복사 ────────────────────────────────────────────
if [ -f "$main_wt/.env.local" ]; then
  cp "$main_wt/.env.local" "$wt_dir/.env.local"
  ok ".env.local 복사"
else
  warn "$main_wt/.env.local 이 없습니다 — 직접 만들어야 빌드·E2E가 동작합니다"
fi

# ── 3. E2E_PORT 할당 ──────────────────────────────────────────────
# 기존 worktree들의 .env.local에서 쓰이는 포트를 모아 가장 낮은 빈 번호를 고른다.
used_ports=$(
  git -C "$main_wt" worktree list --porcelain \
    | awk '/^worktree /{print substr($0, 10)}' \
    | while read -r p; do
        [ -f "$p/.env.local" ] && grep -hoP '^E2E_PORT=\K\d+' "$p/.env.local" || true
      done
)
port=$PORT_BASE
while printf '%s\n' "$used_ports" | grep -qx "$port"; do
  port=$((port + PORT_STEP))
done

if [ -f "$wt_dir/.env.local" ]; then
  # 복사본에 E2E_PORT가 이미 있으면 교체, 없으면 추가
  if grep -q '^E2E_PORT=' "$wt_dir/.env.local"; then
    sed -i "s/^E2E_PORT=.*/E2E_PORT=$port/" "$wt_dir/.env.local"
  else
    printf '\n# worktree 전용 포트 (pnpm wt 자동 할당) — dev·Playwright 서버가 이 포트를 씁니다\nE2E_PORT=%s\n' "$port" >> "$wt_dir/.env.local"
  fi
  ok "E2E_PORT=$port 할당"
fi

# ── 4. 로컬 권한 설정 복사 ────────────────────────────────────────
if [ -f "$main_wt/.claude/settings.local.json" ]; then
  mkdir -p "$wt_dir/.claude"
  cp "$main_wt/.claude/settings.local.json" "$wt_dir/.claude/settings.local.json"
  ok ".claude/settings.local.json 복사"
fi

# ── 5. 의존성 설치 ────────────────────────────────────────────────
if [ "$do_install" -eq 1 ]; then
  info "pnpm install (pnpm store 하드링크라 대개 수 초)"
  (cd "$wt_dir" && pnpm install --silent)
  ok "의존성 설치 완료"
else
  warn "install 생략 — 작업 전에 'cd $wt_dir && pnpm install' 필요"
fi

cat <<EOF

준비 완료. 새 Windows Terminal 탭에서:

  cd $wt_dir && claude

  dev 서버 : pnpm dev --port $port
  E2E      : pnpm test:e2e        (E2E_PORT=$port 자동 적용)

주의: 원격 Supabase DB와 E2E 테스트 계정은 모든 worktree가 공유합니다.
      pnpm test:e2e / pnpm perf / pnpm db:push 는 한 번에 하나씩만 실행하세요.
EOF
