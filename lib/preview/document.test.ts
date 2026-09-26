import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentUrl, fetchDocument } from './document';
const url = 'https://docs.google.com/document/d/abc123/edit?tab=t.0';
test('accepts ordinary Google Docs links and rejects lookalikes and published links', () => {
  assert.equal(documentUrl(url).id, 'abc123');
  for (const bad of ['https://docs.google.com.evil.com/document/d/abc/edit', 'http://localhost/', 'https://docs.google.com/document/d/e/abc/pub', 'https://user:pass@docs.google.com/document/d/abc/edit']) {
    assert.throws(() => documentUrl(bad));
  }
});
test('detects inaccessible and non-document successful responses', async () => {
  await assert.rejects(fetchDocument(url, async () => new Response('', { status: 403 })), /access|sharing/i);
  await assert.rejects(fetchDocument(url, async () => new Response('<html>Sign in</html>')), /document|access/i);
});
test('does not follow arbitrary redirects or accept oversized exports', async () => {
  await assert.rejects(fetchDocument(url, async () => new Response('', { status: 302, headers: { location: 'http://127.0.0.1/' } })), /redirect|access/i);
  await assert.rejects(fetchDocument(url, async () => new Response('x', { headers: { 'content-length': '999999999' } })), /large/i);
});
