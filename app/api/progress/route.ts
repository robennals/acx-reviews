import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { progress } from '@/lib/db/schema';
import type { ProgressStatus } from '@/lib/sync';

interface Body {
  entries?: { reviewId: string; status: ProgressStatus | 'unread' }[];
}

const VALID_STATUSES = new Set(['in_progress', 'finished', 'unread']);

// POST /api/progress — upsert/delete progress rows for the signed-in user.
// Accepts a batch of { reviewId, status }. status='unread' deletes the row.
// Idempotent: status='finished' over an existing 'finished' is a no-op.
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

  for (const e of entries) {
    if (!e?.reviewId || !VALID_STATUSES.has(e.status)) continue;
    if (e.status === 'unread') {
      await db
        .delete(progress)
        .where(and(eq(progress.userId, userId), eq(progress.reviewId, e.reviewId)));
      continue;
    }
    await db
      .insert(progress)
      .values({
        userId,
        reviewId: e.reviewId,
        status: e.status,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.reviewId],
        set: { status: e.status, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true });
}
