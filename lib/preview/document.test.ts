import { Response } from 'undici';
import { ReadableStream } from 'node:stream/web';
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

test('exports only the canonical Google endpoint, preserves resource keys, and returns the document', async () => {
  const html = '<html><head><style>p{color:black}</style></head><body><p>Review text</p></body></html>';
  const before = Date.now();
  const result = await fetchDocument('https://docs.google.com/document/u/0/d/abc123/edit?resourcekey=key123&tab=t.0', async (input, options) => {
    assert.equal(String(input), 'https://docs.google.com/document/d/abc123/export?format=html&resourcekey=key123');
    assert.equal(options?.redirect, 'manual');
    assert.equal(options?.cache, 'no-store');
    assert.ok(options?.signal);
    return new Response(html);
  });
  assert.equal(result.html, html);
  assert.equal(result.sourceUrl, 'https://docs.google.com/document/d/abc123/edit?resourcekey=key123');
  assert.ok(Date.parse(result.fetchedAt) >= before);
});

test('enforces the download limit even when Google omits Content-Length', async () => {
  let cancelled = false;
  await assert.rejects(fetchDocument(url, async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(20 * 1024 * 1024 + 1)); },
    cancel() { cancelled = true; },
  }))), /large/i);
  assert.equal(cancelled, true);
});
