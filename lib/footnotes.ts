export interface ExtractedFootnote {
  id: string;
  raw: string;
}

export interface ExtractedFootnotes {
  body: string;
  footnotes: ExtractedFootnote[];
}

type Format = 'sdfootnote' | 'ftnt' | 'fn' | 'plain' | 'none';

const REF_MARKER = (id: string, first: boolean) =>
  first
    ? `<sup class="fn-ref" data-fn-id="${id}" id="fn-ref-${id}">[${id}]</sup>`
    : `<sup class="fn-ref" data-fn-id="${id}">[${id}]</sup>`;

function detectFormat(md: string): Format {
  if (/\[\d+\]\(#sdfootnote\d+sym\)/.test(md)) return 'sdfootnote';
  if (/\[\[\d+\]\]\(#ftnt\d+\)/.test(md)) return 'ftnt';
  if (/\[\d+\]\(https?:\/\/[^)]*#fn:[^)]+\)/.test(md)) return 'fn';
  // plain is the fallback; only used when trailing `[N] ...` definition lines exist
  if (/\n\[\d+\][^(]/m.test(md)) return 'plain';
  return 'none';
}

function extractSdfootnote(md: string): ExtractedFootnotes {
  const defRegex = /^\[(\d+)\]\(#sdfootnote\d+anc\)[ \t]?(.*)$/gm;
  const defs = new Map<string, string[]>();
  const defLineRanges: Array<[number, number]> = [];
  let match: RegExpExecArray | null;

  // First pass: collect definitions and their starting positions
  while ((match = defRegex.exec(md)) !== null) {
    const id = match[1];
    const firstLine = match[2];
    const startIdx = match.index;
    const lineEnd = md.indexOf('\n', startIdx);
    const endIdx = lineEnd === -1 ? md.length : lineEnd;
    // Greedy-extend: subsequent lines until next definition or end of doc
    let extendedEnd = endIdx;
    const lines = [firstLine];
    let cursor = endIdx + 1;
    while (cursor < md.length) {
      const nextLineEnd = md.indexOf('\n', cursor);
      const nextLine = md.slice(cursor, nextLineEnd === -1 ? md.length : nextLineEnd);
      if (/^\[\d+\]\(#sdfootnote\d+anc\)/.test(nextLine)) break;
      lines.push(nextLine);
      extendedEnd = nextLineEnd === -1 ? md.length : nextLineEnd;
      if (nextLineEnd === -1) break;
      cursor = nextLineEnd + 1;
    }
    defs.set(id, lines);
    defLineRanges.push([startIdx, extendedEnd]);
  }

  // Second pass: remove definition ranges (in reverse so indices stay valid)
  let body = md;
  for (let i = defLineRanges.length - 1; i >= 0; i--) {
    const [start, end] = defLineRanges[i];
    body = body.slice(0, start) + body.slice(end);
  }

  // Replace in-text references (first occurrence of each id gets id attribute)
  const seen = new Set<string>();
  body = body.replace(/\[(\d+)\]\(#sdfootnote\d+sym\)/g, (_m, id: string) => {
    const first = !seen.has(id);
    seen.add(id);
    return REF_MARKER(id, first);
  });

  // Build ordered footnote list in order of in-text appearance
  const orderedIds: string[] = [];
  const orderSeen = new Set<string>();
  const orderRegex = /data-fn-id="(\d+)"/g;
  let orderMatch: RegExpExecArray | null;
  while ((orderMatch = orderRegex.exec(body)) !== null) {
    const id = orderMatch[1];
    if (!orderSeen.has(id)) {
      orderSeen.add(id);
      orderedIds.push(id);
    }
  }

  const footnotes: ExtractedFootnote[] = [];
  for (const id of orderedIds) {
    const lines = defs.get(id);
    if (!lines) continue;
    const raw = lines.join('\n').trim();
    footnotes.push({ id, raw });
  }
  // Also include any defs that had no matching ref (appended at end in def order)
  for (const [id, lines] of defs) {
    if (!orderSeen.has(id)) {
      footnotes.push({ id, raw: lines.join('\n').trim() });
    }
  }

  // Trim trailing blank lines left behind
  body = body.replace(/\n{3,}$/g, '\n\n').replace(/\s+$/g, '') + '\n';

  return { body, footnotes };
}

export function extractFootnotes(markdown: string): ExtractedFootnotes {
  const format = detectFormat(markdown);
  switch (format) {
    case 'sdfootnote':
      return extractSdfootnote(markdown);
    default:
      return { body: markdown, footnotes: [] };
  }
}
