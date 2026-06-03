// lib/epubs.ts
import fs from 'fs';
import path from 'path';

export interface EpubDownload {
  contestId: string;
  name: string;
  url: string;
  sizeBytes: number;
  entryCount: number;
  wordCount: number;
  generatedAt: string;
}

/**
 * Load the committed ePub manifest (data/epubs.json, written by
 * `pnpm generate-epub --upload`). Returns [] when missing so the
 * /epub page degrades gracefully on a fresh clone.
 */
export async function getEpubs(): Promise<EpubDownload[]> {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'epubs.json'), 'utf8');
    return JSON.parse(raw) as EpubDownload[];
  } catch {
    return [];
  }
}
