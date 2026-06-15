import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVotesCsv } from './csv';

test('parses simple rows', () => {
  const csv =
    'voter_email,rating,review_title,review_slug,rated_at\n' +
    'a@x.com,7,The Son Also Rises,the-son-also-rises,2026-06-14T22:30:47Z\n';
  const rows = parseVotesCsv(csv);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    email: 'a@x.com',
    rating: 7,
    slug: 'the-son-also-rises',
    ratedAt: '2026-06-14T22:30:47Z',
  });
});

test('handles quoted titles containing commas', () => {
  const csv =
    'voter_email,rating,review_title,review_slug,rated_at\n' +
    'b@x.com,6,"Montaillou: Cathars and Catholics, 1294-1324",montaillou,2026-06-08T07:22:45Z\n';
  const rows = parseVotesCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'montaillou');
  assert.equal(rows[0].rating, 6);
});

test('tolerates a trailing newline and blank lines', () => {
  const csv =
    'voter_email,rating,review_title,review_slug,rated_at\n' +
    'a@x.com,5,T,t,2026-06-01T00:00:00Z\n\n';
  assert.equal(parseVotesCsv(csv).length, 1);
});

test('throws on a row with too few fields', () => {
  const csv = 'voter_email,rating,review_title,review_slug,rated_at\nbad,row\n';
  assert.throws(() => parseVotesCsv(csv), /malformed/i);
});
