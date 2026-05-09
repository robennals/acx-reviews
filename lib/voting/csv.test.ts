import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ballotsToCsv } from './csv';

test('empty input → header row only', () => {
  assert.equal(
    ballotsToCsv([]),
    'voter_email,rank,review_title,review_slug\n'
  );
});

test('single row', () => {
  const csv = ballotsToCsv([
    { email: 'a@x.com', rank: 1, reviewTitle: 'Hello', reviewSlug: 'hello' },
  ]);
  assert.equal(
    csv,
    'voter_email,rank,review_title,review_slug\n' +
      'a@x.com,1,Hello,hello\n'
  );
});

test('escapes commas and quotes in title', () => {
  const csv = ballotsToCsv([
    { email: 'a@x.com', rank: 1, reviewTitle: 'A, "great" book', reviewSlug: 'a-great-book' },
  ]);
  assert.equal(
    csv,
    'voter_email,rank,review_title,review_slug\n' +
      'a@x.com,1,"A, ""great"" book",a-great-book\n'
  );
});

test('escapes newlines in title', () => {
  const csv = ballotsToCsv([
    { email: 'a@x.com', rank: 1, reviewTitle: 'Line one\nLine two', reviewSlug: 'multi' },
  ]);
  assert.equal(
    csv,
    'voter_email,rank,review_title,review_slug\n' +
      'a@x.com,1,"Line one\nLine two",multi\n'
  );
});

test('multiple rows in input order', () => {
  const csv = ballotsToCsv([
    { email: 'a@x.com', rank: 1, reviewTitle: 'A', reviewSlug: 'a' },
    { email: 'a@x.com', rank: 2, reviewTitle: 'B', reviewSlug: 'b' },
    { email: 'b@y.com', rank: 1, reviewTitle: 'C', reviewSlug: 'c' },
  ]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[1], 'a@x.com,1,A,a');
  assert.equal(lines[3], 'b@y.com,1,C,c');
});
