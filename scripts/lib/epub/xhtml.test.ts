import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlFragmentToXhtml, wrapXhtmlDocument, escapeXml } from './xhtml';

test('void elements are self-closed', () => {
  const out = htmlFragmentToXhtml('<p>line one<br>line two</p><img src="img/a.jpg" alt="">');
  assert.ok(out.includes('<br />') || out.includes('<br/>'), `br not closed: ${out}`);
  assert.match(out, /<img[^>]*\/>/);
});

test('unclosed tags are balanced', () => {
  const out = htmlFragmentToXhtml('<p>first<p>second');
  assert.equal((out.match(/<\/p>/g) ?? []).length, 2);
});

test('raw ampersands and named entities become XML-safe', () => {
  const out = htmlFragmentToXhtml('<p>fish &amp; chips &nbsp; done</p>');
  // No bare '&' and no non-XML named entities like &nbsp;
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(out), `unsafe entity in: ${out}`);
});

test('epub:type attribute survives round-trip', () => {
  const out = htmlFragmentToXhtml('<aside epub:type="footnote" id="fn-1"><p>note</p></aside>');
  assert.ok(out.includes('epub:type="footnote"'), out);
});

test('wrapXhtmlDocument produces full document with namespaces and css link', () => {
  const doc = wrapXhtmlDocument({ title: 'A & B', bodyHtml: '<p>hi</p>', cssHref: '../css/style.css' });
  assert.ok(doc.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
  assert.ok(doc.includes('xmlns="http://www.w3.org/1999/xhtml"'));
  assert.ok(doc.includes('xmlns:epub="http://www.idpf.org/2007/ops"'));
  assert.ok(doc.includes('<title>A &amp; B</title>'));
  assert.ok(doc.includes('href="../css/style.css"'));
  assert.ok(doc.includes('<p>hi</p>'));
});

test('escapeXml escapes the five specials', () => {
  assert.equal(escapeXml(`<&>"'`), '&lt;&amp;&gt;&quot;&apos;');
});
