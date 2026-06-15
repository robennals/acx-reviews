import type { VoteRecord, ReviewRef } from './types';
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

// Two-way additive model rating_ij ≈ mu + quality_i + bias_j, fit by
// alternating mean updates. Optional shrinkage pulls thin reviews' quality
// toward 0 by factor n/(n+shrinkage).
export function twoWayModel(
  votes: VoteRecord[],
  opts?: { shrinkage?: number; iterations?: number }
): { mu: number; quality: Map<string, number>; bias: Map<string, number> } {
  const shrinkage = opts?.shrinkage ?? 5;
  const iterations = opts?.iterations ?? 100;

  const bySlug = new Map<string, VoteRecord[]>();
  const byEmail = new Map<string, VoteRecord[]>();
  let total = 0;
  for (const r of votes) {
    total += r.rating;
    const sArr = bySlug.get(r.slug);
    if (sArr) sArr.push(r); else bySlug.set(r.slug, [r]);
    const eArr = byEmail.get(r.email);
    if (eArr) eArr.push(r); else byEmail.set(r.email, [r]);
  }
  const mu = votes.length ? total / votes.length : 0;

  const quality = new Map<string, number>();
  const bias = new Map<string, number>();
  for (const s of bySlug.keys()) quality.set(s, 0);
  for (const e of byEmail.keys()) bias.set(e, 0);

  for (let iter = 0; iter < iterations; iter++) {
    // Update reviewer bias = mean residual (rating - mu - quality) per reviewer.
    for (const [email, recs] of byEmail) {
      let acc = 0;
      for (const r of recs) acc += r.rating - mu - (quality.get(r.slug) ?? 0);
      bias.set(email, acc / recs.length);
    }
    // Update review quality = shrunken mean residual (rating - mu - bias) per review.
    let maxDelta = 0;
    for (const [slug, recs] of bySlug) {
      let acc = 0;
      for (const r of recs) acc += r.rating - mu - (bias.get(r.email) ?? 0);
      const raw = acc / recs.length;
      const shrunk = raw * (recs.length / (recs.length + shrinkage));
      maxDelta = Math.max(maxDelta, Math.abs(shrunk - (quality.get(slug) ?? 0)));
      quality.set(slug, shrunk);
    }
    // Quality is updated last each pass, so its convergence implies bias has
    // also settled — checking quality alone is a sufficient stopping condition.
    if (maxDelta < 1e-7) break;
  }
  return { mu, quality, bias };
}

export interface RankedReview {
  slug: string;
  title: string;
  n: number;
  mean: number;
  ciLow: number;
  ciHigh: number;
  normalized: number;
  bayesian: number;
  adjusted: number; // mu + quality
  ranks: { mean: number; normalized: number; bayesian: number; adjusted: number };
}

function rankMap(rows: { slug: string; value: number }[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.value - a.value || a.slug.localeCompare(b.slug));
  const ranks = new Map<string, number>();
  sorted.forEach((r, i) => ranks.set(r.slug, i + 1));
  return ranks;
}

