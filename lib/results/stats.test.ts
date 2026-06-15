import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VoteRecord } from './types';
import {
  ratingsBySlug,
  coverageDistribution,
  scoreDistribution,
  rawMeanCI,
} from './stats';

function v(email: string, slug: string, rating: number): VoteRecord {
  return { email, slug, rating, ratedAt: '2026-06-01T00:00:00Z' };
}

test('ratingsBySlug groups ratings', () => {
  const m = ratingsBySlug([v('a', 's1', 5), v('b', 's1', 7), v('a', 's2', 3)]);
  assert.deepEqual(m.get('s1'), [5, 7]);
  assert.deepEqual(m.get('s2'), [3]);
});

test('coverageDistribution counts reviews per exact vote count, incl zero', () => {
  // s1 has 2 votes, s2 has 1, s3 (in allSlugs) has 0.
  const votes = [v('a', 's1', 5), v('b', 's1', 6), v('a', 's2', 4)];
  const dist = coverageDistribution(votes, ['s1', 's2', 's3']);
  // dist[x].reviews = number of reviews with exactly x votes
  assert.equal(dist[0].reviews, 1); // s3
  assert.equal(dist[1].reviews, 1); // s2
  assert.equal(dist[2].reviews, 1); // s1
  // Every point carries a smoothed value.
  assert.ok(typeof dist[0].smooth === 'number');
});

test('scoreDistribution counts each rating 1..10 and sums to total', () => {
  const votes = [v('a', 's1', 1), v('b', 's1', 1), v('c', 's2', 10)];
  const dist = scoreDistribution(votes);
  assert.equal(dist.length, 10);
  assert.equal(dist[0].score, 1);
  assert.equal(dist[0].count, 2);
  assert.equal(dist[9].count, 1);
  assert.equal(dist.reduce((a, p) => a + p.count, 0), 3);
});

test('rawMeanCI computes mean and a CI that narrows with n', () => {
  const few = rawMeanCI([4, 6]);
  assert.equal(few.mean, 5);
  const many = rawMeanCI([4, 6, 4, 6, 4, 6, 4, 6]);
  assert.equal(many.mean, 5);
  assert.ok(many.ciHigh - many.ciLow < few.ciHigh - few.ciLow, 'CI narrows with n');
});

test('rawMeanCI with n=1 returns a degenerate interval', () => {
  const one = rawMeanCI([7]);
  assert.equal(one.mean, 7);
  assert.equal(one.ciLow, 7);
  assert.equal(one.ciHigh, 7);
});

import { uniformizeBallot, normalizedScores } from './stats';

test('uniformizeBallot maps a ballot to midrank uniform values', () => {
  // ascending ratings -> ascending uniform values (rank-0.5)/k
  assert.deepEqual(uniformizeBallot([2, 5, 9]), [
    (1 - 0.5) / 3,
    (2 - 0.5) / 3,
    (3 - 0.5) / 3,
  ]);
});

test('uniformizeBallot gives all-equal ratings the neutral 0.5', () => {
  assert.deepEqual(uniformizeBallot([7, 7, 7]), [0.5, 0.5, 0.5]);
});

test('uniformizeBallot: single vote is neutral 0.5', () => {
  assert.deepEqual(uniformizeBallot([3]), [0.5]);
});

test('normalizedScores averages per-reviewer uniform values per review', () => {
  // Reviewer A: s1=10, s2=1 -> uniform s1=0.75, s2=0.25
  // Reviewer B: s1=1, s2=10 -> uniform s1=0.25, s2=0.75
  const votes: VoteRecord[] = [
    v('A', 's1', 10), v('A', 's2', 1),
    v('B', 's1', 1), v('B', 's2', 10),
  ];
  const m = normalizedScores(votes);
  assert.ok(Math.abs((m.get('s1') ?? 0) - 0.5) < 1e-9);
  assert.ok(Math.abs((m.get('s2') ?? 0) - 0.5) < 1e-9);
});

import { defaultPriorStrength, bayesianScores } from './stats';

test('defaultPriorStrength is the median votes-per-review', () => {
  const ratings = new Map<string, number[]>([
    ['s1', [5]],
    ['s2', [5, 5, 5]],
    ['s3', [5, 5, 5, 5, 5]],
  ]);
  assert.equal(defaultPriorStrength(ratings), 3);
});

test('bayesianScores pulls thin reviews toward the global mean', () => {
  // global mean is ~5.5. s1 has one 10 (thin), s2 has ten 10s (heavy).
  const votes: VoteRecord[] = [v('a', 's1', 10)];
  for (let i = 0; i < 10; i++) votes.push(v(`u${i}`, 's2', 10));
  for (let i = 0; i < 10; i++) votes.push(v(`w${i}`, 's3', 1)); // anchors global mean lower
  const by = ratingsBySlug(votes);
  const scores = bayesianScores(by, 5);
  assert.ok((scores.get('s1') ?? 0) < (scores.get('s2') ?? 0), 'thin pulled below heavy');
  assert.ok((scores.get('s1') ?? 0) < 10, 'thin shrunk below its raw mean of 10');
});

test('bayesianScores with C=0 recovers the raw mean', () => {
  const by = ratingsBySlug([v('a', 's1', 4), v('b', 's1', 8)]);
  assert.ok(Math.abs((bayesianScores(by, 0).get('s1') ?? 0) - 6) < 1e-9);
});

import { twoWayModel, assembleRankings } from './stats';

test('twoWayModel recovers review-quality ordering after removing reviewer bias', () => {
  // True qualities q(s1)=2 > q(s2)=0 > q(s3)=-2 around mu=5.5.
  // Reviewer L is lenient (+2), reviewer H is harsh (-2). Each rates all three.
  const mu = 5.5;
  const q: Record<string, number> = { s1: 2, s2: 0, s3: -2 };
  const bias: Record<string, number> = { L: 2, H: -2 };
  const votes: VoteRecord[] = [];
  for (const email of ['L', 'H']) {
    for (const slug of ['s1', 's2', 's3']) {
      votes.push(v(email, slug, mu + q[slug] + bias[email]));
    }
  }
  const { quality } = twoWayModel(votes, { shrinkage: 0, iterations: 200 });
  assert.ok((quality.get('s1') ?? 0) > (quality.get('s2') ?? 0));
  assert.ok((quality.get('s2') ?? 0) > (quality.get('s3') ?? 0));
});

test('assembleRankings returns one row per voted review with all four metrics', () => {
  const votes: VoteRecord[] = [
    v('A', 's1', 9), v('B', 's1', 8),
    v('A', 's2', 4), v('B', 's2', 5),
  ];
  const refs = [
    { slug: 's1', title: 'One' },
    { slug: 's2', title: 'Two' },
    { slug: 's3', title: 'Unvoted' },
  ];
  const rows = assembleRankings(votes, refs);
  // Only voted reviews appear in the ranking rows.
  assert.equal(rows.length, 2);
  const s1 = rows.find((r) => r.slug === 's1')!;
  assert.equal(s1.title, 'One');
  assert.equal(s1.n, 2);
  assert.ok(s1.mean > 0 && s1.normalized >= 0 && typeof s1.bayesian === 'number');
  assert.ok(typeof s1.adjusted === 'number');
  // ranks present per method
  assert.ok(s1.ranks.mean >= 1 && s1.ranks.adjusted >= 1);
});
