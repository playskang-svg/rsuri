#!/usr/bin/env bash
# 로컬 ↔ 클라우드 동기화.
#
# 클라우드 세션(Claude Code on the web)은 작업 단위마다 즉시 push한다.
# 로컬에서는 작업 시작 전 이 스크립트를 돌려 그 결과를 당겨온다.
# 클라우드가 로컬 디스크에 직접 쓸 수는 없으므로, 이 방향이 유일한 경로다.
#
# 사용법:
#   bash scripts/sync.sh              현재 브랜치를 원격과 맞춘다
#   bash scripts/sync.sh <브랜치명>    그 브랜치로 옮긴 뒤 맞춘다
set -euo pipefail

cd "$(dirname "$0")/.."

info() { printf '\033[36m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

TARGET="${1:-}"

# 커밋 안 된 변경이 있으면 멈춘다. pull이 로컬 작업을 덮어쓰는 사고를 막는다.
if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "커밋하지 않은 변경이 있다:"
  git status --short
  fail "먼저 커밋하거나 'git stash'로 치운 뒤 다시 실행할 것."
fi

if [ -n "$TARGET" ]; then
  info "▶ 브랜치 전환: $TARGET"
  git fetch origin "$TARGET" 2>/dev/null || git fetch origin
  if git show-ref --verify --quiet "refs/heads/$TARGET"; then
    git checkout "$TARGET"
  else
    git checkout -b "$TARGET" "origin/$TARGET"
  fi
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
info "▶ 현재 브랜치: $BRANCH"

# 네트워크가 끊기는 환경을 고려해 지수 백오프로 재시도한다.
DELAY=2
for attempt in 1 2 3 4 5; do
  if git fetch origin "$BRANCH"; then break; fi
  [ "$attempt" -eq 5 ] && fail "fetch 실패 — 네트워크를 확인할 것."
  warn "fetch 실패, ${DELAY}초 후 재시도 ($attempt/4)"
  sleep "$DELAY"; DELAY=$((DELAY * 2))
done

BEFORE="$(git rev-parse HEAD)"

if ! git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null; then
  warn "origin/$BRANCH 이 없다 — 아직 push되지 않은 로컬 전용 브랜치다."
  exit 0
fi

# rebase가 아니라 merge로 당긴다. 양쪽에서 같은 브랜치를 쓸 때
# rebase는 이미 push된 커밋의 해시를 바꿔 상대 체크아웃을 깨뜨린다.
git merge --ff-only "origin/$BRANCH" 2>/dev/null || {
  warn "fast-forward 불가 — 로컬에만 있는 커밋이 있다. merge로 합친다."
  git merge --no-edit "origin/$BRANCH"
}

AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  info "✓ 이미 최신이다."
  exit 0
fi

echo
info "▶ 받아온 변경"
git --no-pager log --oneline "$BEFORE..$AFTER"
echo
info "▶ 바뀐 파일"
git --no-pager diff --stat "$BEFORE" "$AFTER"

# 의존성이 바뀌었으면 알려준다. 자동으로 install하지 않는다 —
# 시간이 오래 걸리고, 언제 도는지 모르는 설치는 디버깅을 어렵게 한다.
if ! git diff --quiet "$BEFORE" "$AFTER" -- web/package-lock.json web/package.json; then
  echo
  warn "! web 의존성이 바뀌었다. 빌드 전에 실행할 것:"
  warn "    cd web && npm ci"
fi

if ! git diff --quiet "$BEFORE" "$AFTER" -- supabase/migrations; then
  echo
  warn "! 마이그레이션이 추가됐다. DB 반영은 승인 후 진행할 것 (CLAUDE.md 3번)."
fi

echo
info "✓ 동기화 완료."
