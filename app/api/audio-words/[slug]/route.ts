import { NextRequest, NextResponse } from 'next/server';
import { getReviewAudio } from '@/lib/server/audio-manifest';

/**
 * Same-origin proxy for narration word-timing JSON stored on R2.
 *
 * The R2 API token can't set bucket CORS config, so the browser can't fetch
 * the JSON cross-origin directly. (The MP3 needs no CORS: media elements
 * are exempt.) Responses are CDN-cached, so R2 sees few requests. If bucket
 * CORS is ever configured via the Cloudflare dashboard, this proxy can be
 * dropped by pointing the manifest's wordsUrl at r2WordsUrl directly.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const entry = getReviewAudio(slug);
  if (!entry?.r2WordsUrl) {
    return NextResponse.json({ error: 'No audio for this review' }, { status: 404 });
  }

  const upstream = await fetch(entry.r2WordsUrl, { cache: 'no-store' });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
