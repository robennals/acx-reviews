import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { feedback } from '@/lib/db/schema';
import {
  FEEDBACK_CONTEST_YEAR,
  FEEDBACK_NAME_MAX,
  FEEDBACK_MESSAGE_MAX,
} from '@/lib/constants';

export interface StoredFeedback {
  senderName: string;
  message: string;
  sent: boolean;
  updatedAt: number;
}

export type UpsertResult =
  | { ok: true; feedback: StoredFeedback }
  | { ok: false; reason: 'wrong_contest' | 'invalid_name' | 'invalid_message' | 'already_sent' };

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_sent' };

interface UpsertOpts {
  userId: string;
  reviewSlug: string;
  senderName: string;
  message: string;
  reviewYear: number;
  now?: Date;
}

export async function upsertFeedback(db: DB, opts: UpsertOpts): Promise<UpsertResult> {
  if (opts.reviewYear !== FEEDBACK_CONTEST_YEAR) {
    return { ok: false, reason: 'wrong_contest' };
  }
  const name = opts.senderName.trim();
  if (!name || name.length > FEEDBACK_NAME_MAX) {
    return { ok: false, reason: 'invalid_name' };
  }
  const message = opts.message.trim();
  if (!message || message.length > FEEDBACK_MESSAGE_MAX) {
    return { ok: false, reason: 'invalid_message' };
  }

  const where = and(
    eq(feedback.userId, opts.userId),
    eq(feedback.reviewSlug, opts.reviewSlug)
  );
  const existing = (await db.select().from(feedback).where(where).limit(1))[0];
  if (existing?.sentAt) {
    return { ok: false, reason: 'already_sent' };
  }

  const now = opts.now ?? new Date();
  if (existing) {
    await db.update(feedback).set({ senderName: name, message, updatedAt: now }).where(where);
  } else {
    await db.insert(feedback).values({
      userId: opts.userId,
      reviewSlug: opts.reviewSlug,
      senderName: name,
      message,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    ok: true,
    feedback: { senderName: name, message, sent: false, updatedAt: now.getTime() },
  };
}

export async function getFeedback(
  db: DB,
  opts: { userId: string; reviewSlug: string }
): Promise<StoredFeedback | null> {
  const row = (
    await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.userId, opts.userId), eq(feedback.reviewSlug, opts.reviewSlug)))
      .limit(1)
  )[0];
  if (!row) return null;
  return {
    senderName: row.senderName,
    message: row.message,
    sent: row.sentAt !== null,
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function deleteFeedback(
  db: DB,
  opts: { userId: string; reviewSlug: string }
): Promise<DeleteResult> {
  const where = and(
    eq(feedback.userId, opts.userId),
    eq(feedback.reviewSlug, opts.reviewSlug)
  );
  const existing = (await db.select().from(feedback).where(where).limit(1))[0];
  if (!existing) return { ok: false, reason: 'not_found' };
  if (existing.sentAt) return { ok: false, reason: 'already_sent' };
  await db.delete(feedback).where(where);
  return { ok: true };
}
