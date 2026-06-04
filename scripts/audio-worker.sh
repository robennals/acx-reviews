#!/bin/zsh
# Generate + align one review (invoked by batch-2026-audio.sh via xargs).
set -u
slug="$1"
log=".audio-work/logs/$slug.log"
if pnpm exec tsx scripts/generate-audio.ts "$slug" > "$log" 2>&1 \
   && uv run scripts/align-audio.py "$slug" >> "$log" 2>&1; then
  echo "OK   $slug ($(date +%H:%M:%S))"
else
  echo "FAIL $slug ($(date +%H:%M:%S))"
fi
