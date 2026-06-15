import type { VoteRecord } from './types';
import { gaussianSmooth } from './smoothing';

// --- grouping ---

export function ratingsBySlug(votes: VoteRecord[]): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const r of votes) {
    const arr = m.get(r.slug);
    if (arr) arr.push(r.rating);
    else m.set(r.slug, [r.rating]);
  }
  return m;
}

export function ratingsByEmail(votes: VoteRecord[]): Map<string, VoteRecord[]> {
  const m = new Map<string, VoteRecord[]>();
  for (const r of votes) {
    const arr = m.get(r.email);
    if (arr) arr.push(r);
    else m.set(r.email, [r]);
  }
  return m;
}

// --- distributions ---

export interface CoveragePoint {
  votes: number; // exact vote count (x-axis)
  reviews: number; // how many reviews received exactly this many votes
  smooth: number; // smoothed overlay value
}

// allSlugs = every review in the contest (from reviews-index), so reviews with
// zero votes appear at x=0.
export function coverageDistribution(
  votes: VoteRecord[],
  allSlugs: string[]
): CoveragePoint[] {
  const counts = new Map<string, number>();
  for (const s of allSlugs) counts.set(s, 0);
  for (const r of votes) counts.set(r.slug, (counts.get(r.slug) ?? 0) + 1);

  let max = 0;
  for (const c of counts.values()) if (c > max) max = c;

  const reviewsAt = new Array<number>(max + 1).fill(0);
  for (const c of counts.values()) reviewsAt[c]++;

  const smooth = gaussianSmooth(reviewsAt, 1);
  return reviewsAt.map((reviews, votesCount) => ({
    votes: votesCount,
    reviews,
    smooth: smooth[votesCount],
  }));
}

export interface ScorePoint {
  score: number; // 1..10
  count: number;
  smooth: number;
}

export function scoreDistribution(votes: VoteRecord[]): ScorePoint[] {
  const counts = new Array<number>(11).fill(0); // index = rating
  for (const r of votes) if (r.rating >= 1 && r.rating <= 10) counts[r.rating]++;
  const raw = counts.slice(1); // ratings 1..10
  const smooth = gaussianSmooth(raw, 1);
  return raw.map((count, i) => ({ score: i + 1, count, smooth: smooth[i] }));
}

// --- raw mean + 95% CI ---

// Two-sided t critical values at 0.975 for df 1..30; df>30 ~ 1.96.
const T_975: readonly number[] = [
  0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
  2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08,
  2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];

export function tCritical975(df: number): number {
  if (df < 1) return 0;
  if (df <= 30) return T_975[df];
  return 1.96;
}

export interface MeanCI {
  n: number;
  mean: number;
  ciLow: number;
  ciHigh: number;
}

export function rawMeanCI(ratings: number[]): MeanCI {
  const n = ratings.length;
  if (n === 0) return { n: 0, mean: 0, ciLow: 0, ciHigh: 0 };
  const mean = ratings.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { n, mean, ciLow: mean, ciHigh: mean };
  const variance = ratings.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const se = Math.sqrt(variance / n);
  const t = tCritical975(n - 1);
  return { n, mean, ciLow: mean - t * se, ciHigh: mean + t * se };
}

// Convert one reviewer's ratings into uniform [0,1] values via average ranks:
// value = (avgRank - 0.5) / k. Ties share the mean of their ranks, so an
// all-equal ballot maps to all 0.5; a single rating maps to 0.5.
export function uniformizeBallot(ratings: number[]): number[] {
  const k = ratings.length;
  if (k === 0) return [];
  if (k === 1) return [0.5];
  const idx = ratings.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
  const avgRank = new Array<number>(k);
  let i = 0;
  while (i < k) {
    let j = i;
    while (j + 1 < k && idx[j + 1].r === idx[i].r) j++;
    // ranks are 1-based positions i+1..j+1; their mean:
    const mean = (i + 1 + (j + 1)) / 2;
    for (let t = i; t <= j; t++) avgRank[idx[t].i] = mean;
    i = j + 1;
  }
  return avgRank.map((rank) => (rank - 0.5) / k);
}

// For each review, the mean of the uniform values assigned by its voters.
export function normalizedScores(votes: VoteRecord[]): Map<string, number> {
  const byEmail = ratingsByEmail(votes);
  const sum = new Map<string, number>();
  const cnt = new Map<string, number>();
  for (const records of byEmail.values()) {
    const u = uniformizeBallot(records.map((r) => r.rating));
    records.forEach((rec, i) => {
      sum.set(rec.slug, (sum.get(rec.slug) ?? 0) + u[i]);
      cnt.set(rec.slug, (cnt.get(rec.slug) ?? 0) + 1);
    });
  }
  const out = new Map<string, number>();
  for (const [slug, s] of sum) out.set(slug, s / (cnt.get(slug) ?? 1));
  return out;
}

// Prior strength C for shrinkage: the median number of votes per review.
export function defaultPriorStrength(bySlug: Map<string, number[]>): number {
  const counts = [...bySlug.values()].map((a) => a.length).sort((a, b) => a - b);
  if (counts.length === 0) return 0;
  const mid = Math.floor(counts.length / 2);
  return counts.length % 2 ? counts[mid] : (counts[mid - 1] + counts[mid]) / 2;
}

// IMDb-style weighted rating: (n*mean + C*globalMean) / (n + C).
export function bayesianScores(
  bySlug: Map<string, number[]>,
  C: number
): Map<string, number> {
  let total = 0;
  let n = 0;
  for (const arr of bySlug.values()) {
    for (const r of arr) total += r;
    n += arr.length;
  }
  const globalMean = n > 0 ? total / n : 0;
  const out = new Map<string, number>();
  for (const [slug, arr] of bySlug) {
    const k = arr.length;
    const mean = k > 0 ? arr.reduce((a, b) => a + b, 0) / k : 0;
    out.set(slug, (k * mean + C * globalMean) / (k + C || 1));
  }
  return out;
}
