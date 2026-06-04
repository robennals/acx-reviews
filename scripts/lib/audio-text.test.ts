import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  speechParagraphsFromMarkdown,
  groupIntoChunks,
  applyEquationSpeech,
} from './audio-text';

test('strips footnote references and skips footnote definitions', () => {
  const input = [
    'I was not expecting[^1] a book so technical.',
    '',
    '[^1]: A footnote that should not be read aloud.',
  ].join('\n');

  const paras = speechParagraphsFromMarkdown(input);

  assert.equal(paras.length, 1);
  assert.equal(paras[0], 'I was not expecting a book so technical.');
});

test('converts links to their text and strips emphasis markers', () => {
  const input =
    'Spermaceti is a [wax ester](https://en.wikipedia.org/wiki/Wax_ester) — _not_ a **true oil**.';

  const paras = speechParagraphsFromMarkdown(input);

  assert.equal(paras[0], 'Spermaceti is a wax ester — not a true oil.');
});

test('drops images but keeps surrounding paragraphs', () => {
  const input = [
    'Before the image.',
    '',
    '![](https://acximages.ennals.org/images/whale.png)',
    '',
    '(a very plausible scenario)',
  ].join('\n');

  const paras = speechParagraphsFromMarkdown(input);

  assert.deepEqual(paras, ['Before the image.', '(a very plausible scenario)']);
});

test('includes heading and blockquote text as their own paragraphs', () => {
  const input = [
    '## III. The Hunt',
    '',
    '> _All men live enveloped in whale-lines._ (Ch. 60, _The Line_)',
    '',
    'The craziness of whaling appears in its description.',
  ].join('\n');

  const paras = speechParagraphsFromMarkdown(input);

  assert.deepEqual(paras, [
    'III. The Hunt',
    'All men live enveloped in whale-lines. (Ch. 60, The Line)',
    'The craziness of whaling appears in its description.',
  ]);
});

test('groupIntoChunks packs consecutive paragraphs under maxChars without splitting any', () => {
  const paras = ['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(150), 'd'.repeat(40)];

  const chunks = groupIntoChunks(paras, 220);

  // 100+100 fits in 220; adding 150 would not; 150+40 fits.
  assert.equal(chunks.length, 2);
  assert.deepEqual(
    chunks[0].paragraphs.map((p) => p.index),
    [0, 1]
  );
  assert.deepEqual(
    chunks[1].paragraphs.map((p) => p.index),
    [2, 3]
  );
  assert.equal(chunks[0].text, 'a'.repeat(100) + '\n\n' + 'b'.repeat(100));
});

test('applyEquationSpeech replaces mapped equations with spoken English', () => {
  const map = {
    '$P(A|B)$': 'the probability of A given B',
    '$\\sigma^2$': 'sigma squared',
  };
  const input = 'Bayes tells us $P(A|B)$ depends on variance $\\sigma^2$.';

  const out = applyEquationSpeech(input, map);

  assert.equal(
    out,
    'Bayes tells us the probability of A given B depends on variance sigma squared.'
  );
});

test('applyEquationSpeech replaces longer equations first so prefixes do not shadow', () => {
  const map = {
    '$x$': 'x',
    '$x^2 + x$': 'x squared plus x',
  };

  const out = applyEquationSpeech('Consider $x^2 + x$ here.', map);

  assert.equal(out, 'Consider x squared plus x here.');
});

test('applyEquationSpeech leaves unmapped text alone', () => {
  const out = applyEquationSpeech('No math here at all.', { '$y$': 'y' });

  assert.equal(out, 'No math here at all.');
});

test('groupIntoChunks gives an oversized paragraph its own chunk', () => {
  const paras = ['short one', 'x'.repeat(500), 'short two'];

  const chunks = groupIntoChunks(paras, 200);

  assert.equal(chunks.length, 3);
  assert.equal(chunks[1].paragraphs[0].index, 1);
  assert.equal(chunks[1].text.length, 500);
});
