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
  if (
    /\[\d+\]\(#sdfootnote\d+sym\)/.test(md) ||
    /^\[\d+\]\(#sdfootnote\d+anc\)/m.test(md)
  ) {
    return 'sdfootnote';
  }
  if (
    /\[\[\d+\]\]\(#ftnt\d+\)/.test(md) ||
    /^\[\[\d+\]\]\(#ftntref\d+\)/m.test(md)
  ) {
    return 'ftnt';
  }
  if (/\[\d+\]\(https?:\/\/[^)]*#fn:[^)]+\)/.test(md)) return 'fn';
  // Plain: a trailing block of `[N] content` lines at end of document
  const lines = md.split('\n');
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  if (i >= 0 && /^\[\d+\][ \t]/.test(lines[i])) return 'plain';
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

  // Replace in-text references — only those with a matching def. Orphans pass through.
  const seen = new Set<string>();
  body = body.replace(/\[(\d+)\]\(#sdfootnote\d+sym\)/g, (full, id: string) => {
    if (!defs.has(id)) return full;
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
  body = body.replace(/\[\[(\d+)\]\]\(#ftnt\d+\)/g, (full, id: string) => {
    if (!defs.has(id)) return full;
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
      const withoutBullet = item.replace(/^\d+\.[ \t]+/, '');
      const backRefMatch = /\[↩\]\(https?:\/\/[^)]*#fnref:([^)]+)\)/.exec(withoutBullet);
      if (!backRefMatch) continue;
      const name = backRefMatch[1];
      const cleaned = withoutBullet.replace(backRefMatch[0], '').trim();
      defsByName.set(name, cleaned);
    }

    body = md.slice(0, sectionStart).replace(/\s+$/g, '') + '\n';
  }

  const firstSeenById = new Set<string>();
  body = body.replace(
    /\[(\d+)\]\(https?:\/\/[^)]*#fn:([^)]+)\)/g,
    (_full, id: string) => {
      const first = !firstSeenById.has(id);
      firstSeenById.add(id);
      return REF_MARKER(id, first);
    }
  );

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

function extractPlain(md: string): ExtractedFootnotes {
  const lines = md.split('\n');
  const defs: Array<{ id: string; content: string }> = [];

  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === '') i--;

  const defIndices: number[] = [];
  while (i >= 0) {
    const line = lines[i];
    const match = /^\[(\d+)\][ \t](.*)$/.exec(line);
    if (!match) break;
    defs.unshift({ id: match[1], content: match[2] });
    defIndices.unshift(i);
    i--;
  }

  if (defs.length === 0) {
    return { body: md, footnotes: [] };
  }

  const firstDefIdx = defIndices[0];
  const body = lines.slice(0, firstDefIdx).join('\n').replace(/\s+$/g, '') + '\n';

  const defById = new Map<string, string>();
  for (const d of defs) defById.set(d.id, d.content);

  const seen = new Set<string>();
  const idsRegex = Array.from(defById.keys()).join('|');
  const bodyWithMarkers = body.replace(
    new RegExp(`(?<!\\[)\\[(${idsRegex})\\](?!\\()`, 'g'),
    (full, id: string) => {
      if (!defById.has(id)) return full;
      const first = !seen.has(id);
      seen.add(id);
      return REF_MARKER(id, first);
    }
  );

  const orderedIds: string[] = [];
  const orderSeen = new Set<string>();
  const orderRegex = /data-fn-id="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = orderRegex.exec(bodyWithMarkers)) !== null) {
    const id = m[1];
    if (!orderSeen.has(id)) {
      orderSeen.add(id);
      orderedIds.push(id);
    }
  }

  const footnotes: ExtractedFootnote[] = [];
  for (const id of orderedIds) {
    const content = defById.get(id);
    if (content === undefined) continue;
    footnotes.push({ id, raw: content });
  }
  for (const d of defs) {
    if (!orderSeen.has(d.id)) footnotes.push({ id: d.id, raw: d.content });
  }

  return { body: bodyWithMarkers, footnotes };
}

interface CodeChunk { kind: 'code'; content: string; }
interface TextChunk { kind: 'text'; content: string; }
type Chunk = CodeChunk | TextChunk;

function splitFencedCode(md: string): Chunk[] {
  const chunks: Chunk[] = [];
  const fenceRegex = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(md)) !== null) {
    if (m.index > last) {
      chunks.push({ kind: 'text', content: md.slice(last, m.index) });
    }
    chunks.push({ kind: 'code', content: m[0] });
    last = m.index + m[0].length;
  }
  if (last < md.length) {
    chunks.push({ kind: 'text', content: md.slice(last) });
  }
  return chunks;
}

export function extractFootnotes(markdown: string): ExtractedFootnotes {
  const chunks = splitFencedCode(markdown);
  const textOnly = chunks
    .filter((c): c is TextChunk => c.kind === 'text')
    .map((c) => c.content)
    .join('');

  const format = detectFormat(textOnly);
  if (format === 'none') {
    return { body: markdown, footnotes: [] };
  }

  const placeholders: string[] = [];
  const withPlaceholders = chunks
    .map((c) => {
      if (c.kind === 'code') {
        const i = placeholders.length;
        placeholders.push(c.content);
        return `\u0000CODEBLOCK${i}\u0000\n`;
      }
      return c.content;
    })
    .join('');

  let extracted: ExtractedFootnotes;
  switch (format) {
    case 'sdfootnote':
      extracted = extractSdfootnote(withPlaceholders);
      break;
    case 'ftnt':
      extracted = extractFtnt(withPlaceholders);
      break;
    case 'fn':
      extracted = extractFn(withPlaceholders);
      break;
    case 'plain':
      extracted = extractPlain(withPlaceholders);
      break;
    default:
      return { body: markdown, footnotes: [] };
  }

  const restored = extracted.body.replace(
    /\u0000CODEBLOCK(\d+)\u0000\n?/g,
    (_m, idx: string) => placeholders[Number(idx)]
  );

  return { body: restored, footnotes: extracted.footnotes };
}