// Build one ranked row per voted review, with all four metrics and each
// review's rank under each method. `refs` supplies display titles.
export function assembleRankings(
  votes: VoteRecord[],
  refs: ReviewRef[]
): RankedReview[] {
  const titleOf = new Map(refs.map((r) => [r.slug, r.title]));
  const bySlug = ratingsBySlug(votes);
  const normalized = normalizedScores(votes);
  const bayesian = bayesianScores(bySlug, defaultPriorStrength(bySlug));
  const { mu, quality } = twoWayModel(votes);

  const base: RankedReview[] = [];
  for (const [slug, ratings] of bySlug) {
    const ci = rawMeanCI(ratings);
    base.push({
      slug,
      title: titleOf.get(slug) ?? slug,
      n: ci.n,
      mean: ci.mean,
      ciLow: ci.ciLow,
      ciHigh: ci.ciHigh,
      normalized: normalized.get(slug) ?? 0,
      bayesian: bayesian.get(slug) ?? 0,
      adjusted: mu + (quality.get(slug) ?? 0),
      ranks: { mean: 0, normalized: 0, bayesian: 0, adjusted: 0 },
    });
  }

  const rMean = rankMap(base.map((r) => ({ slug: r.slug, value: r.mean })));
  const rNorm = rankMap(base.map((r) => ({ slug: r.slug, value: r.normalized })));
  const rBayes = rankMap(base.map((r) => ({ slug: r.slug, value: r.bayesian })));
  const rAdj = rankMap(base.map((r) => ({ slug: r.slug, value: r.adjusted })));
  for (const row of base) {
    row.ranks = {
      mean: rMean.get(row.slug) ?? 0,
      normalized: rNorm.get(row.slug) ?? 0,
      bayesian: rBayes.get(row.slug) ?? 0,
      adjusted: rAdj.get(row.slug) ?? 0,
    };
  }
  // Default sort: Bayesian (the headline robust ranking), best first.
  base.sort((a, b) => b.bayesian - a.bayesian || a.slug.localeCompare(b.slug));
  return base;
}

// --- fraud filter ---

// Votes from "solo high" voters — people whose entire ballot is a single 9 or
// 10 — are a common low-effort / ballot-stuffing pattern (a vote for one review
// and nothing else, at the top of the scale). This drops every such voter's
// votes. Voters with a lone low/mid rating are kept (not a stuffing signal).
export function excludeSoloHighVotes(
  votes: VoteRecord[],
  highThreshold = 9
): VoteRecord[] {
  const byEmail = ratingsByEmail(votes);
  const drop = new Set<string>();
  for (const [email, recs] of byEmail) {
    if (recs.length === 1 && recs[0].rating >= highThreshold) drop.add(email);
  }
  return votes.filter((v) => !drop.has(v.email));
}

// --- coverage buckets (clustered, drill-down) ---

export interface BucketReview {
  slug: string;
  title: string;
  votes: number;
  mean: number | null; // null when the review got no votes
}

export interface CoverageBucket {
  label: string;
  min: number;
  max: number; // Infinity for the open-ended top bucket
  count: number;
  reviews: BucketReview[];
}

// Cluster ranges for the votes-per-review distribution. The exact-count view is
// noisy; these buckets give a readable shape while still letting the reader
// drill into any cluster to see which reviews landed there and how they scored.
const COVERAGE_BUCKET_RANGES: readonly { label: string; min: number; max: number }[] =
  Object.freeze([
    { label: '0–10', min: 0, max: 10 },
    { label: '11–20', min: 11, max: 20 },
    { label: '21–50', min: 21, max: 50 },
    { label: '51+', min: 51, max: Infinity },
  ]);

// Group every contest review into a vote-count bucket, carrying each review's
// vote count and mean score so a reader can see whether low-interest reviews
// also scored poorly. `refs` is the full contest review list (so zero-vote
// reviews appear in the '0' bucket).
export function coverageBuckets(
  votes: VoteRecord[],
  refs: ReviewRef[]
): CoverageBucket[] {
  const bySlug = ratingsBySlug(votes);
  const reviews: BucketReview[] = refs.map((r) => {
    const ratings = bySlug.get(r.slug) ?? [];
    const n = ratings.length;
    return {
      slug: r.slug,
      title: r.title,
      votes: n,
      mean: n ? ratings.reduce((a, b) => a + b, 0) / n : null,
    };
  });
  return COVERAGE_BUCKET_RANGES.map((b) => {
    const inBucket = reviews
      .filter((rv) => rv.votes >= b.min && rv.votes <= b.max)
      .sort((a, c) => c.votes - a.votes || (c.mean ?? 0) - (a.mean ?? 0));
    return { label: b.label, min: b.min, max: b.max, count: inBucket.length, reviews: inBucket };
  });
}
