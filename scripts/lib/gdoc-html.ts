/**
 * Shared utilities for fetching and converting Google Docs HTML to Markdown.
 *
 * Used by fetch-from-gdocs.ts and any other scripts that need to ingest
 * Google Docs content.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import TurndownService from 'turndown';

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Remove Google Docs styling spans that add no value.
// IMPORTANT: must not strip spans that wrap images, and must not strip
// whitespace-only spans (see comment on the cheerio span cleanup).
turndownService.addRule('removeEmptySpans', {
  filter: (node) => {
    if (node.nodeName !== 'SPAN') return false;
    // Only remove spans with NO text content at all. Whitespace-only spans
    // carry meaningful word boundaries in current Google Docs HTML exports.
    if (node.textContent) return false;
    // Preserve spans that contain any image descendant.
    if ((node as Element).querySelector?.('img')) return false;
    return true;
  },
  replacement: () => '',
});

// Convert <table> to a GFM-style markdown table. Default Turndown drops
// table structure and just emits each cell as a separate paragraph,
// which loses the row/column relationship the author was conveying.
// We treat the first <tr> as the header row (Google Docs exports a
// flat list of <tr> elements without <thead>/<tbody>, so there's no
// other obvious header signal).
turndownService.addRule('gdocTable', {
  filter: 'table',
  replacement: (_content, node) => {
    const el = node as Element;
    const rows = Array.from(el.querySelectorAll('tr'));
    if (rows.length === 0) return '';
    const cellText = (cell: Element): string => {
      // Strip newlines and table-breaking chars inside a cell so the
      // row stays on one line. `|` inside a cell is escaped as `\|`
      // per CommonMark/GFM.
      return (cell.textContent || '')
        .replace(/\s+/g, ' ')
        .replace(/\|/g, '\\|')
        .trim();
    };
    const cellsOf = (row: Element) =>
      Array.from(row.querySelectorAll('th, td')).map(cellText);

    const headerCells = cellsOf(rows[0]);
    const colCount = headerCells.length;
    if (colCount === 0) return '';
    const headerLine = `| ${headerCells.join(' | ')} |`;
    const sepLine = `| ${headerCells.map(() => '---').join(' | ')} |`;
    const bodyLines = rows.slice(1).map(r => {
      const cells = cellsOf(r);
      // Pad short rows so the column count is consistent.
      while (cells.length < colCount) cells.push('');
      return `| ${cells.slice(0, colCount).join(' | ')} |`;
    });
    return ['', headerLine, sepLine, ...bodyLines, ''].join('\n');
  },
});

/**
 * Parse the <style> block from a Google Docs HTML export to identify
 * which CSS class names carry bold, italic, or indentation styling.
 *
 * Google Docs doesn't use semantic tags (<strong>, <em>, <blockquote>).
 * Instead it assigns CSS classes like `.c8{font-weight:700}` to spans
 * and paragraphs. We need to map class names to their semantic meaning
 * so we can insert proper HTML tags before Turndown conversion.
 */
interface GDocStyleMap {
  boldClasses: Set<string>;
  italicClasses: Set<string>;
  indentClasses: Set<string>; // classes with margin-left (blockquote candidates)
}

function parseGDocStyles(html: string): GDocStyleMap {
  const boldClasses = new Set<string>();
  const italicClasses = new Set<string>();
  const indentClasses = new Set<string>();

  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) return { boldClasses, italicClasses, indentClasses };

  const styleText = styleMatch[1];

  // Match CSS rules like .c8{font-weight:700;...}
  const ruleRe = /\.([a-z][a-z0-9]*)\{([^}]+)\}/g;
  let m;
  while ((m = ruleRe.exec(styleText)) !== null) {
    const cls = m[1];
    const props = m[2];

    if (/font-weight\s*:\s*700/.test(props)) {
      boldClasses.add(cls);
    }
    if (/font-style\s*:\s*italic/.test(props)) {
      italicClasses.add(cls);
    }
    // Detect blockquote-like indentation. Google Docs' blockquote feature
    // uses `margin-left: 36pt` (and usually `margin-right: 36pt` too). Body
    // paragraphs often use `margin-left: 18pt` as a stylistic choice, and
    // `text-indent` is just a first-line indent — neither is a blockquote.
    //
    // Accept a class as "indented" if EITHER:
    //   - margin-left is a deep indent (>= 36pt), OR
    //   - margin-left AND margin-right are BOTH set (indented both sides,
    //     which is characteristic of a blockquote regardless of depth).
    const marginLeftMatch = props.match(/margin-left\s*:\s*(\d+(?:\.\d+)?)pt/);
    const marginRightMatch = props.match(/margin-right\s*:\s*(\d+(?:\.\d+)?)pt/);
    const leftPt = marginLeftMatch ? parseFloat(marginLeftMatch[1]) : 0;
    const rightPt = marginRightMatch ? parseFloat(marginRightMatch[1]) : 0;
    if (leftPt >= 36) {
      indentClasses.add(cls);
    } else if (leftPt >= 18 && rightPt >= 18) {
      indentClasses.add(cls);
    }
  }

  return { boldClasses, italicClasses, indentClasses };
}

