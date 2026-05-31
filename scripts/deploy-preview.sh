#!/usr/bin/env bash
# Deploy a preview of this branch, then assign the stable preview alias to
# it. The alias URL is the one configured in Google OAuth as an authorized
# redirect target, so login only works on whichever deploy currently owns it.
#
# The contest voting config now lives in the committed data/voting-config.json
# (read at build time), so it no longer needs to be injected here. Branch-scoped
# env vars aren't applied to CLI deploys (Vercel gotcha), so we still pass
# NEXTAUTH_URL explicitly via --env and --build-env.
#
# PREVIEW_CONTEST_LIVE=true hard-codes the contest as launched for THIS private
# preview deploy only (getContestLive() honors it), so we can share the
# launched view without flipping the shared production site_flags flag.

set -euo pipefail

PREVIEW_ALIAS=acx-reviews-robennals-4282-rob-ennals-projects.vercel.app
NEXTAUTH_URL="https://$PREVIEW_ALIAS"
PREVIEW_CONTEST_LIVE=true

# Capture stdout to a tempfile (so the user still sees Vercel's progress
# stream on stderr) and extract the deployment URL from the final line.
# Just `$(vercel deploy ...)` doesn't work — Vercel writes build progress
# to stdout too, so the captured value is the entire log not just the URL.
LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT

vercel deploy --yes --force \
  --env NEXTAUTH_URL="$NEXTAUTH_URL" \
  --env PREVIEW_CONTEST_LIVE="$PREVIEW_CONTEST_LIVE" \
  --build-env NEXTAUTH_URL="$NEXTAUTH_URL" \
  --build-env PREVIEW_CONTEST_LIVE="$PREVIEW_CONTEST_LIVE" \
  "$@" | tee "$LOG"

# The CLI prints the final URL last on its own line.
DEPLOY_URL=$(grep -oE 'https://[a-z0-9-]+\.vercel\.app' "$LOG" | tail -n 1)
if [[ -z "$DEPLOY_URL" ]]; then
  echo "ERROR: could not parse deployment URL from output" >&2
  exit 1
fi

echo "Deployment: $DEPLOY_URL"
vercel alias set "$DEPLOY_URL" "$PREVIEW_ALIAS"
echo "Aliased to: https://$PREVIEW_ALIAS"
