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

let cached: { value: VotingConfig | null; envSnapshot: string } | null = null;
function envSnapshot(): string {
  return [
    process.env.VOTING_CONTEST_YEAR ?? '',
    process.env.VOTING_CONTEST_TITLE ?? '',
    process.env.VOTING_START ?? '',
    process.env.VOTING_END ?? '',
  ].join('');
}

export function getVotingConfig(): VotingConfig | null {
  const snap = envSnapshot();
  if (cached && cached.envSnapshot === snap) return cached.value;
  const value = parseVotingConfig({
    VOTING_CONTEST_YEAR: process.env.VOTING_CONTEST_YEAR,
    VOTING_CONTEST_TITLE: process.env.VOTING_CONTEST_TITLE,
    VOTING_START: process.env.VOTING_START,
    VOTING_END: process.env.VOTING_END,
  });
  cached = { value, envSnapshot: snap };
  return value;
}
