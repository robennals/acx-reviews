export type Ballot = string[];   // reviewIds in rank order (index 0 = rank 1)
export type Target = { beforeReviewId: string } | { atEnd: true };

export const COUNTING_ZONE_SIZE = 10;

/**
 * Whether a 1-based rank falls within the counted top-N. Ranks below
 * COUNTING_ZONE_SIZE still live on the ballot but don't contribute to the tally.
 */
export function isCountingZone(rank: number): boolean {
  return rank >= 1 && rank <= COUNTING_ZONE_SIZE;
}

/**
 * Insert a reviewId into a ballot at the given target position. Throws if the
 * reviewId is already in the ballot, or if the target reviewId isn't found.
 */
export function insertAt(b: Ballot, reviewId: string, target: Target): Ballot {
  if (b.includes(reviewId)) {
    throw new Error(`reviewId ${reviewId} already in ballot`);
  }
  if ('atEnd' in target) {
    return [...b, reviewId];
  }
  const idx = b.indexOf(target.beforeReviewId);
  if (idx === -1) {
    throw new Error(`target ${target.beforeReviewId} not in ballot`);
  }
  return [...b.slice(0, idx), reviewId, ...b.slice(idx)];
}

/**
 * Move an existing reviewId to a new position within the ballot. Self-target
 * (and tap-row-immediately-below) is a no-op. Throws if reviewId or target
 * isn't in the ballot.
 */
export function moveTo(b: Ballot, reviewId: string, target: Target): Ballot {
  if (!b.includes(reviewId)) {
    throw new Error(`reviewId ${reviewId} not in ballot`);
  }
  // Self-target is a no-op.
  if ('beforeReviewId' in target && target.beforeReviewId === reviewId) {
    return [...b];
  }
  // Remove first; then insert before target's NEW position.
  const without = b.filter((id) => id !== reviewId);
  if ('atEnd' in target) {
    return [...without, reviewId];
  }
  const idx = without.indexOf(target.beforeReviewId);
  if (idx === -1) {
    throw new Error(`target ${target.beforeReviewId} not in ballot`);
  }
  return [...without.slice(0, idx), reviewId, ...without.slice(idx)];
}

/**
 * Remove a reviewId from the ballot. Throws if it isn't present.
 */
export function removeFrom(b: Ballot, reviewId: string): Ballot {
  const idx = b.indexOf(reviewId);
  if (idx === -1) {
    throw new Error(`reviewId ${reviewId} not in ballot`);
  }
  return [...b.slice(0, idx), ...b.slice(idx + 1)];
}
