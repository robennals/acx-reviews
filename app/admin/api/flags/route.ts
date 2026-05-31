import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { setContestLive, SITE_FLAGS_TAG } from '@/lib/server/site-flags';

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { contestLive?: unknown };
  try {
    body = (await req.json()) as { contestLive?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (typeof body.contestLive !== 'boolean') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  await setContestLive(body.contestLive);
  revalidateTag(SITE_FLAGS_TAG);
  return NextResponse.json({ ok: true, contestLive: body.contestLive });
}