/**
 * Pre-process Google Docs HTML to insert semantic tags that Turndown
 * can recognize. Must be called after Cheerio load but before Turndown.
 *
 * 1. Wraps bold-styled spans in <strong>
 * 2. Wraps italic-styled spans in <em>
 * 3. Wraps indented paragraphs in <blockquote>
 */
function applySemanticTags($: CheerioAPI, styles: GDocStyleMap): void {
  // Bold: wrap span contents in <strong> if any of its classes are bold
  if (styles.boldClasses.size > 0) {
    $('span').each(function () {
      const el = $(this);
      const classes = (el.attr('class') || '').split(/\s+/);
      const isBold = classes.some(c => styles.boldClasses.has(c));
      if (isBold && el.text().trim()) {
        // Don't double-wrap if already inside <strong> or <b>.
        // Don't wrap inside headings — they're already prominent.
        if (!el.closest('strong, b, h1, h2, h3, h4, h5, h6').length) {
          el.wrapInner('<strong></strong>');
        }
      }
    });
  }

  // Italic: wrap span contents in <em> if any of its classes are italic
  if (styles.italicClasses.size > 0) {
    $('span').each(function () {
      const el = $(this);
      const classes = (el.attr('class') || '').split(/\s+/);
      const isItalic = classes.some(c => styles.italicClasses.has(c));
      if (isItalic && el.text().trim()) {
        if (!el.closest('em, i, h1, h2, h3, h4, h5, h6').length) {
          el.wrapInner('<em></em>');
        }
      }
    });
  }

  // Split paragraphs where the author faked a paragraph break with
  // <br> + a run of &nbsp; (first-line indent). Google Docs emits a single
  // <p> for the entire visual block and uses these break+indent patterns
  // to separate "paragraphs" inside it. Without splitting, the markdown
  // collapses into one run; the user sees a wall of text instead of a
  // multi-paragraph quote. The new <p> elements inherit the original
  // class so the blockquote-wrap pass below still picks them up.
  $('p').each(function () {
    const el = $(this);
    const html = el.html() || '';
    // 3+ nbsps after the <br> is the indent threshold — fewer is probably
    // just a normal line break with a small lead.
    const splitRe = /<br\s*\/?>\s*(?:(?:&nbsp;| )\s*){3,}/g;
    const allBrRe = /<br\s*\/?>/g;
    const indentedBrCount = (html.match(splitRe) || []).length;
    const totalBrCount = (html.match(allBrRe) || []).length;
    if (indentedBrCount === 0) return;
    // Guard: only split when *every* <br> in the paragraph is followed by
    // an indent. A mix of indented and plain <br>s is almost always poetry
    // (verse line breaks plus stanza-internal indent), and splitting there
    // tears bold/italic spans mid-stanza.
    if (indentedBrCount !== totalBrCount) return;
    // Guard 2: only split when the paragraph is in a blockquote-indent
    // class. The fake-paragraph-break-via-indent pattern is a feature of
    // long block quotations specifically; an isolated body paragraph with
    // internal <br>+nbsp runs is more likely an author's intentional
    // visual spacing where splitting would surprise them.
    const cls = el.attr('class') || '';
    const classes = cls.split(/\s+/);
    const isIndented = classes.some(c => styles.indentClasses.has(c));
    if (!isIndented) return;
    // Guard 3: every resulting paragraph-part must be paragraph-shaped —
    // at least 60 characters of plain text. Drop empty/whitespace-only
    // parts first (a leading <span> shell before the first <br>+indent
    // has no text content, but isn't an actual paragraph). Short
    // non-empty parts mean we're slicing through a list or short-line
    // content, not a multi-paragraph quote.
    const rawParts = html.split(splitRe).map(s => s.trim());
    const textLen = (p: string) => p.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;| /g, ' ').trim().length;
    const parts = rawParts.filter(p => textLen(p) > 0);
    if (parts.length < 2) return;
    if (parts.some(p => textLen(p) < 60)) return;
    const classAttr = cls ? ` class="${cls.replace(/"/g, '&quot;')}"` : '';
    const wrappers = parts.map(p => `<p${classAttr}>${p}</p>`).join('');
    el.replaceWith(wrappers);
  });

  // Blockquote: wrap each indented block in its own <blockquote>. Adjacent
  // single-block blockquotes in the HTML are collapsed into a single
  // multi-paragraph block later, at the markdown level, which avoids the
  // O(N²) DOM-move cost of grouping at the Cheerio level (every `.append()`
  // of an existing node triggers a linear search of the old parent's child
  // array, turning a run of N blocks into an N²-sized operation on large
  // docs — 2025's biggest chunk has thousands of <p> elements and caused
  // multi-minute stalls under the previous grouping approach).
  if (styles.indentClasses.size > 0) {
    const isElementIndented = (el: ReturnType<typeof $>) => {
      const classes = (el.attr('class') || '').split(/\s+/);
      if (classes.some(c => styles.indentClasses.has(c))) return true;
      // For ul/ol: check if list items are indented (deeper indent = nested in quote)
      const tag = el.prop('tagName')?.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        const firstLi = el.find('li').first();
        if (firstLi.length) {
          const liClasses = (firstLi.attr('class') || '').split(/\s+/);
          return liClasses.some(c => styles.indentClasses.has(c));
        }
      }
      return false;
    };

    const allBlocks = $('body > p, body > ul, body > ol, body > div > p, body > div > ul, body > div > ol').toArray();
    for (const block of allBlocks) {
      const el = $(block);
      if (!el.text().trim()) continue;
      if (isElementIndented(el)) {
        el.wrap('<blockquote></blockquote>');
      }
    }
  }

  // Strip leading `&nbsp;` runs on paragraphs — Google Docs authors often use
  // non-breaking spaces as a first-line indent for visual effect. These are
  // NOT a reliable signal of blockquoting (they appear on body paragraphs
  // just as often), so we just clean them up for readable output.
  $('p').each(function () {
    const el = $(this);
    const text = el.text();
    if (!/^\s*\u00a0{3,}/.test(text)) return;
    const firstSpan = el.find('span').first();
    const target = firstSpan.length ? firstSpan : el;
    const innerHtml = target.html() || '';
    const cleaned = innerHtml
      .replace(/^(<br\s*\/?>)?\s*((\u00a0|&nbsp;)\s*)+/, '')
      .trim();
    target.html(cleaned);
  });
}

