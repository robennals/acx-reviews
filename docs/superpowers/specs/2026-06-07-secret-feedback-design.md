# Secret Feedback to Review Authors — Design

**Date:** 2026-06-07
**Branch:** feature/secret-feedback
**Status:** Approved (design), pending implementation plan

## Problem

Readers want to send feedback to review authors, but the contest is judged
blind and author identity must stay anonymous during the contest. A naive
"email the author" feature breaks this: if the author replies during the
contest, their identity is revealed to the sender.

## Solution Summary

Collect feedback from signed-in readers and **store it** during the contest.
Show each sender the feedback **they** wrote (in-UI confirmation). Send no
email at runtime, and never load any author email address into the deployed
app. **After the contest ends**, a local script (run by the maintainer, where
the private submissions CSV lives) emails the feedback to authors using a
single BCC'd message that lets the author reply to the sender without exposing
the author's own address.

This preserves author anonymity during judging (no replies possible until the
contest is over) and keeps author contact data entirely out of the deployment
and out of git.

## Key Decisions

- **Who can send:** signed-in users only (Google or PIN). Gives a verified
  account per send and natural per-user rate limiting.
- **Sender identity:** editable display **name**, **locked email** (the
  verified account email). Replies always reach a verified address; the sender
  can choose a friendly display name.
- **Email mechanism:** a **single** email per feedback, with the **author
  BCC'd** — chosen over two separate emails. `To:` sender, `Bcc:` author,
  `Reply-To:` sender, `From:` system. The sender's copy doubles as their
  delivered confirmation; the author is hidden (BCC recipients are never shown
  to other recipients), and the author can reply directly to the sender. The
  author's address is revealed only if the author chooses to reply.
- **Timing:** all email sending is **deferred until after the contest**, run
  via a local script. Runtime only stores feedback and shows senders their own
  submissions.
- **Author contact data:** there is **no author-contacts table at runtime**.
  The deployed app never knows author emails. The local send script reads the
  private CSV (`data/2026-entries-private/2026-submissions.csv`) directly.
- **Scope:** 2026 reviews only (the only contest with author contact data).

## Why BCC the *author* (not the sender)

BCC'ing the **sender** would leak the author's address, because BCC recipients
still see the `To:` header. BCC'ing the **author** is the safe inversion:

```
From:     <system / verified Postmark address>
To:       sender@email.com        # their copy = confirmation
Bcc:      author@email.com        # hidden from the sender
Reply-To: sender@email.com        # author's reply reaches the sender
```

The shared body opens with a neutral header that reads correctly to both
recipients (third person):

> This message from **[sender name]** was sent to the author of
> **[review title]**. The author's email is hidden to preserve their
> anonymity — they can choose to reply if they wish.

## Components

### 1. Data — `feedback` table (Turso / libSQL, via `lib/db/schema.ts`)

| column            | type        | notes                                    |
|-------------------|-------------|------------------------------------------|
| `id`              | pk          |                                          |
| `review_slug`     | text        | which review                             |
| `sender_user_id`  | text        | FK to users; the signed-in sender        |
| `sender_name`     | text        | editable display name                    |
| `message`         | text        | the feedback                             |
| `created_at`      | timestamp   |                                          |
| `updated_at`      | timestamp   |                                          |
| `sent_at`         | timestamp?  | null until the local script emails it    |

- **One row per `(sender_user_id, review_slug)`**, upserted — editable and
  deletable while `sent_at IS NULL` (mirrors the one-row-per-vote model).
- The sender's email is **not** duplicated here; it lives on the user record
  and is resolved at send time. This keeps a single source of truth for the
  verified address.

### 2. Runtime flow (during the contest)

- A feedback form renders on **2026** review pages only.
- Signed-out users see a sign-in prompt instead of the form.
- Form fields:
  - **name** — text, prefilled from the account, editable.
  - **email** — read-only, the account email, shown so the sender knows what
    the author will see / what the author can reply to.
  - **message** — the feedback text.
- Submit → `POST /api/feedback` upserts the row for `(user, slug)`.
  - Auth required; reject otherwise.
  - Per-user rate limiting to prevent abuse (e.g. a cap on
    creates/updates per window — exact numbers set in the plan).
- After submit, the page shows the sender their stored feedback:
  > You sent this feedback — the author will receive it after the contest
  > ends.
  Editable / deletable while `sent_at IS NULL`.
- **No email is sent at runtime. No author address is ever loaded by the
  deployed app.**

### 3. Post-contest send — `scripts/send-feedback.ts` (local only)

Run by the maintainer after the contest, where the private CSV exists.

1. Read unsent rows (`sent_at IS NULL`) from the `feedback` table.
2. Read `data/2026-entries-private/2026-submissions.csv`; build
   `slug → { authorEmail, title }` via `slugify(title)`.
3. For each feedback row:
   - Resolve sender email + name (from user record / row).
   - Resolve author email via the slug map.
   - Send one Postmark email (`To:` sender, `Bcc:` author, `Reply-To:` sender,
     `From:` `POSTMARK_FROM`, `MessageStream: outbound`) with the neutral
     header + the message body.
   - On success, stamp `sent_at`.
4. Flags / safety:
   - `--dry-run` prints what would be sent without sending or stamping.
   - **Idempotent**: rows with `sent_at` set are skipped, so re-running never
     double-sends.
   - Log (don't crash on) any feedback whose `review_slug` has no CSV match
     or whose author email is blank.

Reuses the existing Postmark client pattern from
`lib/auth/pin-sender-postmark.ts`.

### 4. Pure helpers (testable, no I/O)

- **Email body builder** — `(senderName, reviewTitle, message) → { text, html }`
  including the neutral header line. Pure, unit-tested.
- **Rate-limit logic** — pure predicate over recent-activity counts.
- **Slug→email matching** — `slugify(title)` reuse from `lib/utils.ts`;
  matching/skip logic unit-tested against sample CSV rows.

## Error Handling

- Unauthenticated submit → 401.
- Submitting feedback on a non-2026 review → rejected (form not rendered, API
  validates year).
- Rate limit exceeded → 429 with a friendly message.
- Script: per-row failures are logged and skipped; the run continues; only
  successfully-sent rows get `sent_at` stamped.

## Testing

- Unit (`pnpm test:unit`): email body builder, rate-limit predicate,
  slug→email matching.
- API route: auth gating, upsert behavior, year validation, rate-limit 429.
- Script: body-builder integration + a `--dry-run` over fixture rows; assert
  idempotency (no resend when `sent_at` set).

## Out of Scope / YAGNI

- No author-facing in-UI inbox (authors receive feedback by email
  post-contest).
- No author-contacts table at runtime.
- No support for pre-2026 contests (no contact data).
- No threading / conversation tracking beyond the single BCC'd email + native
  email reply.

## Open Items for the Plan

- Exact rate-limit numbers and window.
- Whether to surface a global "your sent feedback" list vs only per-review.
- Confirmation-of-delete UX details.
