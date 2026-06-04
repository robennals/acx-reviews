#!/bin/zsh
# Generate narration for every 2026 review not yet in the audio manifest.
# Phase 1: generate + align, 3 reviews in parallel (alignment is the CPU
#          bottleneck; generation is rate-limited only per-minute).
# Phase 2: serial uploads — concurrent upload-audio.ts runs would race on
#          data/audio-manifest.json.
# Per-slug logs land in .audio-work/logs/. Reruns are cheap: generation
# resumes from the per-chunk PCM cache.
set -u
cd "$(dirname "$0")/.."
mkdir -p .audio-work/logs

python3 - << 'PY' > /tmp/slugs-remaining.txt
import json, glob, os
manifest = json.load(open('data/audio-manifest.json'))
for path in sorted(glob.glob('data/reviews/2026-book-reviews/*.md')):
    slug = os.path.basename(path)[:-3]
    if slug not in manifest:
        print(slug)
PY
total=$(wc -l < /tmp/slugs-remaining.txt | tr -d ' ')
echo "=== PHASE 1: generate+align $total reviews, 3 workers ($(date +%H:%M:%S)) ==="

xargs -P 3 -I {} zsh -c '
  slug="{}"
  log=".audio-work/logs/$slug.log"
  if pnpm exec tsx scripts/generate-audio.ts "$slug" > "$log" 2>&1 \
     && uv run scripts/align-audio.py "$slug" >> "$log" 2>&1; then
    echo "OK   $slug ($(date +%H:%M:%S))"
  else
    echo "FAIL $slug ($(date +%H:%M:%S))"
  fi
' < /tmp/slugs-remaining.txt

echo "=== PHASE 2: serial uploads ($(date +%H:%M:%S)) ==="
while read -r slug; do
  if [[ -f "public/audio/$slug.m4a" && -f "public/audio/$slug.words.json" ]]; then
    pnpm exec tsx scripts/upload-audio.ts "$slug" >> ".audio-work/logs/$slug.log" 2>&1 \
      && echo "UPLOADED $slug" || echo "UPLOAD-FAIL $slug"
  else
    echo "SKIP-UPLOAD $slug (missing artifacts)"
  fi
done < /tmp/slugs-remaining.txt

echo "=== VALIDATION ($(date +%H:%M:%S)) ==="
pnpm exec tsx scripts/check-audio.ts
echo "=== unmapped math warnings, if any ==="
grep -l "unmapped" .audio-work/logs/*.log 2>/dev/null || echo "none"
echo "=== BATCH DONE ($(date +%H:%M:%S)) ==="