/**
 * Clean up markdown output
 */
export function cleanupMarkdown(markdown: string): string {
  let md = markdown
    // Normalize non-breaking spaces to regular spaces. Google Docs inserts
    // `&nbsp;` (U+00A0) around italicized/bolded runs to prevent awkward
    // line-wraps in the rendered doc, but in markdown source they appear
    // as hard-to-see, hard-to-edit "weird spaces" and carry no meaningful
    // semantic in a markdown context.
    .replace(/\u00a0/g, ' ')
    // Remove escaped brackets
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    // Remove escaped parentheses
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    // Remove escaped dashes (anywhere — `\-` is never needed in markdown).
    // Turndown escapes these whenever a dash could be read as a bullet or
    // setext-heading underline, which includes mid-line contexts like
    // "summary: \- The Ottoman Empire ...".
    .replace(/\\-/g, '-')
    // Clean up multiple consecutive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove escaped asterisks at line starts (but preserve ** for bold)
    .replace(/^\\(\*[^*])/gm, '$1');

  // Dedent italic-only lines that start with significant leading
  // whitespace. Some authors indent poem lines via &nbsp; runs for
  // visual rhythm; after our nbsp→space normalization above, lines with
  // 4+ leading spaces would render as indented CODE BLOCKS in CommonMark,
  // turning the italic poetry into grey monospace text. The line is
  // safe to dedent because the entire content is wrapped in `_`-italic
  // (`_` is not a meaningful character in indented code blocks).
  md = md.replace(/^ {4,}(_[^_\n]+_[ \t]*)$/gm, '$1');

  // Quote-block detection: when a run of italic-only paragraphs is
  // followed (across blank lines) by a single blockquote-list-item
  // attribution like `> *   _Source_`, the gdoc author intended the
  // whole thing as one visual quote block. Prefix each italic line
  // with `>` so it joins the same blockquote group as the attribution.
  // The downstream poetry-compaction pass decides whether to render
  // the italic lines as verse (hard line breaks) or as separate
  // paragraphs based purely on line length.
  //
  // Guard: the `> *` line must be standalone — the next non-blank line
  // after it must NOT be another `> *`. A run of `> *` lines is a
  // bullet list, not a quote with attribution.
  {
    const isAttribution = (s: string) => /^>\s*\*\s+\S/.test(s);
    const isItalicOnly = (s: string) => /^\s*_[^_\n]+_[ \t]*$/.test(s);
    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!isAttribution(lines[i])) continue;
      let k = i + 1;
      while (k < lines.length && lines[k].trim() === '') k++;
      if (k < lines.length && isAttribution(lines[k])) continue;
      let start = i;
      let j = i - 1;
      while (j >= 0) {
        if (lines[j].trim() === '') { j--; continue; }
        if (isItalicOnly(lines[j])) { start = j; j--; continue; }
        break;
      }
      if (start === i) continue;
      for (let m = start; m < i; m++) {
        if (isItalicOnly(lines[m])) {
          lines[m] = `> ${lines[m].trim()}`;
        }
      }
    }
    md = lines.join('\n');
  }

  // Merge adjacent blockquote paragraphs separated by a single blank line
  // into a single multi-paragraph blockquote. We emit one <blockquote> per
  // indented block (to avoid O(N²) DOM moves during the GDoc→HTML pass);
  // this restores the multi-paragraph quote rendering at the markdown level.
  // Pattern: a blockquote line, blank line, another blockquote line. The
  // global match is non-overlapping, so a single pass merges chains.
  md = md.replace(/(^>.*)\n\n(?=>)/gm, '$1\n>\n');

  // Poetry-compaction pass for blockquotes. A multi-paragraph
  // blockquote whose every text paragraph is a single short line
  // (≤80 plain-text chars) is almost always poetry / song lyrics /
  // short verse-like content. Render those compactly:
  //   - Each non-last short text paragraph gets a trailing two-space
  //     hard line break instead of a blank-`>` separator.
  //   - The result is one multi-line paragraph inside the blockquote
  //     (rendered with `<br>` between lines) — the visual rhythm of
  //     verse is preserved without huge per-line vertical gaps.
  //
  // List items, nested blockquotes, and headings inside the
  // blockquote (e.g. a `> *   _Source_` attribution) are passed
  // through unchanged. If the blockquote contains ANY long text
  // paragraph or any multi-line text paragraph, we leave the whole
  // thing alone — prose blockquotes should keep their paragraph
  // structure.
  {
    const POETRY_THRESHOLD = 80;
    const isQuotePrefix = (s: string) => /^>/.test(s);
    const isQuoteBlank = (s: string) => /^>\s*$/.test(s);
    const isQuoteListItem = (s: string) => /^>\s*([-*]\s|\d+\.\s)/.test(s);
    const isQuoteNested = (s: string) => /^>\s*>/.test(s);
    const isQuoteHeading = (s: string) => /^>\s*#/.test(s);
    const isQuoteText = (s: string) =>
      isQuotePrefix(s) &&
      !isQuoteBlank(s) &&
      !isQuoteListItem(s) &&
      !isQuoteNested(s) &&
      !isQuoteHeading(s);
    const plainTextLen = (s: string) =>
      s.replace(/^>\s*/, '').replace(/[*_~`]/g, '').trim().length;

    const lines = md.split('\n');
    let i = 0;
    while (i < lines.length) {
      if (!isQuotePrefix(lines[i])) { i++; continue; }
      // Find the extent of this blockquote group (maximal run of `>` lines).
      const groupStart = i;
      while (i < lines.length && isQuotePrefix(lines[i])) i++;
      const groupEnd = i - 1;

      // Within the group, find contiguous spans of text-paragraphs
      // (each span = consecutive text-paragraphs separated by single
      // blank-`>` lines). Each text paragraph must be a SINGLE line —
      // a multi-line paragraph (consecutive non-blank-`>` lines) is
      // left untouched.
      let g = groupStart;
      while (g <= groupEnd) {
        if (!isQuoteText(lines[g])) { g++; continue; }
        // Try to extend a run starting at g.
        const runIdxs: number[] = [];
        let h = g;
        while (h <= groupEnd) {
          if (!isQuoteText(lines[h])) break;
          // Require this text line to be followed (within the group)
          // by either a blank-`>` line, the end of the group, or a
          // non-text quote line (list/nested/heading). If followed by
          // another text line, it's a multi-line paragraph — abort.
          const nextIsBlank = h + 1 > groupEnd || isQuoteBlank(lines[h + 1]);
          const nextIsBoundary = h + 1 > groupEnd ||
            isQuoteListItem(lines[h + 1]) ||
            isQuoteNested(lines[h + 1]) ||
            isQuoteHeading(lines[h + 1]);
          if (!nextIsBlank && !nextIsBoundary) {
            // Multi-line paragraph — skip the whole paragraph and
            // abandon this run.
            runIdxs.length = 0;
            while (h <= groupEnd && isQuoteText(lines[h])) h++;
            break;
          }
          runIdxs.push(h);
          h++;
          // Skip blank-`>` separators to look for the next text line.
          while (h <= groupEnd && isQuoteBlank(lines[h])) h++;
        }

        // Compact runs of 2+ short text paragraphs.
        if (
          runIdxs.length >= 2 &&
          runIdxs.every(idx => {
            const L = plainTextLen(lines[idx]);
            return L > 0 && L <= POETRY_THRESHOLD;
          })
        ) {
          // For every non-last entry: add trailing two spaces (hard
          // line break) and blank out any blank-`>` between this and
          // the next entry. The last entry stays as-is.
          for (let k = 0; k < runIdxs.length - 1; k++) {
            if (!/  $/.test(lines[runIdxs[k]])) lines[runIdxs[k]] = `${lines[runIdxs[k]]}  `;
            for (let b = runIdxs[k] + 1; b < runIdxs[k + 1]; b++) {
              lines[b] = ' DEL';
            }
          }
        }
        g = h;
      }
      // Continue scanning past this group.
    }
    md = lines.filter(l => l !== ' DEL').join('\n');
  }

  // Normalize thematic-break paragraphs that turndown escaped. When an
  // author types "***" or "---" as paragraph text (instead of using a
  // proper Google Docs horizontal rule), turndown half-escapes it (e.g.
  // "*\*\*" or "\*\*\*"), and the result doesn't render as anything in
  // the final HTML. Replace each such line with the standard "* * *"
  // thematic break. Matches lines that consist only of 3+ instances of
  // the same break character (`*`, `-`, `_`), with any escaping or
  // spacing — but ONLY when the line is on its own (surrounded by
  // blanks), to avoid touching legitimate emphasis runs.
  md = md.replace(
    /^(?:\\?[*\-_]){3,}\s*$/gm,
    (line) => {
      const chars = line.replace(/\\/g, '').replace(/\s/g, '');
      const c = chars[0];
      if (chars.length < 3 || !chars.split('').every((x) => x === c)) return line;
      return `${c} ${c} ${c}`;
    }
  );

  // Promote bold-only short standalone lines to H2 subheadings. Some
  // authors style their subheadings as bold (sometimes also underlined
  // or larger font) instead of using a proper Heading-2 style in
  // Google Docs. Turndown drops the visual styling, leaving "**Title**"
  // on a line by itself — which renders as a quiet inline bold span
  // rather than the prominent section break the author intended.
  //
  // Heuristics (all must hold to promote):
  //   1. The document doesn't already use any `#`-style ATX headings.
  //      If the author used proper Heading-N styles anywhere, they
  //      would have used them everywhere — so a bold-only line in such
  //      a doc is emphasis, not a section title.
  //   2. The entire line is wrapped in `**...**` and the inner text is
  //      short (≤100 chars).
  //   3. The text doesn't end with sentence punctuation
  //      (`.`, `!`, `?`, `:`, `,`, `;`) — those cases are almost always
  //      a bold sentence-fragment for emphasis, not a section title.
  //   4. The line is flanked on BOTH sides (after skipping blank lines)
  //      by a substantive non-bold-only paragraph (>=50 chars of plain
  //      text). This rules out tier-list patterns like Bronze/Silver/Gold
  //      where bold labels are stacked with short data values between
  //      them — that's a list, not a section break.
  //
  // A leading ATX heading at the very start of the doc is almost always
  // the doc's title (the gdoc author used a Heading-1 / Heading-2 style
  // for the title even though the rest of their structure is bold-only).
  // It doesn't count as evidence that the doc uses proper headings
  // throughout, so we look past it.
  const atxHeadingLines = ((md.split('\n').map((l, i) => ({l, i}))
    .filter(({l}) => /^#{1,6}\s+\S/.test(l))) || []);
  const titleAtTop = atxHeadingLines.length > 0 && (() => {
    const firstIdx = atxHeadingLines[0].i;
    const linesArr = md.split('\n');
    for (let i = 0; i < firstIdx; i++) {
      if (linesArr[i].trim()) return false; // some content precedes — not a title
    }
    return true;
  })();
  const nonTitleHeadingCount = atxHeadingLines.length - (titleAtTop ? 1 : 0);
  if (nonTitleHeadingCount === 0) {
    const lines = md.split('\n');
    const isBoldOnly = (s: string) => /^\*\*[^*\n]{1,100}\*\*[ \t]*$/.test(s);
    const SUBSTANTIVE_CHARS = 50;
    // "Transparent" lines that we walk past while looking for the
    // substantive prose flanking a candidate heading: blanks, italic-only
    // quote lines, and blockquote lines. These commonly sit between a
    // section heading and the prose that follows (e.g. an italic-quoted
    // epigraph), so they shouldn't block the substantive-context check.
    const isTransparent = (s: string) => {
      const t = s.trim();
      if (!t) return true;
      if (/^_[^_\n]{1,200}_[ \t]*$/.test(t)) return true; // italic-only line
      if (/^>/.test(t)) return true; // blockquote (incl. blockquote-list items)
      return false;
    };
    const walkAbove = (i: number) => {
      let j = i - 1;
      while (j >= 0 && isTransparent(lines[j])) j--;
      return j;
    };
    const walkBelow = (i: number) => {
      let j = i + 1;
      while (j < lines.length && isTransparent(lines[j])) j++;
      return j < lines.length ? j : -1;
    };
    const isSubstantivePara = (idx: number) => {
      if (idx < 0) return false;
      const l = lines[idx];
      if (isBoldOnly(l)) return false;
      const text = l
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_~`>#]/g, '')
        .trim();
      return text.length >= SUBSTANTIVE_CHARS;
    };
    const nearestNonBlankAbove = (i: number) => {
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') j--;
      return j;
    };
    const isItalicOnly = (s: string) => /^_[^_\n]{1,200}_[ \t]*$/.test(s.trim());
    for (let i = 0; i < lines.length; i++) {
      const m = /^\*\*([^*\n]{1,100})\*\*[ \t]*$/.exec(lines[i]);
      if (!m) continue;
      const text = m[1].trim();
      if (!text || /[.!?:;,]$/.test(text)) continue;
      // A line that starts or ends with an em/en-dash (or stray hyphen)
      // is almost always either a quote attribution (`– Author Name`)
      // or a trailing sentence fragment, not a section title.
      if (/^[-–—]|[-–—]$/.test(text)) continue;
      // If the line immediately above (no walking) is an italic-only
      // quote line, the bold line is almost always an attribution to
      // that quote, even when the dash convention isn't used.
      const immAbove = nearestNonBlankAbove(i);
      if (immAbove >= 0 && isItalicOnly(lines[immAbove])) continue;
      // EITHER side must have substantive prose nearby (after walking past
      // transparent quote/blockquote lines). Both-sides-substantive was too
      // strict: section headings often introduce a quote block before any
      // prose. Either-side is permissive enough to catch those without
      // letting tier-list patterns through — tier labels are flanked by
      // short non-italic non-blockquote data values, which the walk stops
      // on (and which fail the substantiveness check).
      const aboveSub = isSubstantivePara(walkAbove(i));
      const belowSub = isSubstantivePara(walkBelow(i));
      if (!aboveSub && !belowSub) continue;
      lines[i] = `## ${text}`;
    }
    md = lines.join('\n');
  }

  // Some gdoc authors hand-format footnotes instead of using the proper
  // Google Docs footnote feature: a superscript number in the body, and
  // a "N   content" line at the tail of the doc. Turndown drops the
  // superscript styling (leaving bare digits glued to surrounding text),
  // and the bare-digit defs don't match any of lib/footnotes.ts known
  // formats (sdfootnote / ftnt / fn / plain). Rewrite the tail defs to
  // bracketed `[N] content` form so extractPlain picks them up and uses
  // its bare-digit fallback to rewire the body refs.
  //
  // Heuristic: walk back from EOF, collecting consecutive "N   content"
  // lines (allowing blank lines between). Require 2+ such lines to avoid
  // converting a single coincidentally numbered tail paragraph.
  {
    const lines = md.split('\n');
    let i = lines.length - 1;
    while (i >= 0 && lines[i].trim() === '') i--;
    const defIndices: number[] = [];
    while (i >= 0) {
      const line = lines[i];
      if (/^\d+\s{2,}\S/.test(line)) {
        defIndices.push(i);
        i--;
        continue;
      }
      if (line.trim() === '') {
        i--;
        continue;
      }
      break;
    }
    if (defIndices.length >= 2) {
      for (const idx of defIndices) {
        lines[idx] = lines[idx].replace(/^(\d+)\s{2,}/, '[$1] ');
      }
      md = lines.join('\n');
    }
  }

  // Fix markdown links that the gdoc author placed *inside* a URL or
  // domain. e.g. "www.random**[house](wiki/...)**.com" — Google Docs styles
  // hyperlinks with `font-weight:700` and `color:blue`, which makes the
  // emitted markdown carry a `**` bold wrapper. Two problems then surface:
  //   (1) `**` flanked by alphanumeric chars isn't a valid CommonMark bold
  //       opener, so the literal asterisks leak through to the rendered
  //       output.
  //   (2) GFM autolinks `www.random` greedily, swallowing the entire
  //       `[house](url).com` tail and producing a broken `<a>` tag.
  // We fix both: drop the `**` and prefix the URL-shaped run with a
  // zero-width space (U+200B) that's invisible in the rendered output but
  // prevents GFM's autolink from kicking in. Only `[house]` ends up
  // clickable, while `www.random` and `.com` render as plain text. Guarded
  // by a domain-shaped prefix AND a TLD-shaped suffix so standalone links
  // elsewhere aren't touched.
  md = md.replace(
    /(\w+(?:\.\w+)+|www\.[\w-]+)\*\*(\[[^\]\n]+\]\([^)\n]+\))\*\*(\.[A-Za-z]{2,})/g,
    '​$1$2$3'
  );

  return md.trim();
}

/**
 * Fetch a Google Doc as HTML using the public export URL.
 *
 * Retries with exponential backoff on transient failures (5xx responses
 * and network errors). Google Docs' export endpoint returns sporadic 500s
 * when exporting large composite docs — usually clears within a few
 * seconds to a minute. We retry up to 5 times (total wait ~60s) before
 * giving up.
 */
export async function fetchGDocAsHTML(docId: string): Promise<string> {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
  const MAX_ATTEMPTS = 5;
  const BASE_DELAY_MS = 2000;
  // Per-attempt timeout. The biggest 2025 docs are ~150–200 MB of HTML
  // which streams in over Google's pipe at variable speeds; without a
  // ceiling, fetch() can sit on a stalled connection forever (observed
  // 10+ minute hangs on the 'Other J-S' doc). 4 minutes is plenty for
  // a ~200 MB transfer and short enough to escalate to a retry quickly.
  const FETCH_TIMEOUT_MS = 4 * 60 * 1000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const label = attempt === 1 ? '' : ` (attempt ${attempt}/${MAX_ATTEMPTS})`;
    console.log(`  Fetching doc: ${docId}${label}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (response.ok) {
        const text = await response.text();
        clearTimeout(timer);
        return text;
      }

      // 4xx (except 429) is unlikely to succeed on retry — fail fast.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for doc ${docId}`);
      }

      if (attempt === MAX_ATTEMPTS) {
        clearTimeout(timer);
        throw new Error(`HTTP ${response.status}: ${response.statusText} for doc ${docId} after ${MAX_ATTEMPTS} attempts`);
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`  ⚠️  HTTP ${response.status} — backing off ${delay}ms`);
      clearTimeout(timer);
      await new Promise(r => setTimeout(r, delay));
    } catch (err: unknown) {
      clearTimeout(timer);
      // Network errors (ENOTFOUND, ECONNRESET, AbortError, etc.) — retry.
      if (attempt === MAX_ATTEMPTS) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      // Re-throw 4xx errors immediately (message shape contains "HTTP 4")
      if (/HTTP 4[0-28-9]/.test(msg)) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`  ⚠️  ${msg} — backing off ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // Unreachable — the loop either returns or throws.
  throw new Error(`Exhausted retries for doc ${docId}`);
}

/**
 * Process a single chunk of Google Docs HTML → Markdown.
 * The chunk must be a full HTML document (with <style> and <body>) so the
 * Cheerio+Turndown pipeline and CSS-class detection work correctly.
 *
 * Not exported — callers should use convertGDocToMarkdown which handles
 * the full doc (with automatic chunking for large composite docs).
 */
function convertHtmlChunk(html: string): string {
  // Parse CSS class→style mappings BEFORE loading into Cheerio and removing <style>.
  const styles = parseGDocStyles(html);

  const $ = cheerio.load(html);

  // Apply semantic tags (bold→<strong>, italic→<em>, indent→<blockquote>)
  // before Turndown conversion so it can recognize the formatting.
  applySemanticTags($, styles);

  // Google Docs exports include a <body> with the content
  // Remove Google Docs specific elements we don't want
  $('style').remove();
  $('script').remove();
  // Remove Google Docs comment annotations and suggestions
  $('sup').has('a[id^="cmnt"]').remove();
  $('div').has('a[id^="cmnt"]').remove();
  $('a[id^="cmnt"]').parent('sup').remove();
  // Remove truly-empty spans (reduces memory pressure). We must NOT strip
  // whitespace-only spans — Google Docs now puts run-boundary spaces in their
  // own spans (e.g. "<span>the</span><span> </span><span>Arab Spring</span>"),
  // and removing the space-span glues words together ("theArab Spring").
  $('span').each(function() {
    const el = $(this);
    if (!el.text() && !el.find('img').length) {
      el.remove();
    }
  });
  // Strip Google Docs tracking URLs - unwrap redirect wrappers
  $('a[href*="google.com/url"]').each(function() {
    const el = $(this);
    const href = el.attr('href') || '';
    const match = href.match(/[?&]q=([^&]+)/);
    if (match) {
      el.attr('href', decodeURIComponent(match[1]));
    }
  });
  // Unwrap anchors whose only content is whitespace (including &nbsp;).
  // Google Docs sometimes emits <a>&nbsp;</a> alongside the real link to the
  // same destination; those produce ugly [](url) empty links in markdown.
  // Replace with the raw text so we preserve the whitespace (nbsp carries a
  // word boundary between adjacent text runs).
  $('a').each(function() {
    const el = $(this);
    if (!el.find('img').length && !el.text().replace(/\u00A0/g, '').trim()) {
      el.replaceWith(el.text());
    }
  });

  // Get the body content
  const body = $('body');

  // Convert to markdown
  const rawMarkdown = turndownService.turndown(body.html() || '');
  return cleanupMarkdown(rawMarkdown);
}

/**
 * Find the <style> block and <body> content of a Google Docs HTML export
 * by raw string scanning (no DOM parse). This is fast even for 100MB+ docs
 * and avoids the peak-memory problem of materializing the whole doc in
 * Cheerio before we've even started processing.
 */
function extractStyleAndBody(html: string): { style: string; body: string } {
  const styleMatch = html.match(/<style[^>]*>[\s\S]*?<\/style>/);
  const style = styleMatch ? styleMatch[0] : '';
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  const body = bodyMatch ? bodyMatch[1] : html;
  return { style, body };
}

/**
 * Scan the body for <h1> tag positions using a non-DOM regex pass.
 * Composite Google Docs are naturally segmented at <h1> boundaries
 * (each review gets its own H1 heading), so splitting here gives us
 * bounded peak memory per chunk.
 */
function findH1Boundaries(body: string): number[] {
  const h1Re = /<h1\b[^>]*>/g;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = h1Re.exec(body)) !== null) positions.push(m.index);
  return positions;
}

// Chunk-processing threshold. Docs smaller than this go through the single-shot
// path (simpler, works fine). Larger docs get split at <h1> boundaries so each
// chunk's DOM processing has bounded memory.
const CHUNK_THRESHOLD_BYTES = 5 * 1024 * 1024;

/**
 * Extract the document body content from Google Docs HTML export
 * and convert to markdown.
 *
 * For large composite docs (>5MB), the body is sliced at <h1> boundaries
 * and each chunk is processed independently, keeping peak memory bounded
 * to the largest single review rather than the whole document. This avoids
 * the GC-thrash / OOM problem when processing 100MB+ source docs.
 */
export function convertGDocToMarkdown(html: string): string {
  if (html.length < CHUNK_THRESHOLD_BYTES) {
    return convertHtmlChunk(html);
  }

  const { style, body } = extractStyleAndBody(html);
  const h1Positions = findH1Boundaries(body);

  // Fallback: no H1 boundaries, nothing to split on.
  if (h1Positions.length === 0) return convertHtmlChunk(html);

  // Build chunks: [preamble, h1-section, h1-section, ...]
  const ranges: Array<[number, number]> = [];
  if (h1Positions[0] > 0) ranges.push([0, h1Positions[0]]);
  for (let i = 0; i < h1Positions.length; i++) {
    const end = i + 1 < h1Positions.length ? h1Positions[i + 1] : body.length;
    ranges.push([h1Positions[i], end]);
  }

  const parts: string[] = [];
  for (const [start, end] of ranges) {
    const chunkBody = body.slice(start, end);
    // Wrap in a minimal HTML shell so the style block is visible to our
    // CSS-class detection and so Cheerio has a well-formed document.
    const shell = `<!DOCTYPE html><html><head>${style}</head><body>${chunkBody}</body></html>`;
    parts.push(convertHtmlChunk(shell));
  }

  // Concatenating cleaned chunks may produce 4+ consecutive blank lines at
  // chunk boundaries. Collapse those once more.
  return parts.join('\n\n').replace(/\n{4,}/g, '\n\n\n');
}
