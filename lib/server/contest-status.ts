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
  const live = await getContestLive();
  return { config: getVotingConfig(), live };
}

/** The config the app acts on — null until the admin flips it live. */
export async function getEffectiveVotingConfig(): Promise<VotingConfig | null> {
  const { config, live } = await getContestStatus();
  return effectiveVotingConfig(config, live);
}
