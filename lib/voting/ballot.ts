export type Ballot = string[];   // reviewIds in rank order (index 0 = rank 1)
export type Target = { beforeReviewId: string } | { atEnd: true };

export const COUNTING_ZONE_SIZE = 10;

export function isCountingZone(rank: number): boolean {
  return rank >= 1 && rank <= COUNTING_ZONE_SIZE;
}

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

export function removeFrom(b: Ballot, reviewId: string): Ballot {
  const idx = b.indexOf(reviewId);
  if (idx === -1) {
    throw new Error(`reviewId ${reviewId} not in ballot`);
  }
  return [...b.slice(0, idx), ...b.slice(idx + 1)];
}
