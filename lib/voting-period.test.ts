import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVotingConfig,
  isVotingOpen,
  isReviewVotable,
} from './voting-period';

const fullEnv = {
  VOTING_CONTEST_YEAR: '2025',
  VOTING_CONTEST_TITLE: '2025 Non-Book Reviews',
  VOTING_START: '2026-04-01T00:00:00Z',
  VOTING_END: '2026-05-01T00:00:00Z',
};

test('parseVotingConfig returns null when any var is missing', () => {
  for (const key of Object.keys(fullEnv)) {
    const env = { ...fullEnv, [key]: undefined };
    assert.equal(parseVotingConfig(env), null, `expected null when ${key} missing`);
  }
});

test('parseVotingConfig returns null on bad year', () => {
  assert.equal(parseVotingConfig({ ...fullEnv, VOTING_CONTEST_YEAR: 'twenty-twenty-five' }), null);
});

test('parseVotingConfig returns null on bad date', () => {
  assert.equal(parseVotingConfig({ ...fullEnv, VOTING_START: 'tomorrow' }), null);
});

test('parseVotingConfig returns null when end <= start', () => {
  assert.equal(
    parseVotingConfig({
      ...fullEnv,
      VOTING_START: '2026-05-02T00:00:00Z',
      VOTING_END: '2026-05-01T00:00:00Z',
    }),
    null
  );
});

test('parseVotingConfig succeeds with all four set', () => {
  const c = parseVotingConfig(fullEnv);
  assert.ok(c);
  assert.equal(c!.contestYear, 2025);
  assert.equal(c!.contestTitle, '2025 Non-Book Reviews');
  assert.equal(c!.start.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(c!.end.toISOString(), '2026-05-01T00:00:00.000Z');
});

test('isVotingOpen handles boundaries: inclusive start, exclusive end', () => {
  const c = parseVotingConfig(fullEnv)!;
  assert.equal(isVotingOpen(c, new Date('2026-03-31T23:59:59Z')), false);
  assert.equal(isVotingOpen(c, new Date('2026-04-01T00:00:00Z')), true);
  assert.equal(isVotingOpen(c, new Date('2026-04-15T12:00:00Z')), true);
  assert.equal(isVotingOpen(c, new Date('2026-04-30T23:59:59Z')), true);
  assert.equal(isVotingOpen(c, new Date('2026-05-01T00:00:00Z')), false);
  assert.equal(isVotingOpen(null, new Date()), false);
});

test('isReviewVotable requires both open and matching year', () => {
  const c = parseVotingConfig(fullEnv)!;
  const inWindow = new Date('2026-04-15T12:00:00Z');
  const outOfWindow = new Date('2026-06-01T00:00:00Z');
  assert.equal(isReviewVotable(c, 2025, inWindow), true);
  assert.equal(isReviewVotable(c, 2024, inWindow), false);
  assert.equal(isReviewVotable(c, 2025, outOfWindow), false);
  assert.equal(isReviewVotable(null, 2025, inWindow), false);
});
