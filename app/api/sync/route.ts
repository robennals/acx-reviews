import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getUserSyncState } from '@/lib/api/sync-logic';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ favorites: [], progress: [] });
  }
  return NextResponse.json(await getUserSyncState(db, userId));
}
