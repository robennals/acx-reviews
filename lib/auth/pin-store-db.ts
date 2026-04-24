import { eq, sql } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { emailPins } from '@/lib/db/schema';
import type { EmailPinRecord, PinStore } from './pin';

/**
 * Build a Drizzle-backed PinStore against a specific db instance. Tests
 * pass an in-memory db; production code passes the singleton from db/client.
 */
export function makeDbPinStore(db: DB): PinStore {
  return {
    async get(email) {
      const rows = await db.select().from(emailPins).where(eq(emailPins.email, email)).limit(1);
      const r = rows[0];
      if (!r) return null;
      return {
        email: r.email,
        pinHash: r.pinHash,
        expiresAt: r.expiresAt,
        attempts: r.attempts,
        lastSentAt: r.lastSentAt,
      } satisfies EmailPinRecord;
    },
    async upsert(record) {
      await db
        .insert(emailPins)
        .values({
          email: record.email,
          pinHash: record.pinHash,
          expiresAt: record.expiresAt,
          attempts: record.attempts,
          lastSentAt: record.lastSentAt,
        })
        .onConflictDoUpdate({
          target: emailPins.email,
          set: {
            pinHash: record.pinHash,
            expiresAt: record.expiresAt,
            attempts: record.attempts,
            lastSentAt: record.lastSentAt,
          },
        });
    },
    async bumpAttempts(email) {
      const rows = await db
        .update(emailPins)
        .set({ attempts: sql`${emailPins.attempts} + 1` })
        .where(eq(emailPins.email, email))
        .returning({ attempts: emailPins.attempts });
      return rows[0]?.attempts ?? 0;
    },
    async delete(email) {
      await db.delete(emailPins).where(eq(emailPins.email, email));
    },
  };
}

