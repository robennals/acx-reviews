/**
 * Pure helpers for syncing narration audio to review text.
 * Used by the AudioPlayer client component; no I/O, no DOM.
 */

export interface TimedWord {
  s: number; // start seconds
  e: number; // end seconds
}

/**
 * Index of the word being spoken at time `t`: the last word whose start is
 * at or before `t` (so during inter-word gaps the previous word stays
 * current). Returns -1 before the first word.
 */
export function wordIndexAtTime(words: TimedWord[], t: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].s <= t) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * Collapse text to lowercase letters only. Digits are deliberately dropped:
 * footnote references render as bare digits in the DOM but are absent from
 * the speech text, so letters-only strings compare equal across the two.
 */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}]/gu, '');
}

/**
 * Pair each speech paragraph with the DOM block element holding the same
 * text. Both lists are in document order, so scan forward from the last
 * match; blocks that match nothing (or paragraphs missing from the DOM,
 * like a stripped h1) yield null without derailing later matches.
 */
export function matchParagraphsToBlocks(
  paragraphs: string[],
  blocks: string[]
): (number | null)[] {
  const normBlocks = blocks.map(normalizeForMatch);
  const result: (number | null)[] = [];
  let from = 0;
  for (const para of paragraphs) {
    const target = normalizeForMatch(para);
    let found: number | null = null;
    if (target !== '') {
      for (let j = from; j < normBlocks.length; j++) {
        if (normBlocks[j] === target) {
          found = j;
          from = j + 1;
          break;
        }
      }
    }
    result.push(found);
  }
  return result;
}
