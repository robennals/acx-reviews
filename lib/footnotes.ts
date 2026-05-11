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

// Matches trailing "separator" lines that can appear after plain-bracket footnote
// definitions: blank lines and markdown horizontal rules (`* * *`, `---`, `___`).
function isTrailingSeparator(line: string): boolean {
  const t = line.trim();
  if (t === '') return true;
  if (/^(\*[ \t]*){3,}$/.test(t)) return true;
  if (/^(-[ \t]*){3,}$/.test(t)) return true;
  if (/^(_[ \t]*){3,}$/.test(t)) return true;
  return false;
}

function detectFormat(md: string): Format {
  if (
    /\[\d+\]\(#sdfootnote\d+sym\)/.test(md) ||
    /^\[\d+\]\(#sdfootnote\d+anc\)/m.test(md)
  ) {
    return 'sdfootnote';
  }
  if (
    /\[\[\d+\]\]\(#ftnt\d+\)/.test(md) ||
    /^\[\[\d+\]\]\(#ftnt_?ref\d+\)/m.test(md)
  ) {
    return 'ftnt';
  }
  if (/\[\d+\]\(https?:\/\/[^)]*#fn:[^)]+\)/.test(md)) return 'fn';
  // Plain: a trailing block of `[N] content` lines at end of document
  // (allowing trailing blank lines and separators like `* * *`).
  const lines = md.split('\n');
  let i = lines.length - 1;
  while (i >= 0 && isTrailingSeparator(lines[i])) i--;
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
  const defRegex = /^\[\[(\d+)\]\]\(#ftnt_?ref\d+\)[ \t]?(.*)$/gm;
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
      if (/^\[\[\d+\]\]\(#ftnt_?ref\d+\)/.test(nextLine)) break;
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
  const defsByName = new Map<string, string>();
  let body = md;

  // Locate the trailing def region. Prefer an explicit `## Footnotes` heading when
  // present; otherwise fall back to the earliest top-level numbered list item that
  // ends with a `[↩](...#fnref:NAME)` back-link (kramdown without heading).
  const footnotesHeadingMatch = /^##[ \t]+Footnotes[ \t]*$/m.exec(md);
  let sectionStart = -1;
  let sectionFromLine = 0;

  if (footnotesHeadingMatch) {
    sectionStart = footnotesHeadingMatch.index;
    sectionFromLine = 1; // drop heading
  } else {
    // Walk lines, find contiguous trailing block of numbered list items with back-links.
    const lines = md.split('\n');
    const backRefRegex = /\[↩\]\(https?:\/\/[^)]*#fnref:([^)]+)\)/;
    // Find the highest index where a numbered item with a back-link exists.
    let lastBackRefLine = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\d+\.[ \t]+/.test(lines[i]) && backRefRegex.test(lines[i])) {
        lastBackRefLine = i;
        break;
      }
    }
    if (lastBackRefLine >= 0) {
      // Walk back from that line to find the start of the list block.
      let firstListLine = lastBackRefLine;
      for (let i = lastBackRefLine - 1; i >= 0; i--) {
        const line = lines[i];
        if (/^\d+\.[ \t]+/.test(line)) {
          firstListLine = i;
          continue;
        }
        if (line.trim() === '') {
          // Peek past blanks
          let j = i;
          while (j >= 0 && lines[j].trim() === '') j--;
          if (j >= 0 && /^\d+\.[ \t]+/.test(lines[j])) {
            i = j + 1;
            continue;
          }
          break;
        }
        // Continuation lines (indented) of current item — keep going
        if (/^[ \t]/.test(line) && firstListLine <= lastBackRefLine) continue;
        break;
      }
      sectionStart = lines.slice(0, firstListLine).join('\n').length + (firstListLine > 0 ? 1 : 0);
      sectionFromLine = 0;
    }
  }

  if (sectionStart >= 0) {
    const section = md.slice(sectionStart);
    const items: string[] = [];
    const lines = section.split('\n').slice(sectionFromLine);
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
      // Split into lines so we can strip the bullet from the first line and
      // dedent list-item continuations (kramdown indents these 4 spaces; left
      // as-is, remark parses them as code blocks).
      const rawLines = item.split('\n');
      if (rawLines.length === 0) continue;
      rawLines[0] = rawLines[0].replace(/^\d+\.[ \t]+/, '');
      for (let i = 1; i < rawLines.length; i++) {
        rawLines[i] = rawLines[i].replace(/^ {1,4}|^\t/, '');
      }
      let cleaned = rawLines.join('\n');

      const backRefMatch = /\[↩\]\(https?:\/\/[^)]*#fnref:([^)]+)\)/.exec(cleaned);
      if (!backRefMatch) continue;
      const name = backRefMatch[1];
      cleaned = cleaned.replace(backRefMatch[0], '');

      // Strip trailing blank lines and separator rules from the def content.
      const defLines = cleaned.split('\n');
      while (defLines.length > 0 && isTrailingSeparator(defLines[defLines.length - 1])) {
        defLines.pop();
      }
      cleaned = defLines.join('\n').trim();
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
  const isDefStart = (s: string) => /^\[\d+\][ \t]/.test(s);

  // Find all `[N] content` def-start lines in the doc. Their indices
  // let us tell, while walking back, whether a non-def line could
  // belong to an earlier def (i.e. is footnote-continuation) versus
  // body content above the footnotes section.
  const defLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isDefStart(lines[i])) defLineIndices.push(i);
  }
  if (defLineIndices.length === 0) {
    return { body: md, footnotes: [] };
  }

  // Find the trailing def region. Skip trailing blanks and separator rules.
  let endIdx = lines.length - 1;
  while (endIdx >= 0 && isTrailingSeparator(lines[endIdx])) endIdx--;
  if (endIdx < 0) {
    return { body: md, footnotes: [] };
  }

  // Walk back from endIdx, keeping:
  //   - def-start lines (`[N] content`)
  //   - blank lines
  //   - non-blank, non-def lines IF at least one def-start exists
  //     earlier in the doc — those lines are continuation paragraphs of
  //     an earlier footnote def (multi-paragraph footnote content).
  // Stop when we hit a non-blank, non-def line with no def above it —
  // that's where the body ends and the trailing footnotes region
  // begins.
  let firstDefIdx = -1;
  for (let i = endIdx; i >= 0; i--) {
    const line = lines[i];
    if (isDefStart(line)) {
      firstDefIdx = i;
      continue;
    }
    if (line.trim() === '') continue;
    // Non-blank, non-def. Continuation only if some def-line sits above.
    if (defLineIndices.some(idx => idx < i)) continue;
    break;
  }
  if (firstDefIdx < 0) {
    return { body: md, footnotes: [] };
  }

  // Collect defs, concatenating continuation paragraphs that follow
  // each def-start up to the next def-start (or end of region).
  const defs: Array<{ id: string; content: string }> = [];
  let k = firstDefIdx;
  while (k <= endIdx) {
    const m = /^\[(\d+)\][ \t](.*)$/.exec(lines[k]);
    if (m) {
      const id = m[1];
      const contentLines: string[] = [m[2]];
      let n = k + 1;
      while (n <= endIdx && !isDefStart(lines[n])) {
        contentLines.push(lines[n]);
        n++;
      }
      // Trim trailing blank lines off the def's content.
      while (
        contentLines.length > 1 &&
        contentLines[contentLines.length - 1].trim() === ''
      ) {
        contentLines.pop();
      }
      defs.push({ id, content: contentLines.join('\n').replace(/\s+$/, '') });
      k = n;
    } else {
      k++;
    }
  }

  if (defs.length === 0) {
    return { body: md, footnotes: [] };
  }

  // If the author added their own "Footnotes" heading right before the
  // defs (e.g. "### Footnotes"), drop it — the render layer adds its own
  // <h2>Footnotes</h2> and we'd otherwise show a duplicate. Walk back from
  // firstDefIdx past blanks; if the next non-blank line is a heading that
  // is just the word "Footnotes", strip from there.
  let bodyEndIdx = firstDefIdx;
  {
    let j = firstDefIdx - 1;
    while (j >= 0 && lines[j].trim() === '') j--;
    if (j >= 0 && /^#{1,6}\s+Footnotes\s*$/.test(lines[j])) {
      bodyEndIdx = j;
    }
  }

  const body = lines.slice(0, bodyEndIdx).join('\n').replace(/\s+$/g, '') + '\n';

  const defById = new Map<string, string>();
  for (const d of defs) defById.set(d.id, d.content);

  const seen = new Set<string>();
  const idsRegex = Array.from(defById.keys()).join('|');
  let bodyWithMarkers = body.replace(
    new RegExp(`(?<!\\[)\\[(${idsRegex})\\](?!\\()`, 'g'),
    (full, id: string) => {
      if (!defById.has(id)) return full;
      const first = !seen.has(id);
      seen.add(id);
      return REF_MARKER(id, first);
    }
  );

  // Fallback: if no `[N]` refs were rewritten, look for bare-digit refs.
  // The file clearly has trailing footnote defs, so we're looking for inline
  // markers that weren't bracketed (e.g. `future.1 The novel…`, `Metamorphosis1 is`,
  // `dating3,`). Allow a digit that:
  //   - follows a letter, close-quote, or sentence-end punctuation
  //   - is followed by whitespace, comma, semicolon, colon, or closing paren
  //   - is NOT the tail of a version/decimal number (preceding context `\d\.`)
  if (seen.size === 0) {
    bodyWithMarkers = bodyWithMarkers.replace(
      new RegExp(
        `(?<!\\d\\.)(?<=[A-Za-z.!?”’")])(${idsRegex})(?=[\\s,;:)]|$)`,
        'g'
      ),
      (full, id: string) => {
        if (!defById.has(id)) return full;
        const first = !seen.has(id);
        seen.add(id);
        return REF_MARKER(id, first);
      }
    );
  }

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
