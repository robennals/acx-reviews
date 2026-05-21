export interface ExtractedFootnote {
  id: string;
  raw: string;
}

export interface ExtractedFootnotes {
  body: string;
  footnotes: ExtractedFootnote[];
}

type Format = 'sdfootnote' | 'ftnt' | 'fn' | 'pandoc' | 'plain' | 'bracket-colon' | 'none';

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
  // Pandoc / extended-markdown footnotes: `[^id]` for refs in body and
  // `[^id]: text` definitions at line start. Require BOTH to confirm —
  // a stray `[^id]` in code or prose isn't enough to claim the doc.
  if (/\[\^[^\]\s]+\]/.test(md) && /^\[\^[^\]\s]+\]:[ \t]/m.test(md)) {
    return 'pandoc';
  }
  // Bracket-colon: `[N: ...content... ]` defs, with body refs as plain
  // `[N]`. Used by "Money by Martin Amis". Require 2+ definition lines
  // so a stray editorial bracket like `[Edit: ...]` doesn't claim the
  // doc on its own.
  if ((md.match(/^[ \t]*\[\d+(?:\.\d+)?:[ \t]/gm) || []).length >= 2) {
    return 'bracket-colon';
  }
  // Plain: there's a trailing footnotes section ending at EOF. A
  // def-start is either `[N] content` (bracketed inline form) OR — if
  // the doc has NO bracketed defs at all — a bare `N` on its own line
  // (the number sits on its own line and the content paragraphs follow
  // underneath). The exclusivity guard is important: docs that mix
  // bracketed footnotes with body content like data tables (which
  // often contain bare numbers on their own lines) would otherwise
  // get those table values mis-detected as footnote defs.
  //
  // Walk back from EOF past trailing separators, blanks, def-starts,
  // and continuation lines (non-blank non-def lines that have at
  // least one def-start above them). If we encounter any def-start
  // in that walk, this is plain format.
  const lines = md.split('\n');
  const hasBracketed = lines.some(l => /^\[\d+\][ \t]/.test(l));
  const isDefStart = hasBracketed
    ? (s: string) => /^\[\d+\][ \t]/.test(s)
    : (s: string) => /^\[\d+\][ \t]/.test(s) || /^\d+[ \t]*$/.test(s);
  const defLineIndices: number[] = [];
  for (let k = 0; k < lines.length; k++) {
    if (isDefStart(lines[k])) defLineIndices.push(k);
  }
  if (defLineIndices.length === 0) return 'none';
  let i = lines.length - 1;
  while (i >= 0 && isTrailingSeparator(lines[i])) i--;
  while (i >= 0) {
    if (isDefStart(lines[i])) return 'plain';
    if (lines[i].trim() === '') { i--; continue; }
    // Non-blank, non-def. Continuation only if some def-line sits above.
    if (defLineIndices.some(idx => idx < i)) { i--; continue; }
    break;
  }
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

function extractPandoc(md: string): ExtractedFootnotes {
  // Pandoc-style footnotes:
  //   body:   `prose...[^1] more prose...`
  //   defs:   `[^1]: text continuing on subsequent indented lines`
  // Definitions live at the bottom of the doc, each starting at column 0
  // with `[^id]:`; continuation lines are indented by one or more spaces.
  // The id is any run of non-`]`, non-whitespace characters (typically
  // a number, but pandoc also allows named refs like `[^note-foo]`).
  const lines = md.split('\n');
  const defStart = /^\[\^([^\]\s]+)\]:[ \t]?(.*)$/;
  const items: Array<{ id: string; raw: string[] }> = [];
  let firstDefLine = -1;
  let current: { id: string; raw: string[] } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = defStart.exec(lines[i]);
    if (m) {
      if (firstDefLine < 0) firstDefLine = i;
      if (current) items.push(current);
      current = { id: m[1], raw: [m[2]] };
    } else if (current) {
      // Continuation: indented line, or blank between paragraphs of the
      // same def. A line with content at column 0 ends the current def
      // (and the run of defs, since defs must be contiguous at the
      // bottom of the doc).
      if (lines[i].trim() === '') {
        current.raw.push('');
      } else if (/^[ \t]/.test(lines[i])) {
        current.raw.push(lines[i].replace(/^[ \t]+/, ''));
      } else {
        // Column-0 non-blank, non-def: definitions block ended above.
        // Push the current def and stop scanning.
        items.push(current);
        current = null;
        break;
      }
    }
  }
  if (current) items.push(current);

  // De-dupe by id (keep first occurrence) and collect.
  const seen = new Set<string>();
  const footnotes: ExtractedFootnote[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    // Trim trailing blank lines from the raw block.
    const raw = it.raw.join('\n').replace(/\s+$/g, '').trim();
    footnotes.push({ id: it.id, raw });
  }

  // Body: everything before the first def line, with `[^id]` refs in body
  // rewritten to numbered sup markers. If the id isn't purely numeric,
  // assign a sequential number in order of first appearance.
  const idToNumber = new Map<string, string>();
  let nextNum = 1;
  for (const fn of footnotes) {
    if (/^\d+$/.test(fn.id)) idToNumber.set(fn.id, fn.id);
    else idToNumber.set(fn.id, String(nextNum));
    nextNum++;
  }

  let body = firstDefLine >= 0
    ? lines.slice(0, firstDefLine).join('\n')
    : md;
  const seenInBody = new Set<string>();
  body = body.replace(/\[\^([^\]\s]+)\]/g, (full, id: string) => {
    const num = idToNumber.get(id);
    if (!num) return full;
    const first = !seenInBody.has(num);
    seenInBody.add(num);
    return REF_MARKER(num, first);
  });

  // Renumber footnote ids in the output so renderers can use sequential
  // anchors that match the in-body refs.
  const renumbered: ExtractedFootnote[] = footnotes.map(fn => ({
    id: idToNumber.get(fn.id) ?? fn.id,
    raw: fn.raw,
  }));

  body = body.replace(/\n{3,}$/g, '\n\n').replace(/\s+$/g, '') + '\n';
  return { body, footnotes: renumbered };
}

