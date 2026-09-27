import 'server-only';
import fs from 'fs';
import path from 'path';
import {
  parseVotingConfigFile,
  type VotingConfig,
} from '@/lib/voting-period';

/**
 * The active contest definition, read from the committed
 * data/voting-config.json. Returns null if the file is missing or fails
 * validation (same null-means-disabled contract as the old env reader).
 */
export function getVotingConfig(): VotingConfig | null {
  try {
    const p = path.join(process.cwd(), 'data', 'voting-config.json');
    return parseVotingConfigFile(JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch {
    return null;
  }
}
