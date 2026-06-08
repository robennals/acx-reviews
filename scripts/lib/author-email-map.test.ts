import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorEmailMap, duplicateTitleSlugs } from './author-email-map';
import { slugify } from '../../lib/utils';

test('maps each title to its slug with author email + title', () => {
  const m = buildAuthorEmailMap([
    { name: 'A', email: 'a@x.co', title: 'On Liberty' },
    { name: 'B', email: 'b@x.co', title: 'The Republic' },
  ]);
  assert.equal(m.get(slugify('On Liberty'))?.email, 'a@x.co');
  assert.equal(m.get(slugify('On Liberty'))?.title, 'On Liberty');
  assert.equal(m.get(slugify('The Republic'))?.email, 'b@x.co');
});

test('skips rows with a blank email or blank title', () => {
  const m = buildAuthorEmailMap([
    { name: 'A', email: '', title: 'Has No Email' },
    { name: 'B', email: 'b@x.co', title: '' },
    { name: 'C', email: 'c@x.co', title: 'Good' },
  ]);
  assert.equal(m.size, 1);
  assert.equal(m.get(slugify('Good'))?.email, 'c@x.co');
});

test('later rows win on duplicate slug', () => {
  const m = buildAuthorEmailMap([
    { name: 'A', email: 'first@x.co', title: 'Dup' },
    { name: 'B', email: 'second@x.co', title: 'Dup' },
  ]);
  assert.equal(m.get(slugify('Dup'))?.email, 'second@x.co');
});

test('duplicateTitleSlugs returns slugs that appear more than once', () => {
  const dups = duplicateTitleSlugs([
    { name: 'A', email: 'a@x.co', title: 'Same Book' },
    { name: 'B', email: 'b@x.co', title: 'Same Book' },
    { name: 'C', email: 'c@x.co', title: 'Unique' },
  ]);
  assert.deepEqual([...dups], [slugify('Same Book')]);
});

test('duplicateTitleSlugs ignores blank-email/blank-title rows and returns empty when all unique', () => {
  const dups = duplicateTitleSlugs([
    { name: 'A', email: '', title: 'Same Book' },
    { name: 'B', email: 'b@x.co', title: 'Same Book' },
    { name: 'C', email: 'c@x.co', title: 'Unique' },
  ]);
  assert.equal(dups.size, 0);
});
