import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ratingsToCsv } from './csv';

test('empty input → header row only', () => {
  assert.equal(
    ratingsToCsv([]),
    'voter_email,rating,review_title,review_slug,rated_at\n'
  );
});

test('single row', () => {
  const csv = ratingsToCsv([
    {
      email: 'a@x.com',
      rating: 8,
      reviewTitle: 'Hello',
      reviewSlug: 'hello',
      ratedAt: '2026-04-15T12:00:00Z',
    },
  ]);
  assert.equal(
    csv,
    'voter_email,rating,review_title,review_slug,rated_at\n' +
      'a@x.com,8,Hello,hello,2026-04-15T12:00:00Z\n'
  );
});

test('escapes commas and quotes in title', () => {
  const csv = ratingsToCsv([
    {
      email: 'a@x.com',
      rating: 9,
      reviewTitle: 'A, "great" book',
      reviewSlug: 'a-great-book',
      ratedAt: '2026-04-15T12:00:00Z',
    },
  ]);
  assert.equal(
    csv,
    'voter_email,rating,review_title,review_slug,rated_at\n' +
      'a@x.com,9,"A, ""great"" book",a-great-book,2026-04-15T12:00:00Z\n'
  );
});

test('escapes newlines in title', () => {
  const csv = ratingsToCsv([
    {
      email: 'a@x.com',
      rating: 5,
      reviewTitle: 'Line one\nLine two',
      reviewSlug: 'multi',
      ratedAt: '2026-04-15T12:00:00Z',
    },
  ]);
  assert.equal(
    csv,
    'voter_email,rating,review_title,review_slug,rated_at\n' +
      'a@x.com,5,"Line one\nLine two",multi,2026-04-15T12:00:00Z\n'
  );
});

test('multiple rows in input order', () => {
  const csv = ratingsToCsv([
    { email: 'a@x.com', rating: 10, reviewTitle: 'A', reviewSlug: 'a', ratedAt: '2026-04-15T12:00:00Z' },
    { email: 'a@x.com', rating: 7, reviewTitle: 'B', reviewSlug: 'b', ratedAt: '2026-04-14T12:00:00Z' },
    { email: 'b@y.com', rating: 9, reviewTitle: 'C', reviewSlug: 'c', ratedAt: '2026-04-13T12:00:00Z' },
  ]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[1], 'a@x.com,10,A,a,2026-04-15T12:00:00Z');
  assert.equal(lines[3], 'b@y.com,9,C,c,2026-04-13T12:00:00Z');
});
