import { db, isDbConfigured } from '../db/client';
import { checkDbPreviewLimit, createMemoryPreviewLimiter } from './rate-limit';

const localLimit = createMemoryPreviewLimiter();

export function checkPreviewLimit(ip: string) {
  if (isDbConfigured) return checkDbPreviewLimit(db, ip);
  // Production must not silently become an independent budget per instance.
  if (process.env.NODE_ENV === 'production') throw new Error('Shared preview limiter requires DATABASE_URL.');
  return localLimit(ip);
}
