/**
 * Cross-source duplicate detection.
 *
 * The contest review pipeline imports from two sources:
 *   - ACX/Substack posts of contest finalists (source: 'acx')
 *   - Google Docs containing all contest entries (source: 'gdoc')
 *
 * For finalists, the same review usually exists in both. The ACX post is
 * Scott's edited version (better formatting, light copy edits). When we
 * detect a twin pair, we keep the ACX file and delete the gdoc file.
 *
 * Detection compares normalized review bodies. We use a "containment"
 * metric: what fraction of A's 100-char body chunks appear as substrings
 * in B. A pair is a twin if forward and reverse containment are both
 * >= 0.5 AND lengths are within a 2x ratio.
 *
 * On the actual corpus, real twins score 0.57-0.99 in both directions
 * and non-twins score below 0.05 — the distribution is strongly bimodal,
 * leaving wide safety margin around the 0.5 threshold.
 */
export interface ReviewRecord {
  slug: string;
  contestId: string;
  source: 'acx' | 'gdoc' | string;
  title: string;
  body: string;
}

export interface TwinMatch {
  acx: ReviewRecord;
  gdoc: ReviewRecord;
  fwd: number;       // containment of acx in gdoc
  rev: number;       // containment of gdoc in acx
  lenRatio: number;  // min/max of normalized body lengths
}

export interface TwinResult {
  matches: TwinMatch[];
  /** ACX reviews where multiple gdocs cleared the threshold — needs human review. */
  multiMatchedAcx: Array<{ acx: ReviewRecord; candidates: TwinMatch[] }>;
  /** Gdocs that more than one ACX claimed as a twin — also needs human review. */
  multiMatchedGdoc: Array<{ gdoc: ReviewRecord; claimants: TwinMatch[] }>;
  /** ACX reviews that found no gdoc twin above threshold. */
  unmatchedAcx: ReviewRecord[];
}

const CHUNK_SIZE = 100;
const CHUNK_STRIDE = 50;
const MIN_LEN_FOR_DETECTION = 200;
const FWD_THRESHOLD = 0.5;
const REV_THRESHOLD = 0.5;
const LEN_RATIO_THRESHOLD = 0.5;

export function normalizeBody(content: string): string {
  return content
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function containment(aNorm: string, bNorm: string): number {
  if (aNorm.length < MIN_LEN_FOR_DETECTION) return 0;
  let total = 0;
  let hit = 0;
  for (let i = 0; i + CHUNK_SIZE <= aNorm.length; i += CHUNK_STRIDE) {
    total++;
    if (bNorm.includes(aNorm.slice(i, i + CHUNK_SIZE))) hit++;
  }
  return total === 0 ? 0 : hit / total;
}

export function isTwin(
  acxNorm: string,
  gdocNorm: string,
): { twin: boolean; fwd: number; rev: number; lenRatio: number } {
  const fwd = containment(acxNorm, gdocNorm);
  const rev = containment(gdocNorm, acxNorm);
  const lenRatio =
    Math.max(acxNorm.length, gdocNorm.length) === 0
      ? 0
      : Math.min(acxNorm.length, gdocNorm.length) /
        Math.max(acxNorm.length, gdocNorm.length);
  const twin =
    fwd >= FWD_THRESHOLD && rev >= REV_THRESHOLD && lenRatio >= LEN_RATIO_THRESHOLD;
  return { twin, fwd, rev, lenRatio };
}

export function findTwins(reviews: ReviewRecord[]): TwinResult {
  const byContest = new Map<string, { acx: ReviewRecord[]; gdoc: ReviewRecord[] }>();
  const normCache = new Map<string, string>();
  const normOf = (r: ReviewRecord): string => {
    let n = normCache.get(r.slug + '\0' + r.contestId);
    if (n === undefined) {
      n = normalizeBody(r.body);
      normCache.set(r.slug + '\0' + r.contestId, n);
    }
    return n;
  };

  for (const r of reviews) {
    let bucket = byContest.get(r.contestId);
    if (!bucket) {
      bucket = { acx: [], gdoc: [] };
      byContest.set(r.contestId, bucket);
    }
    if (r.source === 'acx') bucket.acx.push(r);
    else if (r.source === 'gdoc') bucket.gdoc.push(r);
  }

  const matches: TwinMatch[] = [];
  const multiMatchedAcx: TwinResult['multiMatchedAcx'] = [];
  const unmatchedAcx: ReviewRecord[] = [];
  const gdocClaimants = new Map<string, TwinMatch[]>();

  for (const { acx, gdoc } of byContest.values()) {
    for (const a of acx) {
      const aNorm = normOf(a);
      const passing: TwinMatch[] = [];
      for (const g of gdoc) {
        const gNorm = normOf(g);
        const result = isTwin(aNorm, gNorm);
        if (result.twin) {
          passing.push({ acx: a, gdoc: g, fwd: result.fwd, rev: result.rev, lenRatio: result.lenRatio });
        }
      }
      if (passing.length === 0) {
        unmatchedAcx.push(a);
      } else if (passing.length === 1) {
        matches.push(passing[0]);
        const key = passing[0].gdoc.contestId + '\0' + passing[0].gdoc.slug;
        const arr = gdocClaimants.get(key) ?? [];
        arr.push(passing[0]);
        gdocClaimants.set(key, arr);
      } else {
        multiMatchedAcx.push({ acx: a, candidates: passing });
      }
    }
  }

  const multiMatchedGdoc: TwinResult['multiMatchedGdoc'] = [];
  for (const arr of gdocClaimants.values()) {
    if (arr.length > 1) {
      multiMatchedGdoc.push({ gdoc: arr[0].gdoc, claimants: arr });
    }
  }

  return { matches, multiMatchedAcx, multiMatchedGdoc, unmatchedAcx };
}
