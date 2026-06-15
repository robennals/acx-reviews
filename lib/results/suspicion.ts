import type { VoteRecord } from './types';
import { ratingsByEmail, ratingsBySlug } from './stats';

// Tunable thresholds (documented constants).
const SINGLE_SPIKE_MAX_VOTES = 3; // "rated only a few"
const SINGLE_SPIKE_HIGH = 9; // a 9 or 10
const CORR_MIN_VOTES = 5; // need this many to judge correlation
const CORR_THRESHOLD = 0.1; // below this consensus correlation is suspicious
const EXTREME_MIN_VOTES = 5;
const EXTREME_SD_MAX = 0.75; // very low spread
const EXTREME_MEAN_DELTA = 2.5; // mean this far from global
const DRIVEBY_HIGH = 9;

export type SuspicionFlag = 'single-spike' | 'low-correlation' | 'extreme-bias';

export interface SuspiciousReviewer {
  email: string;
  n: number;
  mean: number;
  consensusCorrelation: number | null; // null when too few votes
  flags: SuspicionFlag[];
  detail: string;
  score: number;
}

export interface DriveByCluster {
  slug: string;
  driveByCount: number; // single-vote ballots that gave this review a 9-10
  totalVotes: number;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function pearson(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 2) return null;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

export function analyzeSuspicion(votes: VoteRecord[]): SuspiciousReviewer[] {
  const byEmail = ratingsByEmail(votes);
  const bySlug = ratingsBySlug(votes);
  const globalMean = mean(votes.map((r) => r.rating));

  // Per-review sum/count for leave-one-out consensus.
  const slugSum = new Map<string, number>();
  const slugCnt = new Map<string, number>();
  for (const [slug, ratings] of bySlug) {
    slugSum.set(slug, ratings.reduce((a, b) => a + b, 0));
    slugCnt.set(slug, ratings.length);
  }

  const out: SuspiciousReviewer[] = [];
  for (const [email, recs] of byEmail) {
    const ratings = recs.map((r) => r.rating);
    const n = ratings.length;
    const m = mean(ratings);
    const flags: SuspicionFlag[] = [];
    const details: string[] = [];

    // 1. Single-spike
    const maxRating = Math.max(...ratings);
    if (n <= SINGLE_SPIKE_MAX_VOTES && maxRating >= SINGLE_SPIKE_HIGH) {
      flags.push('single-spike');
      const spiked = recs.find((r) => r.rating === maxRating)!;
      details.push(`rated ${n} review(s); gave ${maxRating} to "${spiked.slug}"`);
    }

    // 2. Low consensus correlation (leave-one-out)
    let corr: number | null = null;
    if (n >= CORR_MIN_VOTES) {
      const mine: number[] = [];
      const cons: number[] = [];
      for (const r of recs) {
        const others = (slugCnt.get(r.slug) ?? 0) - 1;
        if (others <= 0) continue;
        const looMean = ((slugSum.get(r.slug) ?? 0) - r.rating) / others;
        mine.push(r.rating);
        cons.push(looMean);
      }
      corr = pearson(mine, cons);
      if (corr !== null && corr < CORR_THRESHOLD) {
        flags.push('low-correlation');
        details.push(`consensus correlation ${corr.toFixed(2)} over ${mine.length} reviews`);
      }
    }

    // 3. Extreme bias (very low spread, mean far from global)
    if (n >= EXTREME_MIN_VOTES) {
      const sd = Math.sqrt(mean(ratings.map((x) => (x - m) ** 2)));
      if (sd <= EXTREME_SD_MAX && Math.abs(m - globalMean) >= EXTREME_MEAN_DELTA) {
        flags.push('extreme-bias');
        details.push(`mean ${m.toFixed(1)} (global ${globalMean.toFixed(1)}), sd ${sd.toFixed(2)}`);
      }
    }

    // Combined score: weighted flag severity (single-spike weighted by rarity).
    let score = 0;
    if (flags.includes('single-spike')) score += 3 + (SINGLE_SPIKE_MAX_VOTES - n);
    if (flags.includes('low-correlation') && corr !== null) score += 2 + (CORR_THRESHOLD - corr);
    if (flags.includes('extreme-bias')) score += 2;

    out.push({
      email,
      n,
      mean: m,
      consensusCorrelation: corr,
      flags,
      detail: details.join('; '),
      score,
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

// Per-review count of single-vote ballots (voter rated only this review) that
// handed it a 9-10 — a coordinated-ballot-stuffing smell. Reviews with zero
// drive-by ballots are omitted from the result.
export function driveByClusters(votes: VoteRecord[]): DriveByCluster[] {
  const byEmail = ratingsByEmail(votes);
  const bySlug = ratingsBySlug(votes);
  const driveBy = new Map<string, number>();
  for (const [, recs] of byEmail) {
    if (recs.length !== 1) continue;
    const only = recs[0];
    if (only.rating >= DRIVEBY_HIGH) {
      driveBy.set(only.slug, (driveBy.get(only.slug) ?? 0) + 1);
    }
  }
  const out: DriveByCluster[] = [];
  for (const [slug, count] of driveBy) {
    out.push({ slug, driveByCount: count, totalVotes: bySlug.get(slug)?.length ?? 0 });
  }
  out.sort((a, b) => b.driveByCount - a.driveByCount);
  return out;
}
