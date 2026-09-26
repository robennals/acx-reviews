import { fetch as directFetch } from 'undici';

/** Anonymous, bounded export fetch. Never fetch the user-supplied URL directly. */
export function documentUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('Paste a Google Docs sharing link.'); }
  const match = url.pathname.match(/^\/document\/(?:u\/\d+\/)?d\/([\w-]+)(?:\/(?:edit|view|preview))?\/?$/);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || url.username || url.password || !match) {
    throw new Error('Use a standard Google Docs sharing link, such as https://docs.google.com/document/d/…/edit.');
  }
  const id = match[1];
  const canonical = new URL(`https://docs.google.com/document/d/${id}/edit`);
  const resourceKey = url.searchParams.get('resourcekey');
  if (resourceKey && /^[\w-]{1,200}$/.test(resourceKey)) canonical.searchParams.set('resourcekey', resourceKey);
  return { id, url: canonical.toString(), resourceKey: canonical.searchParams.get('resourcekey') };
}

const MAX_BYTES = 20 * 1024 * 1024;
export async function fetchDocument(input: string, fetcher: typeof directFetch = directFetch) {
  const source = documentUrl(input);
  const url = new URL(`https://docs.google.com/document/d/${source.id}/export?format=html`);
  if (source.resourceKey) url.searchParams.set('resourcekey', source.resourceKey);
  const signal = AbortSignal.timeout(30_000);
  try {
    const response = await fetcher(url, { cache: 'no-store', redirect: 'manual', signal });
    if (response.status === 429) throw new Error('Google is receiving too many requests. Please try again shortly.');
    if (response.status >= 300 && response.status < 500) {
      throw new Error('Could not access this document. Set sharing to “Anyone with the link — Viewer” and allow downloads. The document may also have moved or been deleted. Redirects requiring sign-in are not supported.');
    }
    if (!response.ok) throw new Error('Google could not export the document. Please try again.');
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('This document is too large to preview (20 MB export limit).');
    if (!response.body) throw new Error('Google returned an empty document.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) throw new Error('This document is too large to preview (20 MB export limit).');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const html = Buffer.concat(chunks).toString('utf8');
    if (!/<body\b/i.test(html) || !/<style\b/i.test(html) || !/<(?:p|h1|table)\b/i.test(html)) {
      throw new Error('Google did not return a document export. Check sharing and download permissions.');
    }
    return { html, sourceUrl: source.url, fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (signal.aborted) throw new Error('Google took too long to export this document. Please try again.');
    if (error instanceof TypeError) throw new Error('Could not connect to Google Docs. Please try again.');
    throw error;
  }
}
