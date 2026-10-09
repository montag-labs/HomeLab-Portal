#!/bin/sh
# PreToolUse-Hook: führt vor "git commit" den Client-Lint aus und blockiert bei Fehlern.
input=$(cat)
case "$input" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(npm run lint --prefix client 2>&1); then
  echo "Lint fehlgeschlagen, Commit blockiert:" >&2
  echo "$out" | tail -30 >&2
  exit 2
fi
exit 0
