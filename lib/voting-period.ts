export interface VotingConfig {
  contestYear: number;
  contestTitle: string;
  start: Date;
  end: Date;
}

export interface VotingEnv {
  VOTING_CONTEST_YEAR?: string;
  VOTING_CONTEST_TITLE?: string;
  VOTING_START?: string;
  VOTING_END?: string;
}

/**
 * Parse the active voting period from env vars. Returns null if any of the
 * four required vars is missing or invalid — voting is then disabled entirely.
 */
export function parseVotingConfig(env: VotingEnv): VotingConfig | null {
  const yearStr = env.VOTING_CONTEST_YEAR?.trim();
  const title = env.VOTING_CONTEST_TITLE?.trim();
  const startStr = env.VOTING_START?.trim();
  const endStr = env.VOTING_END?.trim();
  if (!yearStr || !title || !startStr || !endStr) return null;

  const year = Number(yearStr);
  if (!Number.isInteger(year)) return null;

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end <= start) return null;

  return { contestYear: year, contestTitle: title, start, end };
}

export function isVotingOpen(config: VotingConfig | null, now: Date): boolean {
  if (!config) return false;
  const t = now.getTime();
  return t >= config.start.getTime() && t < config.end.getTime();
}

export function isReviewVotable(
  config: VotingConfig | null,
  reviewYear: number,
  now: Date
): boolean {
  return isVotingOpen(config, now) && config!.contestYear === reviewYear;
}

/**
 * The contest config the rest of the app should act on: the configured
 * contest only counts as active once an admin has flipped it live.
 */
export function effectiveVotingConfig(
  config: VotingConfig | null,
  live: boolean
): VotingConfig | null {
  return live ? config : null;
}

