import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

// --- Auth.js standard tables (sqlite shape) ---

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
});

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// --- App tables ---

// Generic sliding-window rate limiter. Key is namespaced like
// "pin_request:<ip>". One row per key; window resets when the next request
// arrives after `window_start + window_ms`.
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: integer('window_start', { mode: 'timestamp_ms' }).notNull(),
});

// Email PIN sign-in. One active PIN per email; replaced on each request.
export const emailPins = sqliteTable('email_pins', {
  email: text('email').primaryKey(),
  pinHash: text('pin_hash').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastSentAt: integer('last_sent_at', { mode: 'timestamp_ms' }).notNull(),
});

// 1..10 likert rating. One row per (user, contest, review).
export const votes = sqliteTable(
  'votes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contestId: text('contest_id').notNull(),
    reviewId: text('review_id').notNull(),
    rating: integer('rating').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.contestId, t.reviewId] }),
    index('votes_contest_review_idx').on(t.contestId, t.reviewId),
    index('votes_contest_recency_idx').on(t.contestId, t.updatedAt),
  ]
);

// Reading status — only in_progress | finished. Percentage stays in localStorage.
export const progress = sqliteTable(
  'progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewId: text('review_id').notNull(),
    status: text('status', { enum: ['in_progress', 'finished'] }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reviewId] })]
);

export const favorites = sqliteTable(
  'favorites',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewId: text('review_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reviewId] })]
);

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

// Singleton row of admin-controlled site flags. Always id = 'singleton'.
export const siteFlags = sqliteTable('site_flags', {
  id: text('id').primaryKey(),
  contestLive: integer('contest_live', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
