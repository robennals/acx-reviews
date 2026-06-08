# Secret Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in readers send feedback to 2026 review authors — stored during the contest, shown back to the sender, and emailed (single message, author BCC'd) only after the contest via a local script — so author anonymity is preserved during judging.

**Architecture:** A new `feedback` table (one row per user+review, composite PK) stores submissions. A `/api/feedback` route (GET/POST/DELETE, auth-gated, rate-limited) backs a client `FeedbackCard` on 2026 review pages. No author email ever reaches the deployed app. A local `scripts/send-feedback.ts` reads unsent rows + the private submissions CSV, maps slug→author email, and sends one Postmark email per feedback (`To:` sender, `Bcc:` author, `Reply-To:` sender), stamping `sent_at`.

**Tech Stack:** Next.js 15 App Router, Drizzle + libSQL/Turso, Auth.js v5, Postmark, node:test via tsx.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/db/schema.ts` (modify) | Add `feedback` table |
| `lib/db/migrations/0004_secret_feedback.sql` (create) | Hand-written migration (consumed by `createTestDb` + `db:push` parity) |
| `lib/constants.ts` (modify) | Add `FEEDBACK_CONTEST_YEAR`, length limits |
| `lib/feedback/feedback-email.ts` (create) | Pure email body builder |
| `lib/feedback/feedback-email.test.ts` (create) | Builder tests |
| `lib/api/feedback-logic.ts` (create) | Pure validation + DB upsert/get/delete |
| `lib/api/feedback-logic.test.ts` (create) | Logic tests (in-memory DB) |
| `app/api/feedback/route.ts` (create) | GET/POST/DELETE, auth + rate limit |
| `components/feedback-card.tsx` (create) | Client form + saved-state UI |
| `app/reviews/[slug]/page.tsx` (modify) | Mount `<FeedbackCard>` |
| `scripts/lib/author-email-map.ts` (create) | Pure slug→author-email map builder |
| `scripts/lib/author-email-map.test.ts` (create) | Map builder tests |
| `lib/feedback/feedback-sender-postmark.ts` (create) | Thin Postmark send wrapper |
| `scripts/send-feedback.ts` (create) | Local post-contest send script |

**Conventions to follow (already in repo):**
- API routes read `userId` via `const session = await auth(); const userId = (session?.user as { id?: string } | undefined)?.id;` and return `401 { error: 'unauthorized' }` when absent (see `app/api/votes/rating/route.ts`).
- Rate limiting uses `checkRateLimit(makeDbRateLimitStore(db), { key, max, windowMs })` (see `app/api/auth/pin/request/route.ts`).
- Pure logic modules live in `lib/api/*-logic.ts` and take `db: DB` as the first arg (see `lib/api/favorites-logic.ts`).
- DB-touching tests use `createTestDb()` from `lib/db/test-db.ts`, which applies every `lib/db/migrations/*.sql` file — so the migration SQL is required for tests to see the table.
- Unit tests are discovered by `pnpm test:unit` = `tsx --test lib/*.test.ts lib/**/*.test.ts scripts/lib/**/*.test.ts`. Test files MUST live under those globs.

---

## Task 1: Add the `feedback` table (schema + migration)

**Files:**
- Modify: `lib/db/schema.ts` (append after the `favorites` table, before `siteFlags`)
- Create: `lib/db/migrations/0004_secret_feedback.sql`

- [ ] **Step 1: Add the table to the Drizzle schema**

Append to `lib/db/schema.ts` (after the `favorites` table block, ~line 116). `primaryKey` and `index` are already imported at the top of the file.

```ts
// Feedback from a signed-in reader to a review's author. One row per
// (user, review). Stored during the contest; emailed only afterward by
// scripts/send-feedback.ts, which stamps sent_at. Editable/deletable while
// sent_at is null.
export const feedback = sqliteTable(
  'feedback',
  {
    userId: text('sender_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewSlug: text('review_slug').notNull(),
    senderName: text('sender_name').notNull(),
    message: text('message').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reviewSlug] })]
);
```

- [ ] **Step 2: Write the migration SQL**

Create `lib/db/migrations/0004_secret_feedback.sql` with exactly:

```sql
CREATE TABLE `feedback` (
	`sender_user_id` text NOT NULL,
	`review_slug` text NOT NULL,
	`sender_name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sent_at` integer,
	PRIMARY KEY(`sender_user_id`, `review_slug`),
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
```

- [ ] **Step 3: Verify the migration loads in the test harness**

Run: `pnpm exec tsx -e "import('./lib/db/test-db.ts').then(m => m.createTestDb()).then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })"`
Expected: prints `OK` (no SQL error — proves the new migration parses and applies).

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/0004_secret_feedback.sql
git commit -m "feat(db): add feedback table"
```

> Note: applying to the real Turso DB (`pnpm db:push`) is a deploy-time step the maintainer runs; not part of this task.

---

## Task 2: Constants

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add feedback constants**

Append to `lib/constants.ts`:

```ts
// Feedback feature: only 2026 reviews have author contact data, so the
// feedback form is offered for that contest year only.
export const FEEDBACK_CONTEST_YEAR = 2026;
export const FEEDBACK_NAME_MAX = 100;
export const FEEDBACK_MESSAGE_MAX = 5000;
```

- [ ] **Step 2: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add feedback constants"
```

---

## Task 3: Pure email body builder

**Files:**
- Create: `lib/feedback/feedback-email.ts`
- Test: `lib/feedback/feedback-email.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/feedback/feedback-email.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackEmail } from './feedback-email';

