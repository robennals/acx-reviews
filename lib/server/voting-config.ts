import 'server-only';
import fs from 'fs';
import path from 'path';
import { parseVotingConfig, type VotingConfig } from '@/lib/voting-period';

/**
 * The active contest definition, read from the committed
 * data/voting-config.json. Returns null if the file is missing or fails
 * validation (same null-means-disabled contract as the old env reader).
 */
export function getVotingConfig(): VotingConfig | null {
  try {
    const p = path.join(process.cwd(), 'data', 'voting-config.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      contestYear?: number;
      contestTitle?: string;
      votingStart?: string;
      votingEnd?: string;
    };
    return parseVotingConfig({
      VOTING_CONTEST_YEAR: raw.contestYear != null ? String(raw.contestYear) : '',
      VOTING_CONTEST_TITLE: raw.contestTitle ?? '',
      VOTING_START: raw.votingStart ?? '',
      VOTING_END: raw.votingEnd ?? '',
    });
  } catch {
    return null;
  }
}
