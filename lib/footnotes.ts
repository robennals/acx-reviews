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

function extractFtnt(md: string): ExtractedFootnotes {
  const defRegex = /^\[\[(\d+)\]\]\(#ftntref\d+\)[ \t]?(.*)$/gm;
  const defs = new Map<string, string[]>();
  const defLineRanges: Array<[number, number]> = [];
  let match: RegExpExecArray | null;

  while ((match = defRegex.exec(md)) !== null) {
    const id = match[1];
    const firstLine = match[2];
    const startIdx = match.index;
    const lineEnd = md.indexOf('\n', startIdx);
    let endIdx = lineEnd === -1 ? md.length : lineEnd;
    const lines = [firstLine];
    let cursor = endIdx + 1;
    while (cursor < md.length) {
      const nextLineEnd = md.indexOf('\n', cursor);
      const nextLine = md.slice(cursor, nextLineEnd === -1 ? md.length : nextLineEnd);
      if (/^\[\[\d+\]\]\(#ftntref\d+\)/.test(nextLine)) break;
      lines.push(nextLine);
      endIdx = nextLineEnd === -1 ? md.length : nextLineEnd;
      if (nextLineEnd === -1) break;
      cursor = nextLineEnd + 1;
    }
    defs.set(id, lines);
    defLineRanges.push([startIdx, endIdx]);
  }

  let body = md;
  for (let i = defLineRanges.length - 1; i >= 0; i--) {
    const [start, end] = defLineRanges[i];
    body = body.slice(0, start) + body.slice(end);
  }

  const seen = new Set<string>();
  body = body.replace(/\[\[(\d+)\]\]\(#ftnt\d+\)/g, (_m, id: string) => {
    const first = !seen.has(id);
    seen.add(id);
    return REF_MARKER(id, first);
  });

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
    footnotes.push({ id, raw: lines.join('\n').trim() });
  }
  for (const [id, lines] of defs) {
    if (!orderSeen.has(id)) {
      footnotes.push({ id, raw: lines.join('\n').trim() });
    }
  }

  body = body.replace(/\n{3,}$/g, '\n\n').replace(/\s+$/g, '') + '\n';
  return { body, footnotes };
}

function extractFn(md: string): ExtractedFootnotes {
  // Locate and strip the trailing `## Footnotes` section
  const footnotesHeadingMatch = /^##[ \t]+Footnotes[ \t]*$/m.exec(md);
  const defsByName = new Map<string, string>();
  let body = md;

  if (footnotesHeadingMatch) {
    const sectionStart = footnotesHeadingMatch.index;
    const section = md.slice(sectionStart);
    const items: string[] = [];
    const lines = section.split('\n').slice(1); // drop heading
    let current: string[] = [];
    let inItem = false;
    for (const line of lines) {
      if (/^\d+\.[ \t]+/.test(line)) {
        if (inItem) items.push(current.join('\n'));
        current = [line];
        inItem = true;
      } else if (inItem) {
        current.push(line);
      }
    }
    if (inItem) items.push(current.join('\n'));

    for (const item of items) {
      // Strip the leading "N.  " bullet
      const withoutBullet = item.replace(/^\d+\.[ \t]+/, '');
      // Find back-link: capture its `fnref:name` and remove the whole `[↩](...#fnref:NAME)`
      const backRefMatch = /\[↩\]\(https?:\/\/[^)]*#fnref:([^)]+)\)/.exec(withoutBullet);
      if (!backRefMatch) continue;
      const name = backRefMatch[1];
      const cleaned = withoutBullet.replace(backRefMatch[0], '').trim();
      defsByName.set(name, cleaned);
    }

    body = md.slice(0, sectionStart).replace(/\s+$/g, '') + '\n';
  }

  // Replace in-text refs. The number in `[N]` is authoritative; the name is the key.
  const firstSeenById = new Set<string>();
  body = body.replace(
    /\[(\d+)\]\(https?:\/\/[^)]*#fn:([^)]+)\)/g,
    (_full, id: string) => {
      const first = !firstSeenById.has(id);
      firstSeenById.add(id);
      return REF_MARKER(id, first);
    }
  );

  // Build ordered footnotes by body-appearance id, looking up raw by name.
  // Re-walk the original md's ref order (id+name).
  const idToName = new Map<string, string>();
  const reScan = /\[(\d+)\]\(https?:\/\/[^)]*#fn:([^)]+)\)/g;
  let r: RegExpExecArray | null;
  while ((r = reScan.exec(md)) !== null) {
    if (!idToName.has(r[1])) idToName.set(r[1], r[2]);
  }

  const footnotes: ExtractedFootnote[] = [];
  const addedIds = new Set<string>();
  for (const [id, name] of idToName) {
    if (addedIds.has(id)) continue;
    const raw = defsByName.get(name);
    if (raw === undefined) continue;
    footnotes.push({ id, raw });
    addedIds.add(id);
  }

  body = body.replace(/\n{3,}$/g, '\n\n').replace(/\s+$/g, '') + '\n';
  return { body, footnotes };
}

export function extractFootnotes(markdown: string): ExtractedFootnotes {
  const format = detectFormat(markdown);
  switch (format) {
    case 'sdfootnote':
      return extractSdfootnote(markdown);
    case 'ftnt':
      return extractFtnt(markdown);
    case 'fn':
      return extractFn(markdown);
    default:
      return { body: markdown, footnotes: [] };
  }
}
