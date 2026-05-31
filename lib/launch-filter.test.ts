import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hideUnlaunched } from './launch-filter';
import { parseVotingConfig } from './voting-period';

const config = parseVotingConfig({
  VOTING_CONTEST_YEAR: '2026',
  VOTING_CONTEST_TITLE: '2026 Book Reviews',
  VOTING_START: '2026-04-18T00:00:00Z',
  VOTING_END: '2026-06-15T00:00:00Z',
})!;

const items = [{ year: 2024 }, { year: 2025 }, { year: 2026 }];

test('hideUnlaunched drops the configured contest year when not live', () => {
  assert.deepEqual(hideUnlaunched(items, config, false), [{ year: 2024 }, { year: 2025 }]);
});

test('hideUnlaunched keeps everything when live', () => {
  assert.deepEqual(hideUnlaunched(items, config, true), items);
});

test('hideUnlaunched keeps everything when no config', () => {
  assert.deepEqual(hideUnlaunched(items, null, false), items);
});
