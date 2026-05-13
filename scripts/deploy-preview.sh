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
VOTING_END=2026-07-01T00:00:00Z
PREVIEW_ALIAS=acx-reviews-robennals-4282-rob-ennals-projects.vercel.app
NEXTAUTH_URL="https://$PREVIEW_ALIAS"

DEPLOY_URL=$(
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
    "$@"
)

echo "Deployment: $DEPLOY_URL"
vercel alias set "$DEPLOY_URL" "$PREVIEW_ALIAS"
echo "Aliased to: https://$PREVIEW_ALIAS"
