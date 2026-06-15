import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VoteRecord } from './types';
import { analyzeSuspicion, driveByClusters } from './suspicion';

function v(email: string, slug: string, rating: number): VoteRecord {
  return { email, slug, rating, ratedAt: '2026-06-01T00:00:00Z' };
}

// A clean consensus: many reviewers agreeing on s1 high, s2 low.
function consensus(): VoteRecord[] {
  const out: VoteRecord[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(v(`good${i}`, 's1', 8));
    out.push(v(`good${i}`, 's2', 3));
    out.push(v(`good${i}`, 's3', 6));
    out.push(v(`good${i}`, 's4', 5));
    out.push(v(`good${i}`, 's5', 7));
  }
  return out;
}

test('single-spike: rated few, gave one a 10', () => {
  const votes = [...consensus(), v('spiker@x.com', 's2', 10)];
  const rows = analyzeSuspicion(votes);
  const spiker = rows.find((r) => r.email === 'spiker@x.com')!;
  assert.ok(spiker.flags.includes('single-spike'));
  assert.ok(spiker.score > 0);
});

test('low consensus correlation flags an anti-correlated reviewer', () => {
  // contrarian rates opposite to consensus across >=5 reviews
  const votes = [
    ...consensus(),
    v('contra@x.com', 's1', 1),
    v('contra@x.com', 's2', 10),
    v('contra@x.com', 's3', 1),
    v('contra@x.com', 's4', 9),
    v('contra@x.com', 's5', 2),
  ];
  const rows = analyzeSuspicion(votes);
  const contra = rows.find((r) => r.email === 'contra@x.com')!;
  assert.ok(contra.flags.includes('low-correlation'));
});

test('a normal consensus voter is not flagged', () => {
  const rows = analyzeSuspicion(consensus());
  const normal = rows.find((r) => r.email === 'good0')!;
  assert.deepEqual(normal.flags, []);
});

test('driveByClusters counts single-vote 9-10 ballots per review', () => {
  const votes = [
    ...consensus(),
    v('drive1@x.com', 's2', 10),
    v('drive2@x.com', 's2', 9),
    v('drive3@x.com', 's2', 10),
  ];
  const clusters = driveByClusters(votes);
  const s2 = clusters.find((c) => c.slug === 's2')!;
  assert.equal(s2.driveByCount, 3);
});
