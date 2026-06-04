/**
 * Composite-volume footnote redistribution.
 *
 * Google Docs exports native footnotes as one pooled block at the very end
 * of the document. The 2021–2025 contest sources are composite volumes
 * (many reviews per doc), so after H1-splitting the entire volume's
 * footnote definitions land in the LAST review's section, while each
 * review's inline refs (`[[N]](#ftntN)`) stay in its own section — leaving
 * dead-linked refs in most reviews and a giant orphan def-block in the
 * volume's final review.
 *
 * This pass runs on the split sections BEFORE files are written:
 *   1. Collect every def (`[[N]](#ftnt_refN) …` + continuation lines up to
 *      the next def) from each section's trailing def region, removing the
 *      region (and a `* * *` separator immediately before it).
 *   2. For each review, find its refs in order of first appearance,
 *      renumber them 1..n, and append the matching defs to the review.
 *   3. Refs with no def anywhere in the volume are downgraded to plain
 *      `[N]` text (a link to a nonexistent anchor is worse than plain
 *      text). Defs referenced by no review are dropped and reported so the
 *      import log shows exactly what was left behind.
 */

const DEF_START = /^\[\[(\d+)\]\]\(#ftnt_?ref\d+\)[ \t]?(.*)$/;
const REF_RE = /\[\[(\d+)\]\]\(#ftnt(\d+)\)/g;

export interface RedistributeStats {
  movedDefs: number;
  deadRefs: number;
  unreferencedDefIds: string[];
}

function isSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (t === '') return true;
  if (/^(\*[ \t]*){3,}$/.test(t)) return true;
  if (/^(-[ \t]*){3,}$/.test(t)) return true;
  if (/^(_[ \t]*){3,}$/.test(t)) return true;
  return false;
}

export function redistributeFootnotes(
  reviews: Array<{ content: string }>
): RedistributeStats {
  // 1. Harvest def pools. The gdoc export places the footnote block last,
  // so the def region runs from the first def-start line to the section's
  // end. Continuation lines (multi-paragraph notes) belong to the
  // preceding def.
  const defs = new Map<string, string>();
  for (const review of reviews) {
    const lines = review.content.split('\n');
    let firstDefIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (DEF_START.test(lines[i])) {
        firstDefIdx = i;
        break;
      }
    }
    if (firstDefIdx < 0) continue;

    let current: { id: string; raw: string[] } | null = null;
    const flush = () => {
      if (!current) return;
      while (
        current.raw.length > 0 &&
        current.raw[current.raw.length - 1].trim() === ''
      ) {
        current.raw.pop();
      }
      if (!defs.has(current.id)) {
        defs.set(current.id, current.raw.join('\n'));
      }
      current = null;
    };
    for (let i = firstDefIdx; i < lines.length; i++) {
      const m = DEF_START.exec(lines[i]);
      if (m) {
        flush();
        current = { id: m[1], raw: [m[2]] };
      } else if (current) {
        current.raw.push(lines[i]);
      }
    }
    flush();

    // Remove the def region plus any separator rule / blank lines that
    // immediately precede it.
    let bodyEnd = firstDefIdx;
    while (bodyEnd > 0 && isSeparatorLine(lines[bodyEnd - 1])) bodyEnd--;
    review.content = lines.slice(0, bodyEnd).join('\n').replace(/\s+$/g, '');
  }

  // 2. Re-marry defs to the reviews that reference them, renumbering per
  // review in order of first appearance.
  const stats: RedistributeStats = {
    movedDefs: 0,
    deadRefs: 0,
    unreferencedDefIds: [],
  };
  const referenced = new Set<string>();
  for (const review of reviews) {
    const order: string[] = [];
    const newIdByOld = new Map<string, string>();
    for (const m of review.content.matchAll(REF_RE)) {
      const id = m[1];
      if (!defs.has(id) || newIdByOld.has(id)) continue;
      order.push(id);
      newIdByOld.set(id, String(order.length));
    }
    // Fresh non-global regex: REF_RE is /g and .test() would leave a dirty
    // lastIndex behind for the next iteration's matchAll.
    if (order.length === 0 && !/\[\[\d+\]\]\(#ftnt\d+\)/.test(review.content)) {
      continue;
    }

    review.content = review.content.replace(
      REF_RE,
      (full, id: string) => {
        const newId = newIdByOld.get(id);
        if (newId === undefined) {
          // No def anywhere in the volume: downgrade to plain text.
          stats.deadRefs++;
          return `[${id}]`;
        }
        return `[[${newId}]](#ftnt${newId})`;
      }
    );

    if (order.length > 0) {
      const defBlock = order
        .map((oldId, i) => `[[${i + 1}]](#ftnt_ref${i + 1}) ${defs.get(oldId)}`)
        .join('\n\n');
      review.content = `${review.content.replace(/\s+$/g, '')}\n\n${defBlock}`;
      stats.movedDefs += order.length;
      for (const oldId of order) referenced.add(oldId);
    }
  }

  for (const id of defs.keys()) {
    if (!referenced.has(id)) stats.unreferencedDefIds.push(id);
  }
  return stats;
}