function extractPlain(md: string): ExtractedFootnotes {
  const lines = md.split('\n');
  // A def-start is either `[N] content` (bracketed inline) or — if the
  // doc has NO bracketed defs anywhere — a bare `N` on its own line.
  // The exclusivity guard matches detectFormat above and prevents bare
  // table-cell values from being mis-detected as footnote defs.
  const hasBracketed = lines.some(l => /^\[\d+\][ \t]/.test(l));
  const matchDefStart = (s: string): { id: string; inline: string } | null => {
    const m1 = /^\[(\d+)\][ \t](.*)$/.exec(s);
    if (m1) return { id: m1[1], inline: m1[2] };
    if (hasBracketed) return null;
    const m2 = /^(\d+)[ \t]*$/.exec(s);
    if (m2) return { id: m2[1], inline: '' };
    return null;
  };
  const isDefStart = (s: string) => matchDefStart(s) !== null;

  // Find all def-start lines in the doc. Their indices let us tell,
  // while walking back, whether a non-def line could belong to an
  // earlier def (i.e. is footnote-continuation) versus body content
  // above the footnotes section.
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
    const m = matchDefStart(lines[k]);
    if (m) {
      const contentLines: string[] = m.inline ? [m.inline] : [];
      let n = k + 1;
      while (n <= endIdx && !isDefStart(lines[n])) {
        contentLines.push(lines[n]);
        n++;
      }
      // Trim leading blanks (bare-number form puts a blank between the
      // number and the content) and trailing blanks off the def's
      // content.
      while (contentLines.length > 0 && contentLines[0].trim() === '') {
        contentLines.shift();
      }
      while (
        contentLines.length > 1 &&
        contentLines[contentLines.length - 1].trim() === ''
      ) {
        contentLines.pop();
      }
      defs.push({ id: m.id, content: contentLines.join('\n').replace(/\s+$/, '') });
      k = n;
    } else {
      k++;
    }
  }

  if (defs.length === 0) {
    return { body: md, footnotes: [] };
  }

  // If the author added their own "Footnotes" heading right before the
  // defs (e.g. "### Footnotes", "## FOOTNOTES", "## Footnotes:",
  // "## Endnotes"), drop it — the render layer adds its own
  // <h2>Footnotes</h2> and we'd otherwise show a duplicate. Walk back from
  // firstDefIdx past blanks; if the next non-blank line is a heading that
  // is just the word "Footnotes" or "Endnotes" (case-insensitive, optional
  // trailing colon), strip from there.
  let bodyEndIdx = firstDefIdx;
  {
    let j = firstDefIdx - 1;
    while (j >= 0 && lines[j].trim() === '') j--;
    if (j >= 0 && /^#{1,6}\s+(footnotes|endnotes)\s*:?\s*$/i.test(lines[j])) {
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

/**
 * Bracket-colon format: definitions look like `[N: content content content]`
 * with the closing bracket potentially many lines below. Body refs are plain
 * `[N]`. Content may include nested `[…]` (editorial inserts in quotations,
 * markdown link refs like `[text](url)`) — so we bracket-balance forward
 * from each opener.
 */
function extractBracketColon(md: string): ExtractedFootnotes {
  type Def = { id: string; content: string; start: number; end: number };
  const defs: Def[] = [];
  // Anchor each def-start to the beginning of a line. A body-internal
  // `[Edit: ...]` inside a sentence wouldn't be flagged here, only ones
  // sitting on their own line.
  const startRe = /^[ \t]*\[(\d+(?:\.\d+)?):[ \t]+/gm;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(md)) !== null) {
    const id = m[1];
    // Bracket-balance forward to find the matching `]`.
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < md.length && depth > 0) {
      const ch = md[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    if (depth !== 0) continue;
    const contentText = md.slice(m.index + m[0].length, i).trim();
    defs.push({ id, content: contentText, start: m.index, end: i + 1 });
    startRe.lastIndex = i + 1;
  }
  if (defs.length < 2) return { body: md, footnotes: [] };

  // Defs must form a contiguous trailing block — only whitespace between
  // consecutive defs. Otherwise this isn't a footnote section, just stray
  // matches.
  for (let k = 0; k < defs.length - 1; k++) {
    const between = md.slice(defs[k].end, defs[k + 1].start);
    if (between.replace(/\s/g, '') !== '') return { body: md, footnotes: [] };
  }

  // Body ends at start of first def. Strip a trailing `## Footnotes` /
  // `## Endnotes` heading (with any preceding blanks) so the render layer
  // can supply its own.
  const before = md.slice(0, defs[0].start);
  const bodyLines = before.split('\n');
  let lastIdx = bodyLines.length - 1;
  while (lastIdx >= 0 && bodyLines[lastIdx].trim() === '') lastIdx--;
  if (lastIdx >= 0 && /^#{1,6}\s+(footnotes|endnotes)\s*:?\s*$/i.test(bodyLines[lastIdx])) {
    lastIdx--;
  }
  const body = bodyLines.slice(0, lastIdx + 1).join('\n').replace(/\s+$/g, '') + '\n';

  const defById = new Map<string, string>();
  for (const d of defs) defById.set(d.id, d.content);

  const seen = new Set<string>();
  const idsAlt = Array.from(defById.keys())
    .map(id => id.replace(/\./g, '\\.'))
    .join('|');
  const bodyWithMarkers = body.replace(
    new RegExp(`(?<!\\[)\\[(${idsAlt})\\](?!\\()`, 'g'),
    (full, id: string) => {
      if (!defById.has(id)) return full;
      const first = !seen.has(id);
      seen.add(id);
      return REF_MARKER(id, first);
    }
  );

  // Order footnotes by their first appearance in body; unreferenced ones
  // follow at the end.
  const orderedIds: string[] = [];
  const orderSeen = new Set<string>();
  const orderRegex = /data-fn-id="([^"]+)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = orderRegex.exec(bodyWithMarkers)) !== null) {
    if (!orderSeen.has(mm[1])) {
      orderSeen.add(mm[1]);
      orderedIds.push(mm[1]);
    }
  }
  const footnotes: ExtractedFootnote[] = [];
  for (const id of orderedIds) {
    const content = defById.get(id);
    if (content !== undefined) footnotes.push({ id, raw: content });
  }
  for (const d of defs) {
    if (!orderSeen.has(d.id)) footnotes.push({ id: d.id, raw: d.content });
  }

  return { body: bodyWithMarkers, footnotes };
}

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
    case 'pandoc':
      extracted = extractPandoc(withPlaceholders);
      break;
    case 'plain':
      extracted = extractPlain(withPlaceholders);
      break;
    case 'bracket-colon':
      extracted = extractBracketColon(withPlaceholders);
      break;
    default:
      return { body: markdown, footnotes: [] };
  }

  // Sanity check: if the extracted footnotes exceed *half* the doc
  // length, the format detector probably swallowed body content. The
  // original threshold was 20% but that misfires on legitimate
  // citation-heavy essays — Holy Quran's 31 trailing footnotes are
  // 40% of the doc and ARE real footnotes. The pathological cases we
  // want to catch (How I Killed Pluto's inline-per-section pattern)
  // sweep up so much body that extraction routinely tops 80%+.
  //
  // Only apply on essays large enough for the ratio to be meaningful;
  // unit tests use tiny synthetic inputs where a 26-char footnote in
  // a 100-char document trivially exceeds any percentage threshold.
  if (markdown.length > 2000) {
    const fnTotal = extracted.footnotes
      .reduce((sum, f) => sum + (f.raw?.length || 0), 0);
    if (fnTotal > markdown.length / 2) {
      return { body: markdown, footnotes: [] };
    }
  }

  // Strip a trailing "Footnotes" / "Endnotes" section heading from the
  // body — every format leaves the body ending just before the
  // footnote-defs region, and the render layer adds its own
  // <h2>Footnotes</h2> next to the extracted defs, so leaving the
  // author's heading would show two of them. Case-insensitive and
  // allows an optional trailing colon. Catches `## FOOTNOTES`,
  // `### Footnotes`, `# Footnotes:`, `## Endnotes`, etc.
  const bodyWithoutTrailingHeading = extracted.body.replace(
    /\n*^#{1,6}[ \t]+(footnotes|endnotes)[ \t]*:?[ \t]*\s*$/im,
    ''
  );
  const restored = bodyWithoutTrailingHeading.replace(
    /\u0000CODEBLOCK(\d+)\u0000\n?/g,
    (_m, idx: string) => placeholders[Number(idx)]
  );

  return { body: restored, footnotes: extracted.footnotes };
}
