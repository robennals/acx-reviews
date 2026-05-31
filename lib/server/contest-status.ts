import 'server-only';
import type { VotingConfig } from '@/lib/voting-period';
import { effectiveVotingConfig } from '@/lib/voting-period';
import { getVotingConfig } from './voting-config';
import { getContestLive } from './site-flags';

export interface ContestStatus {
  config: VotingConfig | null; // the configured contest definition
  live: boolean; // admin flag
}

export async function getContestStatus(): Promise<ContestStatus> {
  // `live` drives the PUBLIC-facing experience (home listing, sitemap, banner,
  // voting). It is the real DB flag OR the per-deploy PREVIEW_CONTEST_LIVE
  // override — the override lets a private preview render the launched view
  // without flipping the shared production flag. The admin panel reads the
  // raw getContestLive() directly, so it always reflects true production state.
  const dbLive = await getContestLive();
  const live = dbLive || process.env.PREVIEW_CONTEST_LIVE === 'true';
  return { config: getVotingConfig(), live };
}

/** The config the app acts on — null until the admin flips it live. */
export async function getEffectiveVotingConfig(): Promise<VotingConfig | null> {
  const { config, live } = await getContestStatus();
  return effectiveVotingConfig(config, live);
}
