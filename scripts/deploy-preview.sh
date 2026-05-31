#!/usr/bin/env bash
# Deploy a preview of this branch with the 2026 voting config active,
# then assign the stable preview alias to it. The alias URL is the one
# configured in Google OAuth as an authorized redirect target, so login
# only works on whichever deploy currently owns it.
#
# Branch-scoped env vars aren't applied to CLI deploys (Vercel gotcha), so
# we pass them explicitly via --env and --build-env. Keep this script as
# the source of truth for the secret-preview deployment.

set -euo pipefail

VOTING_CONTEST_YEAR=2026
VOTING_CONTEST_TITLE="2026 Book Reviews"
VOTING_START=2026-04-18T00:00:00Z
VOTING_END=2026-06-15T00:00:00Z
PREVIEW_ALIAS=acx-reviews-robennals-4282-rob-ennals-projects.vercel.app
NEXTAUTH_URL="https://$PREVIEW_ALIAS"

# Capture stdout to a tempfile (so the user still sees Vercel's progress
# stream on stderr) and extract the deployment URL from the final line.
# Just `$(vercel deploy ...)` doesn't work — Vercel writes build progress
# to stdout too, so the captured value is the entire log not just the URL.
LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT

vercel deploy --yes --force \
  --env VOTING_CONTEST_YEAR="$VOTING_CONTEST_YEAR" \
  --env VOTING_CONTEST_TITLE="$VOTING_CONTEST_TITLE" \
  --env VOTING_START="$VOTING_START" \
  --env VOTING_END="$VOTING_END" \
  --env NEXTAUTH_URL="$NEXTAUTH_URL" \
  --build-env VOTING_CONTEST_YEAR="$VOTING_CONTEST_YEAR" \
  --build-env VOTING_CONTEST_TITLE="$VOTING_CONTEST_TITLE" \
  --build-env VOTING_START="$VOTING_START" \
  --build-env VOTING_END="$VOTING_END" \
  --build-env NEXTAUTH_URL="$NEXTAUTH_URL" \
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