test('subject mentions the review title', () => {
  const m = buildFeedbackEmail({ senderName: 'Alice', reviewTitle: 'On Liberty', message: 'Loved it' });
  assert.match(m.subject, /On Liberty/);
});

test('text body contains the neutral anonymity header with sender + title', () => {
  const m = buildFeedbackEmail({ senderName: 'Alice', reviewTitle: 'On Liberty', message: 'Great work' });
  assert.match(m.text, /This message from Alice was sent to the author of On Liberty/);
  assert.match(m.text, /hidden to preserve their anonymity/);
  assert.match(m.text, /Great work/);
});

test('html body escapes the message and sender name', () => {
  const m = buildFeedbackEmail({ senderName: 'A <b>', reviewTitle: 'T', message: '1 < 2 & 3 > 0' });
  assert.match(m.html, /A &lt;b&gt;/);
  assert.match(m.html, /1 &lt; 2 &amp; 3 &gt; 0/);
  assert.doesNotMatch(m.html, /1 < 2 & 3 > 0/);
});

test('html preserves message line breaks as <br>', () => {
  const m = buildFeedbackEmail({ senderName: 'A', reviewTitle: 'T', message: 'line one\nline two' });
  assert.match(m.html, /line one<br>line two/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsx --test lib/feedback/feedback-email.test.ts`
Expected: FAIL — cannot find module `./feedback-email`.

- [ ] **Step 3: Implement the builder**

Create `lib/feedback/feedback-email.ts`:

```ts
export interface FeedbackEmailInput {
  senderName: string;
  reviewTitle: string;
  message: string;
}

export interface FeedbackEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build the single shared email body. The same message is delivered to the
 * sender (To:) and the author (Bcc:), so the header is written in the third
 * person and reads correctly to both.
 */
export function buildFeedbackEmail(input: FeedbackEmailInput): FeedbackEmail {
  const { senderName, reviewTitle, message } = input;
  const header =
    `This message from ${senderName} was sent to the author of ${reviewTitle}. ` +
    `The author's email is hidden to preserve their anonymity — they can choose to reply if they wish.`;

  const subject = `Feedback on your review of ${reviewTitle}`;
  const text = `${header}\n\n${message}\n`;
  const html =
    `<p style="color:#666;font-size:14px">${escapeHtml(header)}</p>` +
    `<hr><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;

  return { subject, text, html };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsx --test lib/feedback/feedback-email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/feedback/feedback-email.ts lib/feedback/feedback-email.test.ts
git commit -m "feat(feedback): pure email body builder"
```

---

## Task 4: Feedback logic (validation + DB upsert/get/delete)

**Files:**
- Create: `lib/api/feedback-logic.ts`
- Test: `lib/api/feedback-logic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/api/feedback-logic.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { users, feedback } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { upsertFeedback, getFeedback, deleteFeedback } from './feedback-logic';
import { FEEDBACK_CONTEST_YEAR } from '@/lib/constants';

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

const base = {
  reviewSlug: 'r1',
  senderName: 'Alice',
  message: 'Nice review',
  reviewYear: FEEDBACK_CONTEST_YEAR,
};

test('rejects a review from the wrong contest year', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await upsertFeedback(db, { userId, ...base, reviewYear: 2024 });
  assert.deepEqual(r, { ok: false, reason: 'wrong_contest' });
});

test('rejects empty name and empty message', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  assert.deepEqual(
    await upsertFeedback(db, { userId, ...base, senderName: '   ' }),
    { ok: false, reason: 'invalid_name' }
  );
  assert.deepEqual(
    await upsertFeedback(db, { userId, ...base, message: '  ' }),
    { ok: false, reason: 'invalid_message' }
  );
});

test('inserts then updates the same (user, review) row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r1 = await upsertFeedback(db, { userId, ...base, message: 'first' });
  assert.equal(r1.ok, true);
  const r2 = await upsertFeedback(db, { userId, ...base, message: 'second' });
  assert.equal(r2.ok, true);
  const rows = await db.select().from(feedback).where(eq(feedback.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].message, 'second');
});

test('trims name and message before storing', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await upsertFeedback(db, { userId, ...base, senderName: '  Bob  ', message: '  hi  ' });
  const row = (await db.select().from(feedback))[0];
  assert.equal(row.senderName, 'Bob');
  assert.equal(row.message, 'hi');
});

test('refuses to edit once sent_at is set', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await upsertFeedback(db, { userId, ...base });
  await db.update(feedback).set({ sentAt: new Date() }).where(eq(feedback.userId, userId));
  const r = await upsertFeedback(db, { userId, ...base, message: 'changed' });
  assert.deepEqual(r, { ok: false, reason: 'already_sent' });
});

test('getFeedback returns null when none, the row when present', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  assert.equal(await getFeedback(db, { userId, reviewSlug: 'r1' }), null);
  await upsertFeedback(db, { userId, ...base });
  const got = await getFeedback(db, { userId, reviewSlug: 'r1' });
  assert.equal(got?.senderName, 'Alice');
  assert.equal(got?.message, 'Nice review');
  assert.equal(got?.sent, false);
});

test('delete removes an unsent row; refuses a sent row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await upsertFeedback(db, { userId, ...base });
  assert.deepEqual(await deleteFeedback(db, { userId, reviewSlug: 'r1' }), { ok: true });
  assert.deepEqual(
    await deleteFeedback(db, { userId, reviewSlug: 'r1' }),
    { ok: false, reason: 'not_found' }
  );
  await upsertFeedback(db, { userId, ...base });
  await db.update(feedback).set({ sentAt: new Date() }).where(eq(feedback.userId, userId));
  assert.deepEqual(
    await deleteFeedback(db, { userId, reviewSlug: 'r1' }),
    { ok: false, reason: 'already_sent' }
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsx --test lib/api/feedback-logic.test.ts`
Expected: FAIL — cannot find module `./feedback-logic`.

- [ ] **Step 3: Implement the logic**

Create `lib/api/feedback-logic.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsx --test lib/api/feedback-logic.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/api/feedback-logic.ts lib/api/feedback-logic.test.ts
git commit -m "feat(feedback): validation + upsert/get/delete logic"
```

---

## Task 5: API route (GET / POST / DELETE)

**Files:**
- Create: `app/api/feedback/route.ts`

Depends on Tasks 2 and 4.

- [ ] **Step 1: Implement the route**

Create `app/api/feedback/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getReviewBySlug } from '@/lib/reviews';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { makeDbRateLimitStore } from '@/lib/auth/rate-limit-store-db';
import { upsertFeedback, getFeedback, deleteFeedback } from '@/lib/api/feedback-logic';

const FEEDBACK_WRITES_PER_USER_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface PostBody {
  reviewSlug?: string;
  name?: string;
  message?: string;
}

function statusForReason(reason: string): number {
  if (reason === 'wrong_contest' || reason === 'already_sent') return 403;
  return 400;
}

function userIdOf(session: Awaited<ReturnType<typeof auth>>): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET(req: Request) {
  const userId = userIdOf(await auth());
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const reviewSlug = new URL(req.url).searchParams.get('reviewSlug');
  if (!reviewSlug) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const stored = await getFeedback(db, { userId, reviewSlug });
  return NextResponse.json({ feedback: stored });
}

export async function POST(req: Request) {
  const userId = userIdOf(await auth());
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (
    typeof body.reviewSlug !== 'string' ||
    typeof body.name !== 'string' ||
    typeof body.message !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const review = await getReviewBySlug(body.reviewSlug);
  if (!review) return NextResponse.json({ error: 'unknown_review' }, { status: 404 });

  const rl = await checkRateLimit(makeDbRateLimitStore(db), {
    key: `feedback:${userId}`,
    max: FEEDBACK_WRITES_PER_USER_PER_HOUR,
    windowMs: ONE_HOUR_MS,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const result = await upsertFeedback(db, {
    userId,
    reviewSlug: body.reviewSlug,
    senderName: body.name,
    message: body.message,
    reviewYear: review.year,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: statusForReason(result.reason) });
  }
  return NextResponse.json({ feedback: result.feedback });
}

export async function DELETE(req: Request) {
  const userId = userIdOf(await auth());
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const reviewSlug = new URL(req.url).searchParams.get('reviewSlug');
  if (!reviewSlug) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await deleteFeedback(db, { userId, reviewSlug });
  if (!result.ok) {
    const status = result.reason === 'already_sent' ? 403 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck / lint the new route**

Run: `pnpm lint`
Expected: no errors for `app/api/feedback/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/feedback/route.ts
git commit -m "feat(feedback): GET/POST/DELETE API route"
```

---

## Task 6: Client `FeedbackCard` + mount on review page

**Files:**
- Create: `components/feedback-card.tsx`
- Modify: `app/reviews/[slug]/page.tsx`

Mirrors the auth + sign-in-prompt pattern in `components/rating-card.tsx`.

- [ ] **Step 1: Implement the component**

Create `components/feedback-card.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { FEEDBACK_CONTEST_YEAR, FEEDBACK_MESSAGE_MAX } from '@/lib/constants';

interface Props {
  reviewSlug: string;
  reviewYear: number;
}

interface Stored {
  senderName: string;
  message: string;
  sent: boolean;
}

export function FeedbackCard({ reviewSlug, reviewYear }: Props) {
  const { data: session, status } = useSession();
  const { openSignIn } = useSignInPrompt();

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [stored, setStored] = useState<Stored | null>(null);
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthed = status === 'authenticated';
  const email = session?.user?.email ?? '';

  // Load any existing feedback once signed in; prefill the name field.
  useEffect(() => {
    if (!isAuthed) return;
    setName((n) => n || session?.user?.name || '');
    let cancelled = false;
    fetch(`/api/feedback?reviewSlug=${encodeURIComponent(reviewSlug)}`)
      .then((r) => (r.ok ? r.json() : { feedback: null }))
      .then((d: { feedback: Stored | null }) => {
        if (cancelled || !d.feedback) return;
        setStored(d.feedback);
        setName(d.feedback.senderName);
        setMessage(d.feedback.message);
        setEditing(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthed, reviewSlug, session?.user?.name]);

  if (reviewYear !== FEEDBACK_CONTEST_YEAR) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewSlug, name, message }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError((body.error ?? `error_${res.status}`).replace(/_/g, ' '));
        return;
      }
      const d = (await res.json()) as { feedback: Stored };
      setStored(d.feedback);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback?reviewSlug=${encodeURIComponent(reviewSlug)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStored(null);
        setMessage('');
        setEditing(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border rounded-xl bg-card px-4 py-5 sm:px-5 my-4 shadow-sm">
      <div className="text-sm font-semibold text-foreground mb-1">Send feedback to the author</div>
      <p className="text-xs text-muted-foreground mb-3">
        Your message is stored now and emailed to the author after the contest ends. The author can
        reply to you, but their identity stays hidden unless they choose to respond.
      </p>

      {!isAuthed ? (
        <button type="button" onClick={openSignIn} className="text-link underline text-sm">
          Sign in to send feedback
        </button>
      ) : stored && !editing ? (
        <div className="text-sm">
          <div className="text-muted-foreground mb-2">
            {stored.sent
              ? 'Your feedback has been sent to the author.'
              : 'You sent this feedback — the author will receive it after the contest ends.'}
          </div>
          <blockquote className="border-l-2 border-border pl-3 whitespace-pre-wrap text-foreground">
            {stored.message}
          </blockquote>
          {!stored.sent && (
            <div className="mt-3 flex gap-4">
              <button type="button" onClick={() => setEditing(true)} className="text-link underline text-xs">
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-xs text-muted-foreground hover:text-red-600 underline"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Your name (shown to the author)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Your email (shown to the author so they can reply)
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={FEEDBACK_MESSAGE_MAX}
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <div className="text-xs text-red-600">Couldn&apos;t save: {error}</div>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={busy || !name.trim() || !message.trim()}
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {stored ? 'Update feedback' : 'Send feedback'}
            </button>
            {stored && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-muted-foreground underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it on the review page**

In `app/reviews/[slug]/page.tsx`:

Add the import near the other component imports (after the `RatingCard` import, ~line 9):

```ts
import { FeedbackCard } from '@/components/feedback-card';
```

Then add the card immediately after the post-body `RatingCard` block (the one before the footnotes section, ~line 156). Insert this block right after that closing `</div>`:

```tsx
        {/* Send-feedback-to-author card (2026 only; renders nothing otherwise). */}
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <FeedbackCard reviewSlug={review.slug} reviewYear={review.year} />
        </div>
```

- [ ] **Step 3: Verify it builds**

Run: `pnpm build`
Expected: build completes with no type errors. (The page is statically generated; `FeedbackCard` is a client component that fetches per-user data at runtime.)

- [ ] **Step 4: Commit**

```bash
git add components/feedback-card.tsx app/reviews/[slug]/page.tsx
git commit -m "feat(feedback): FeedbackCard on 2026 review pages"
```

---

## Task 7: Pure slug→author-email map builder

**Files:**
- Create: `scripts/lib/author-email-map.ts`
- Test: `scripts/lib/author-email-map.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/author-email-map.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorEmailMap } from './author-email-map';
import { slugify } from '../../lib/utils';

test('maps each title to its slug with author email + title', () => {
  const m = buildAuthorEmailMap([
    { name: 'A', email: 'a@x.co', title: 'On Liberty' },
    { name: 'B', email: 'b@x.co', title: 'The Republic' },
  ]);
  assert.equal(m.get(slugify('On Liberty'))?.email, 'a@x.co');
  assert.equal(m.get(slugify('On Liberty'))?.title, 'On Liberty');
  assert.equal(m.get(slugify('The Republic'))?.email, 'b@x.co');
});

test('skips rows with a blank email or blank title', () => {
  const m = buildAuthorEmailMap([
    { name: 'A', email: '', title: 'Has No Email' },
    { name: 'B', email: 'b@x.co', title: '' },
    { name: 'C', email: 'c@x.co', title: 'Good' },
  ]);
  assert.equal(m.size, 1);
  assert.equal(m.get(slugify('Good'))?.email, 'c@x.co');
});

test('later rows win on duplicate slug', () => {
  const m = buildAuthorEmailMap([
    { name: 'A', email: 'first@x.co', title: 'Dup' },
    { name: 'B', email: 'second@x.co', title: 'Dup' },
  ]);
  assert.equal(m.get(slugify('Dup'))?.email, 'second@x.co');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsx --test scripts/lib/author-email-map.test.ts`
Expected: FAIL — cannot find module `./author-email-map`.

- [ ] **Step 3: Implement the builder**

Create `scripts/lib/author-email-map.ts`:

```ts
import { slugify } from '../../lib/utils';

export interface CsvAuthorRow {
  name: string;
  email: string;
  title: string;
}

export interface AuthorContact {
  email: string;
  name: string;
  title: string;
}

/**
 * Build slug -> author contact from parsed CSV rows. The slug is derived from
 * the book title the same way review files are (slugify(title)), so it matches
 * feedback.reviewSlug. Rows with a blank email or title are skipped. On
 * duplicate slugs, the later row wins.
 */
export function buildAuthorEmailMap(rows: CsvAuthorRow[]): Map<string, AuthorContact> {
  const map = new Map<string, AuthorContact>();
  for (const row of rows) {
    const email = row.email.trim();
    const title = row.title.trim();
    if (!email || !title) continue;
    map.set(slugify(title), { email, name: row.name.trim(), title });
  }
  return map;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsx --test scripts/lib/author-email-map.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/author-email-map.ts scripts/lib/author-email-map.test.ts
git commit -m "feat(feedback): pure slug->author-email map builder"
```

---

## Task 8: Postmark feedback sender

**Files:**
- Create: `lib/feedback/feedback-sender-postmark.ts`

Mirrors `lib/auth/pin-sender-postmark.ts`.

- [ ] **Step 1: Implement the sender**

Create `lib/feedback/feedback-sender-postmark.ts`:

```ts
import { ServerClient } from 'postmark';
import { buildFeedbackEmail } from './feedback-email';

let cached: ServerClient | null = null;
function client(): ServerClient {
  if (cached) return cached;
  const token = process.env.POSTMARK_TOKEN;
  if (!token) throw new Error('POSTMARK_TOKEN is not set');
  cached = new ServerClient(token);
  return cached;
}

export interface SendFeedbackParams {
  senderEmail: string;
  senderName: string;
  authorEmail: string;
  reviewTitle: string;
  message: string;
}

/**
 * Send one feedback email. The sender is the visible recipient (To:) so their
 * copy doubles as a confirmation; the author is Bcc'd (hidden); replies from
 * the author go to the sender via Reply-To.
 */
export async function sendFeedbackEmail(params: SendFeedbackParams): Promise<void> {
  const from = process.env.POSTMARK_FROM;
  if (!from) throw new Error('POSTMARK_FROM is not set');
  const { subject, text, html } = buildFeedbackEmail({
    senderName: params.senderName,
    reviewTitle: params.reviewTitle,
    message: params.message,
  });
  await client().sendEmail({
    From: from,
    To: params.senderEmail,
    Bcc: params.authorEmail,
    ReplyTo: params.senderEmail,
    Subject: subject,
    TextBody: text,
    HtmlBody: html,
    MessageStream: 'outbound',
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (confirms the `postmark` `sendEmail` field names `Bcc`/`ReplyTo` are valid).

- [ ] **Step 3: Commit**

```bash
git add lib/feedback/feedback-sender-postmark.ts
git commit -m "feat(feedback): postmark sender (author BCC'd)"
```

---

## Task 9: Local post-contest send script

**Files:**
- Create: `scripts/send-feedback.ts`

Run by the maintainer where the private CSV exists. Reuses the CSV-line parser idiom from `scripts/fetch-from-csv.ts` (copied locally — that one isn't exported).

- [ ] **Step 1: Implement the script**

Create `scripts/send-feedback.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Post-contest: email stored feedback to authors.
 *
 * For each feedback row with sent_at IS NULL, send ONE email:
 *   To:       sender (their copy = confirmation)
 *   Bcc:      author (hidden)
 *   Reply-To: sender (author can reply directly)
 * then stamp sent_at. Idempotent: rows already stamped are skipped.
 *
 * Usage:
 *   pnpm exec tsx scripts/send-feedback.ts [--dry-run] [--csv <path>]
 *
 * Default CSV: data/2026-entries-private/2026-submissions.csv (lives outside
 * the worktree; pass --csv to point elsewhere).
 */

import 'dotenv/config';
import fs from 'fs';
import { isNull, eq, and } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { feedback, users } from '../lib/db/schema';
import { buildAuthorEmailMap, type CsvAuthorRow } from './lib/author-email-map';
import { sendFeedbackEmail } from '../lib/feedback/feedback-sender-postmark';

const DEFAULT_CSV =
  '/Users/robennals/broomer-repos/acx-reviews/data/2026-entries-private/2026-submissions.csv';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(csvPath: string): CsvAuthorRow[] {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  const rows: CsvAuthorRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [, name, email, title] = parseCsvLine(lines[i]);
    if (!title) continue;
    rows.push({ name: name ?? '', email: email ?? '', title });
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvIdx = args.indexOf('--csv');
  const csvPath = csvIdx >= 0 ? args[csvIdx + 1] : DEFAULT_CSV;

  const authorMap = buildAuthorEmailMap(parseCsv(csvPath));

  const rows = await db
    .select({
      userId: feedback.userId,
      reviewSlug: feedback.reviewSlug,
      senderName: feedback.senderName,
      message: feedback.message,
      senderEmail: users.email,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.userId, users.id))
    .where(isNull(feedback.sentAt));

  console.log(`${rows.length} unsent feedback row(s). dryRun=${dryRun}`);
  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    const author = authorMap.get(row.reviewSlug);
    if (!author) {
      console.warn(`SKIP ${row.reviewSlug}: no author email in CSV`);
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(
        `[dry-run] ${row.senderEmail} -> bcc ${author.email} re: ${author.title}`
      );
      continue;
    }
    try {
      await sendFeedbackEmail({
        senderEmail: row.senderEmail,
        senderName: row.senderName,
        authorEmail: author.email,
        reviewTitle: author.title,
        message: row.message,
      });
      await db
        .update(feedback)
        .set({ sentAt: new Date() })
        .where(
          and(eq(feedback.userId, row.userId), eq(feedback.reviewSlug, row.reviewSlug))
        );
      sent++;
      console.log(`SENT ${row.senderEmail} re: ${author.title}`);
    } catch (e) {
      console.error(`FAIL ${row.reviewSlug} for ${row.senderEmail}:`, e);
      skipped++;
    }
  }

  console.log(`Done. sent=${sent} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck the script**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test the dry run against a fixture CSV**

```bash
printf '%s\n' \
  '"Timestamp","Name or pseudonym","Your email","Title of the book you'\''re reviewing","Link to a Google Doc with your review"' \
  '"2026-01-01","Test Author","author@example.com","Some Book","https://docs.google.com/x"' \
  > /tmp/feedback-fixture.csv
pnpm exec tsx scripts/send-feedback.ts --dry-run --csv /tmp/feedback-fixture.csv
```

Expected: runs without throwing, prints the unsent-row count and `Done.` (If `DATABASE_URL` is unset locally it will throw `DbNotConfiguredError` — that's expected; run against a configured `.env.local`. The dry run sends no email and stamps nothing.)

- [ ] **Step 4: Commit**

```bash
git add scripts/send-feedback.ts
git commit -m "feat(feedback): local post-contest send script"
```

---

## Task 10: Full test + lint pass

- [ ] **Step 1: Run the unit suite**

Run: `pnpm test:unit`
Expected: PASS, including the new `feedback-email`, `feedback-logic`, and `author-email-map` tests.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit any fixups**

```bash
git add -A
git commit -m "chore(feedback): test + lint pass" --allow-empty
```

---

## Deployment notes (maintainer, not part of automated execution)

1. `pnpm db:push` against the production Turso DB to create the `feedback` table.
2. Deploy. The form appears on 2026 review pages for signed-in users once those reviews are live.
3. After the contest ends, run `pnpm exec tsx scripts/send-feedback.ts --dry-run` (with the private CSV present), review output, then run without `--dry-run` to send. Re-running is safe — only `sent_at IS NULL` rows are processed.
