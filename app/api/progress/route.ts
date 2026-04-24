import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getAllReviewIds } from '@/lib/reviews';
import { applyProgressEntries, type ProgressEntry } from '@/lib/api/progress-logic';

interface Body {
  entries?: ProgressEntry[];
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const entries = body.entries ?? [];
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: 'invalid_entries' }, { status: 400 });
  }

  const knownIds = await getAllReviewIds();
  await applyProgressEntries(db, { userId, entries, knownIds });
  return NextResponse.json({ ok: true });
}
