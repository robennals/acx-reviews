import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { users, accounts, votes, favorites, progress } from '@/lib/db/schema';
import { normalizeEmail } from '@/lib/auth/pin';

export interface MigrationReport {
  scanned: number;
  renamed: number;
  merged: number;
  deletedUsers: number;
  groups: Array<{
    normalizedEmail: string;
    survivorId: string;
    mergedIds: string[];
  }>;
}

type UserRow = typeof users.$inferSelect;

/**
 * Rank function for picking which of several users representing the same
 * canonical email should survive a merge. Higher rank wins. A user with a
 * linked OAuth account wins (losing that row would force the user to
 * re-consent via Google). Then verified email wins. Ties are broken by
 * user id so the result is stable across runs.
 */
function survivorRank(u: UserRow, hasAccount: boolean): [number, number, string] {
  return [hasAccount ? 1 : 0, u.emailVerified ? 1 : 0, u.id];
}

function compareRank(a: [number, number, string], b: [number, number, string]): number {
  if (a[0] !== b[0]) return b[0] - a[0];
  if (a[1] !== b[1]) return b[1] - a[1];
  // lex smaller id wins (stable across runs); invert signs since higher rank wins
  return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0;
}

async function userHasAccount(db: DB, userId: string): Promise<boolean> {
  const rows = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
  return rows.length > 0;
}

/**
 * Move all child rows from `victim` to `survivor`, resolving primary-key
 * conflicts row by row. Then delete the victim user row.
 *
 * Conflict resolution per table:
 *   - votes / favorites: if survivor already has the same (contest, review)
 *     or (review) row, keep survivor's; drop victim's.
 *   - progress: if both exist for the same review, keep whichever has the
 *     higher-precedence status (finished > in_progress).
 *   - accounts: repoint userId. The (provider, providerAccountId) PK is
 *     globally unique, so real collisions shouldn't happen.
 */
async function mergeVictimIntoSurvivor(
  db: DB,
  victim: UserRow,
  survivor: UserRow
): Promise<void> {
  // VOTES
  const victimVotes = await db.select().from(votes).where(eq(votes.userId, victim.id));
  for (const v of victimVotes) {
    const existing = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, survivor.id),
          eq(votes.contestId, v.contestId),
          eq(votes.reviewId, v.reviewId)
        )
      )
      .limit(1);
    if (!existing[0]) {
      await db.insert(votes).values({
        userId: survivor.id,
        contestId: v.contestId,
        reviewId: v.reviewId,
        createdAt: v.createdAt,
      });
    }
  }
  await db.delete(votes).where(eq(votes.userId, victim.id));

  // FAVORITES
  const victimFavs = await db.select().from(favorites).where(eq(favorites.userId, victim.id));
  for (const f of victimFavs) {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, survivor.id), eq(favorites.reviewId, f.reviewId)))
      .limit(1);
    if (!existing[0]) {
      await db.insert(favorites).values({
        userId: survivor.id,
        reviewId: f.reviewId,
        createdAt: f.createdAt,
      });
    }
  }
  await db.delete(favorites).where(eq(favorites.userId, victim.id));

  // PROGRESS — with status precedence
  const victimProg = await db.select().from(progress).where(eq(progress.userId, victim.id));
  for (const p of victimProg) {
    const existing = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, survivor.id), eq(progress.reviewId, p.reviewId)))
      .limit(1);
    if (!existing[0]) {
      await db.insert(progress).values({
        userId: survivor.id,
        reviewId: p.reviewId,
        status: p.status,
        updatedAt: p.updatedAt,
      });
    } else if (existing[0].status === 'in_progress' && p.status === 'finished') {
      await db
        .update(progress)
        .set({ status: 'finished', updatedAt: p.updatedAt })
        .where(and(eq(progress.userId, survivor.id), eq(progress.reviewId, p.reviewId)));
    }
  }
  await db.delete(progress).where(eq(progress.userId, victim.id));

  // ACCOUNTS — repoint userId. Any (provider, providerAccountId) conflicts
  // would indicate data corruption; we'd want to know, not silently drop.
  await db.update(accounts).set({ userId: survivor.id }).where(eq(accounts.userId, victim.id));

  // Inherit metadata the survivor is missing.
  const patch: Partial<UserRow> = {};
  if (!survivor.emailVerified && victim.emailVerified) patch.emailVerified = victim.emailVerified;
  if (!survivor.name && victim.name) patch.name = victim.name;
  if (!survivor.image && victim.image) patch.image = victim.image;
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, survivor.id));
  }

  // Finally, delete the victim user row.
  await db.delete(users).where(eq(users.id, victim.id));
}

/**
 * Re-canonicalize every users.email row. Rows whose stored email doesn't
 * match normalizeEmail(email) are updated; rows that collide with another
 * user under the same normalized email are merged (see mergeVictimIntoSurvivor).
 * Safe to run multiple times; second run is a no-op.
 */
export async function normalizeUserEmails(db: DB): Promise<MigrationReport> {
  const all = await db.select().from(users);

  // Group users by normalized email.
  const groups = new Map<string, UserRow[]>();
  for (const u of all) {
    const norm = normalizeEmail(u.email);
    const list = groups.get(norm);
    if (list) list.push(u);
    else groups.set(norm, [u]);
  }

  const report: MigrationReport = {
    scanned: all.length,
    renamed: 0,
    merged: 0,
    deletedUsers: 0,
    groups: [],
  };

  for (const [normEmail, group] of groups) {
    if (group.length === 1) {
      const only = group[0];
      if (only.email !== normEmail) {
        await db.update(users).set({ email: normEmail }).where(eq(users.id, only.id));
        report.renamed++;
      }
      continue;
    }

    // Multiple users → merge. Rank each to pick survivor.
    const ranked = await Promise.all(
      group.map(async (u) => {
        const hasAcc = await userHasAccount(db, u.id);
        return { user: u, rank: survivorRank(u, hasAcc) };
      })
    );
    ranked.sort((a, b) => compareRank(a.rank, b.rank));
    const survivor = ranked[0].user;
    const victims = ranked.slice(1).map((r) => r.user);

    for (const victim of victims) {
      await mergeVictimIntoSurvivor(db, victim, survivor);
      report.merged++;
      report.deletedUsers++;
    }

    // Make sure the survivor's email is the normalized form.
    if (survivor.email !== normEmail) {
      await db.update(users).set({ email: normEmail }).where(eq(users.id, survivor.id));
    }

    report.groups.push({
      normalizedEmail: normEmail,
      survivorId: survivor.id,
      mergedIds: victims.map((v) => v.id),
    });
  }

  return report;
}
