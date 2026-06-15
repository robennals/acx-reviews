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
