/**
 * Merge logic for the committed data/epubs.json manifest, which the
 * /epub download page reads. One entry per contest; newest first.
 */

export interface EpubManifestEntry {
  contestId: string;
  name: string;
  url: string;
  sizeBytes: number;
  entryCount: number;
  wordCount: number;
  generatedAt: string;
}

export function mergeManifest(
  existing: EpubManifestEntry[],
  entry: EpubManifestEntry
): EpubManifestEntry[] {
  const rest = existing.filter((e) => e.contestId !== entry.contestId);
  // Contest IDs start with the year, so a reverse lexical sort puts the
  // newest contest first.
  return [...rest, entry].sort((a, b) => b.contestId.localeCompare(a.contestId));
}
