/**
 * Shared utilities for fetching and converting Google Docs HTML to Markdown.
 *
 * Used by fetch-from-gdocs.ts and any other scripts that need to ingest
 * Google Docs content.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import TurndownService from 'turndown';
import fs from 'fs';
import path from 'path';

/**
 * Local cache for raw Google Docs HTML exports. Keyed by docId. Lets us
 * iterate on conversion logic without hitting Google's export endpoint
 * every time — exports are slow and sometimes rate-limited, and the HTML
 * itself is stable for the duration of a contest-import cycle. Set
 * GDOC_NO_CACHE=1 to force a fresh fetch (e.g. when the author has edited
 * the doc since the last cached copy).
 */
const GDOC_CACHE_DIR = path.join(process.cwd(), '.gdoc-cache');
const GDOC_CACHE_DISABLED = process.env.GDOC_NO_CACHE === '1';

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Remove Google Docs styling spans that add no value.
// IMPORTANT: must not strip spans that wrap images, and must not strip
// whitespace-only spans (see comment on the cheerio span cleanup).
// Strikethrough: turn `<s>`/`<del>`/`<strike>` into markdown `~~text~~`.
// remark-gfm parses `~~text~~` as `<del>` at render time. Without an
// explicit rule, turndown emits the inner text and drops the tag.
turndownService.addRule('strikethrough', {
  filter: ['s', 'del', 'strike'],
  replacement: (content) => content ? `~~${content}~~` : '',
});

// Preserve `<figure>` and `<figcaption>` as raw HTML wrappers around
// markdown content. Generated upstream when we detect an image-caption
// pair (image paragraph followed by a centered/italic paragraph). The
// blank lines around the inner content let CommonMark parse the wrapped
// markdown (image, italic text, links) inside the figure block.
turndownService.addRule('figureBlock', {
  filter: 'figure',
  // Blank lines INSIDE the figure block are required: CommonMark only
  // parses markdown inside a raw-HTML block when blank lines separate
  // the inner markdown content from the surrounding tags. Without them
  // `![](url)` immediately under `<figure>` stays raw text in the
  // rendered output.
  replacement: (content) => `\n\n<figure>\n\n${content.trim()}\n\n</figure>\n\n`,
});
turndownService.addRule('figcaption', {
  filter: 'figcaption',
  replacement: (content) => `\n<figcaption>\n\n${content.trim()}\n\n</figcaption>\n`,
});

turndownService.addRule('removeEmptySpans', {
  filter: (node) => {
    if (node.nodeName !== 'SPAN') return false;
    // Only remove spans with NO text content at all. Whitespace-only spans
    // carry meaningful word boundaries in current Google Docs HTML exports.
    if (node.textContent) return false;
    // Preserve spans that contain any image descendant.
    if ((node as Element).querySelector?.('img')) return false;
    // Preserve spans whose ONLY non-whitespace child is a <br> — those are
    // standalone line-break separators that Google Docs emits between
    // sibling spans inside one <p> (e.g. dialogue lines in Tale of Genji).
    // Dropping the wrapper here would also drop the <br> via Turndown's
    // empty-replacement, collapsing the line break into nothing.
    if ((node as Element).querySelector?.('br')) return false;
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
interface ClassMargins {
  marginLeft: number;
  marginRight: number;
  textIndent: number;
  // CSS `padding-bottom` on the class (in pt). Authors who want a
  // visual paragraph gap set padding-bottom >0 on the paragraph style;
  // adjacent paragraphs with padding-bottom == 0 are meant to stack
  // tight (e.g. play-script speaker name + dialog body in Merry Wives,
  // 0pt padding) vs. essay paragraphs with a normal gap (e.g. Pluto
  // quote with 10pt padding).
  paddingBottom: number;
}

interface GDocStyleMap {
  boldClasses: Set<string>;
  italicClasses: Set<string>;
  // Classes with a font-size noticeably larger than body text. Combined
  // with bold, this is a strong signal that a paragraph styled this way
  // is a heading the author created without using Google Docs' built-in
  // Heading-N styles. Threshold: >= 14pt (body text is typically 11pt).
  largeFontClasses: Set<string>;
  // Classes that apply text-decoration: underline. Used to detect
  // section headings that authors styled as underlined plain text
  // (e.g. "More Money Than God" uses underline-only for every section).
  underlineClasses: Set<string>;
  // Classes with `text-decoration: line-through`. Used to preserve
  // strikethrough text as markdown `~~text~~` (turned into `<del>` by
  // remark-gfm at render time).
  strikethroughClasses: Set<string>;
  // Classes with `text-align: center`. Used to detect image captions
  // styled as centered text (the conventional Google Docs caption style).
  centeredClasses: Set<string>;
  // Classes that ON THEIR OWN meet the indent threshold — used by the body-
  // default gate (which is per-class) and the fast-path single-class check.
  indentClasses: Set<string>;
  // Per-class indent properties. Lets the per-paragraph check sum margins
  // across all classes applied to an element. Real example: a paragraph
  // `<p class="c97 c32 c117">` where c117 has margin-left:21.3pt and c97
  // has margin-right:33.1pt is visually a both-sides-indented blockquote,
  // even though neither class alone meets the indent-on-its-own threshold.
  classMargins: Map<string, ClassMargins>;
}

// Threshold check on margins. A paragraph counts as "indented"
// (blockquote candidate) if:
//   - margin-left >= 36pt (Google Docs' built-in blockquote style),
//   - OR text-indent >= 36pt (first-line indent big enough to be a one-line
//     quote indicator on short paragraphs/poetry),
//   - OR margin-left + margin-right BOTH > 0 (any both-sides indent — a
//     visual blockquote shape regardless of depth, distinct from a
//     plain-left first-line-indent body style).
function marginsAreIndented(m: ClassMargins): boolean {
  // Negative text-indent is the hanging-indent that Google Docs gives
  // to list items (the bullet/number is pulled out into the indent
  // space). Treating that as a blockquote turns numbered/bulleted
  // lists into stray `>` lines — real-world example: Don't Bang
  // Denmark's `1.`, `2.` enumeration uses margin-left:54pt + text-
  // indent:-18pt and is a numbered list, not a quote.
  if (m.textIndent <= -10) return false;
  // 24pt covers both the full ~36pt block-indent and the half-tab
  // ~27pt indent that some authors use for quotations (e.g. The
  // Wisdom of Mike Mentzer's `margin-left:27pt` quote class). The
  // body-default gate (line ~470, 90% threshold) keeps us from
  // mis-classifying a 27pt body style as a blockquote.
  if (m.marginLeft >= 24) return true;
  if (m.textIndent >= 24) return true;
  if (m.marginLeft > 0 && m.marginRight > 0) return true;
  return false;
}

/**
 * Determine the dominant body font size for a Google Docs HTML export.
 * Walks all substantive `<span>` text in the body, tallies chars per
 * font-size, returns the size with the most chars. Falls back to 11pt
 * when there's no styling info.
 *
 * Run once on the FULL document before chunking — splitting at <h1>
 * boundaries produces chunks whose per-chunk size distribution can be
 * skewed (a chunk dominated by footnote text mis-identifies the body
 * font as the footnote size, then turns body paragraphs into headings).
 */
function detectBodyFontSize(html: string): number {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) return 11;
  const classFontSize = new Map<string, number>();
  const ruleRe = /\.([a-z][a-z0-9]*)\{([^}]+)\}/g;
  let m;
  while ((m = ruleRe.exec(styleMatch[1])) !== null) {
    const fs = m[2].match(/font-size\s*:\s*(\d+(?:\.\d+)?)pt/);
    if (fs) classFontSize.set(m[1], parseFloat(fs[1]));
  }
  const sizeChars = new Map<number, number>();
  const spanRe = /<span\s+class="([^"]+)"[^>]*>([^<]*)<\/span>/g;
  let sm;
  while ((sm = spanRe.exec(html)) !== null) {
    const text = sm[2].trim();
    if (!text) continue;
    let size: number | undefined;
    for (const c of sm[1].split(/\s+/)) {
      const s = classFontSize.get(c);
      if (s !== undefined) size = s;
    }
    if (size === undefined) continue;
    sizeChars.set(size, (sizeChars.get(size) || 0) + text.length);
  }
  let bodySize = 11;
  let bodyChars = 0;
  for (const [size, chars] of sizeChars) {
    if (chars > bodyChars) {
      bodySize = size;
      bodyChars = chars;
    }
  }
  return bodySize;
}

function parseGDocStyles(html: string, bodySizeHint?: number): GDocStyleMap {
  const boldClasses = new Set<string>();
  const italicClasses = new Set<string>();
  const largeFontClasses = new Set<string>();
  const underlineClasses = new Set<string>();
  const strikethroughClasses = new Set<string>();
  const centeredClasses = new Set<string>();
  const indentClasses = new Set<string>();
  const classMargins = new Map<string, ClassMargins>();

  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) return { boldClasses, italicClasses, largeFontClasses, underlineClasses, strikethroughClasses, centeredClasses, indentClasses, classMargins };

  const styleText = styleMatch[1];

  // Determine body font size. Caller can pass a hint to use a doc-wide
  // value (necessary for chunked processing — see detectBodyFontSize
  // for context). Without a hint, compute from this slice's spans.
  let bodySize: number;
  if (bodySizeHint !== undefined) {
    bodySize = bodySizeHint;
  } else {
    const classFontSize = new Map<string, number>();
    const sizeRuleRe = /\.([a-z][a-z0-9]*)\{([^}]+)\}/g;
    let sm;
    while ((sm = sizeRuleRe.exec(styleText)) !== null) {
      const fs = sm[2].match(/font-size\s*:\s*(\d+(?:\.\d+)?)pt/);
      if (fs) classFontSize.set(sm[1], parseFloat(fs[1]));
    }
    const sizeChars = new Map<number, number>();
    const spanRe = /<span\s+class="([^"]+)"[^>]*>([^<]*)<\/span>/g;
    let spanMatch;
    while ((spanMatch = spanRe.exec(html)) !== null) {
      const text = spanMatch[2].trim();
      if (!text) continue;
      const classes = spanMatch[1].split(/\s+/);
      let size: number | undefined;
      for (const c of classes) {
        const s = classFontSize.get(c);
        if (s !== undefined) size = s;
      }
      if (size === undefined) continue;
      sizeChars.set(size, (sizeChars.get(size) || 0) + text.length);
    }
    bodySize = 11;
    let bodyChars = 0;
    for (const [size, chars] of sizeChars) {
      if (chars > bodyChars) {
        bodySize = size;
        bodyChars = chars;
      }
    }
  }
  // "Large" = at least 2pt above body AND at least 13pt absolute. The
  // 2pt gap filters incidental subscript/superscript-style variation;
  // the 13pt floor preserves the old behavior for the common 11pt-body
  // case (14pt headings still detected).
  const largeFloor = Math.max(bodySize + 2, 13);

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
    const fontSizeMatch = props.match(/font-size\s*:\s*(\d+(?:\.\d+)?)pt/);
    if (fontSizeMatch && parseFloat(fontSizeMatch[1]) >= largeFloor) {
      largeFontClasses.add(cls);
    }
    if (/text-decoration\s*:\s*underline/.test(props)) {
      underlineClasses.add(cls);
    }
    if (/text-decoration\s*:\s*line-through/.test(props)) {
      strikethroughClasses.add(cls);
    }
    if (/text-align\s*:\s*center/.test(props)) {
      centeredClasses.add(cls);
    }
    const marginLeftMatch = props.match(/margin-left\s*:\s*(-?\d+(?:\.\d+)?)pt/);
    const marginRightMatch = props.match(/margin-right\s*:\s*(-?\d+(?:\.\d+)?)pt/);
    const textIndentMatch = props.match(/text-indent\s*:\s*(-?\d+(?:\.\d+)?)pt/);
    const paddingBottomMatch = props.match(/padding-bottom\s*:\s*(-?\d+(?:\.\d+)?)pt/);
    const ml = marginLeftMatch ? parseFloat(marginLeftMatch[1]) : 0;
    const mr = marginRightMatch ? parseFloat(marginRightMatch[1]) : 0;
    const ti = textIndentMatch ? parseFloat(textIndentMatch[1]) : 0;
    const pb = paddingBottomMatch ? parseFloat(paddingBottomMatch[1]) : 0;
    if (ml || mr || ti || pb) {
      classMargins.set(cls, { marginLeft: ml, marginRight: mr, textIndent: ti, paddingBottom: pb });
      if (marginsAreIndented({ marginLeft: ml, marginRight: mr, textIndent: ti, paddingBottom: pb })) {
        indentClasses.add(cls);
      }
    }
  }

  return { boldClasses, italicClasses, largeFontClasses, underlineClasses, strikethroughClasses, centeredClasses, indentClasses, classMargins };
}

// True if every substantive (non-empty) span in the paragraph carries an
// italic CSS class. Empty / whitespace-only spans don't count either way —
// they're often punctuation spacers. Used as a strong "this is a quote"
// signal in combination with text-indent (see isParagraphIndented).
function isParagraphAllItalic($: CheerioAPI, el: ReturnType<typeof $>, italicClasses: Set<string>): boolean {
  const spans = el.find('span').toArray();
  if (spans.length === 0) return false;
  let sawSubstantive = false;
  for (const s of spans) {
    const text = $(s).text();
    if (!text.trim()) continue;
    sawSubstantive = true;
    const cls = ($(s).attr('class') || '').split(/\s+/);
    if (!cls.some(c => italicClasses.has(c))) return false;
  }
  return sawSubstantive;
}

// True if the paragraph's effective margins (summed across all its classes)
// meet the indent threshold. Catches multi-class cases where margin-left and
// margin-right are split across sibling classes that neither alone qualifies.
//
// Three indent signals fire blockquote-wrapping:
//   1. margin-left >= 36pt (combined across classes) — Google Docs' built-in
//      blockquote style, used for multi-paragraph book quotations.
//   2. margin-left > 0 AND margin-right > 0 — any both-sides indent is a
//      visual blockquote shape regardless of depth.
//   3. text-indent >= 36pt AND the paragraph is entirely italic — italic +
//      first-line indent is the strong author-as-quote convention (book
//      epigraphs, Latin quotes, novel dialogue snippets). Plain text-indent
//      WITHOUT italic is typographic paragraph styling (first-line indent
//      as a body style); we don't wrap those.
function isParagraphIndented(
  $: CheerioAPI,
  el: ReturnType<typeof $>,
  styles: GDocStyleMap,
): boolean {
  const classAttr = el.attr('class') || '';
  const classes = classAttr ? classAttr.split(/\s+/) : [];
  // Sum margins across all classes.
  let ml = 0, mr = 0, ti = 0;
  let anyKnown = false;
  for (const c of classes) {
    const m = styles.classMargins.get(c);
    if (!m) continue;
    anyKnown = true;
    ml += m.marginLeft;
    mr += m.marginRight;
    ti += m.textIndent;
  }
  // Treat 5+ leading non-breaking spaces in the paragraph's text as a
  // manual text-indent (visually equivalent — the author indented by
  // hand instead of via a CSS class). Real example: Catullus 16's Ice
  // Cube quote where the first lyric line is `<p class="c4 c6">&nbsp;{8}
  // Ay yo Dre...</p>` while the next two are c0 text-indent. Without
  // counting the manual indent, the rule wraps the next two but leaves
  // this first line orphaned.
  const elText = el.text();
  const leadingNbsps = elText.match(/^ +/);
  const hasManualIndent = leadingNbsps !== null && leadingNbsps[0].length >= 5;
  if (hasManualIndent) {
    ti = Math.max(ti, 36);
    anyKnown = true;
  }
  if (!anyKnown) return false;

  // Significantly negative text-indent is the hanging-indent that
  // Google Docs gives to list items (the bullet/number is pulled out
  // into the indent space). Treating that as a blockquote turns
  // numbered/bulleted lists into stray `>` lines — same logic as
  // `marginsAreIndented` itself. Don't Bang Denmark uses `c7`
  // (margin-left:54pt; text-indent:-18pt) for every list item.
  if (ti <= -10) return false;

  // Combined-margins checks: margin-left meets threshold, OR both-sides.
  // Threshold 24pt covers both the standard ~36pt block indent and the
  // half-tab ~27pt indent (Mentzer's quote class). The 90% body-default
  // gate above already strips a class that's used by nearly every
  // paragraph, so we don't sweep in body-styled docs.
  if (ml >= 24) return true;
  if (ml > 0 && mr > 0) return true;

  // Text-indent path. Non-italic text-indent paragraphs are ambiguous: in
  // some docs they're typographic first-line indents on body paragraphs
  // (the-righteous-mind, at-the-existentialist-caf, etc.); in others
  // they're quoted passages (Bellum English translations, Bleeding Edge
  // dialogue, Catullus translation/Latin couplets). To distinguish:
  //
  //   (a) Whole paragraph is italic → quote (poetry/foreign-language).
  //   (b) The run's first paragraph is preceded (skipping same-class
  //       paragraphs and empties) by a sentence ending in `:` or `,` —
  //       a quote-introducer like "Cicero at his best is lyrical:" or
  //       "Catullus then wrote,". Body false positives precede each
  //       other or other body paragraphs ending in `.`, `?`, `!`.
  if (ti < 24) return false;
  if (isParagraphAllItalic($, el, styles.italicClasses)) return true;
  return precededByQuoteIntroducer($, el, styles);
}

/**
 * Walk backward through preceding siblings to find the introducer of this
 * text-indent run. Same-text-indent-class paragraphs and empties are
 * transparent (part of the same run); the first non-empty non-same-class
 * paragraph is the introducer. Returns true iff it ends in `:` or `,`.
 */
// Common English speech-act verbs used to introduce a quotation. When a
// paragraph ends in `[verb],` it's almost always followed by a quoted
// passage — `as Williams puts it,`, `Catullus then wrote,`, `she said,`
// `he asks,` etc. Distinguishes deliberate quote introduction from body
// paragraphs that just happen to trail off with a comma.
const QUOTE_INTRODUCER_VERB_AT_END = /\b(?:writes?|wrote|writing|says?|said|saying|asks?|asked|asking|notes?|noted|noting|claims?|claimed|claiming|states?|stated|stating|puts?|putting|exclaims?|exclaimed|exclaiming|declares?|declared|declaring|announces?|announced|announcing|explains?|explained|explaining|continues?|continued|continuing|begins?|began|beginning|reads?|reading|observes?|observed|observing|argues?|argued|arguing|asserts?|asserted|asserting|comments?|commented|commenting|recalls?|recalled|recalling|describes?|described|describing|relates?|related|relating|adds?|added|adding|composed|composes|composing|sang|sings?|singing|sung|quotes?|quoted|quoting|replies?|replied|replying|responds?|responded|responding|whispers?|whispered|whispering|murmurs?|murmured|murmuring|cries?|cried|crying|insists?|insisted|insisting|demands?|demanded|demanding|sighs?|sighed|sighing|laughs?|laughed|laughing|growls?|growled|growling|mutters?|muttered|muttering|protests?|protested|protesting)\s*,\s*$/i;

function precededByQuoteIntroducer(
  $: CheerioAPI,
  el: ReturnType<typeof $>,
  styles: GDocStyleMap,
): boolean {
  // Identify the text-indent class on `el` so we can treat earlier
  // paragraphs sharing it as part of the same run (transparent to the
  // walkback). When the indent is manual (5+ leading nbsps with no
  // matching class), ownIndentCls stays undefined — that's fine; we
  // just don't skip any siblings as same-run.
  const ownClasses = (el.attr('class') || '').split(/\s+/);
  const ownIndentCls = ownClasses.find(c => {
    const m = styles.classMargins.get(c);
    return m && m.textIndent >= 36 && m.marginLeft < 36;
  });

  // Step from `el` backward; the same-run wrap into a `<blockquote>` by an
  // earlier iteration means `el.prev()` may now be a `<blockquote>` element.
  // `step()` descends into the wrapper to read the paragraph inside.
  const step = (node: ReturnType<typeof $>): ReturnType<typeof $> => {
    if (node.parent('blockquote').length) return node.parent('blockquote').prev();
    return node.prev();
  };

  let cur = el.prev();
  while (cur.length) {
    let tag = cur.prop('tagName')?.toLowerCase();
    if (tag === 'blockquote') {
      const inner = cur.children('p').last();
      if (!inner.length) return false;
      cur = inner;
      tag = 'p';
    }
    if (tag !== 'p') return false;
    // An empty paragraph containing an `<img>` is real content, not a
    // run extension — a colon-ending sentence before the image is
    // introducing the IMAGE, and the paragraph after is the author's
    // continuation, not a quote. Stop the walkback at the image.
    if (cur.find('img').length) return false;
    if (!cur.text().trim()) {
      cur = step(cur);
      continue;
    }
    const curClasses = (cur.attr('class') || '').split(/\s+/);
    if (ownIndentCls && curClasses.includes(ownIndentCls)) {
      // Same-run paragraph: walk past it
      cur = step(cur);
      continue;
    }
    const t = cur.text().trim();
    const lastChar = t[t.length - 1];
    if (lastChar === ':') return true;
    if (lastChar === ',') {
      // Comma alone isn't enough — many body paragraphs trail off with a
      // comma (real example: at-the-existentialist-cafe ends a long
      // body paragraph with `"...against her mother,"`). Accept the
      // comma as a quote introducer only when it follows a speech-act
      // verb like `wrote,` `said,` `asks,` `notes,` etc — the
      // distinctive shape of "[Author] [verb], [quote follows]".
      if (QUOTE_INTRODUCER_VERB_AT_END.test(t)) return true;
      return false;
    }
    // Sentence-ending or clause-closing punctuation: this paragraph is
    // body prose preceding the text-indent paragraph, not a quote
    // introducer. Stop here. Includes closing double-quote (visible end
    // of a quoted passage) and closing brackets/semicolons.
    if (
      lastChar === '.' || lastChar === '?' || lastChar === '!' ||
      lastChar === '"' || lastChar === '”' ||
      lastChar === ')' || lastChar === ']' || lastChar === ';'
    ) return false;
    // Otherwise (apostrophe, em-dash, ellipsis, etc.): this paragraph
    // isn't itself an introducer, but it isn't an unambiguous sentence
    // or clause end either. It's most plausibly a continuation of the
    // same quote block in a different class (real example: Catullus's
    // Ice Cube quote where the first lyric line is styled differently
    // from the next two but is still part of the same intended quote).
    // Keep walking back.
    cur = step(cur);
  }
  return false;
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
  // Unwrap headings nested inside `<ol><li>`. Google Docs renders a
  // numbered list whose items happen to be styled as Heading-N as
  // `<ol><li><hN>…</hN></li></ol>` (one heading per list item). The
  // default conversion drops the heading out of the list ("1. ##
  // title"), which has both a numbered-list marker AND a heading on
  // the same line — neither rendering as the author intended.
  // Replace the whole `<ol>` with a sequence of `<hN>N. text</hN>`
  // elements, preserving the list start index when present.
  $('ol').each(function () {
    const ol = $(this);
    const items = ol.children('li').toArray();
    if (items.length === 0) return;
    const headings: Array<{ tag: string; html: string; n: number }> = [];
    let counter = parseInt(ol.attr('start') || '1', 10);
    for (const li of items) {
      const liEl = $(li);
      const heading = liEl.children('h1, h2, h3, h4, h5, h6').first();
      if (heading.length === 0) return; // bail — not all items are headings
      // Require the `<li>` to contain ONLY the heading (no sibling
      // prose) to avoid disrupting structured lists where one item
      // happens to start with a heading.
      const hasOtherContent = liEl.contents()
        .toArray()
        .some((node: any) => {
          if (node.type === 'tag' && node.name === heading[0].name) return false;
          if (node.type === 'text' && !((node.data || '').trim())) return false;
          return true;
        });
      if (hasOtherContent) return;
      headings.push({ tag: heading[0].name, html: heading.html() || '', n: counter });
      counter++;
    }
    if (headings.length === 0) return;
    const replacement = headings
      .map(h => `<${h.tag}>${h.n}. ${h.html}</${h.tag}>`)
      .join('');
    ol.replaceWith(replacement);
  });

  // Gate against universal-body-style margin-indentation. A class like
  // `.cN{margin-left:36pt}` is a blockquote signal ONLY when it
  // distinguishes some paragraphs from the others; in a doc where
  // every body paragraph carries the same margin, it's the body default
  // and doesn't indicate quoting.
  //
  // applySemanticTags runs per-chunk for large composite docs (chunked
  // at <h1> boundaries to bound peak memory). The 90% threshold has to
  // be high enough that a single review's chunk — which can legitimately
  // have a majority of paragraphs inside one long quote — doesn't get
  // its blockquote class stripped. Scientific Freedom's chunk has 53%
  // c14-class paragraphs (margin-left:36pt) from a multi-paragraph book
  // quote — 90% gives the headroom not to mis-strip it.
  //
  // We do NOT need a parallel gate for text-indent classes: the per-
  // paragraph blockquote check requires text-indent ALONE to be paired
  // with whole-paragraph italic styling (see isParagraphIndented), which
  // is the strong author-as-quote convention. A body paragraph with
  // text-indent and non-italic prose never triggers the indent signal in
  // the first place, so the body-default gate isn't needed for it.
  const totalParagraphs = $('p').length;
  if (totalParagraphs >= 10) {
    for (const cls of [...styles.indentClasses]) {
      const usageCount = $(`p.${cls}`).length;
      if (usageCount / totalParagraphs > 0.9) {
        styles.indentClasses.delete(cls);
        // Also drop from classMargins so the slow-path per-paragraph
        // combined-margin check doesn't re-add this class back via
        // its margin contribution.
        styles.classMargins.delete(cls);
      }
    }
  }

  // Reconstruct nested list structure. Google Docs exports lists flat:
  // a `<ul>` for top-level items, then a sibling `<ol>` or `<ul>` for
  // nested items, then another sibling at top level for items that
  // came after the nested block. The nesting depth is encoded in a
  // class suffix like `lst-kix_XXXX-N`, where N is the depth (0 =
  // top-level, 1 = nested once, etc.). Walk sibling lists in order and
  // move any list whose suffix is N>0 into the last `<li>` of the most
  // recent list at depth N-1 (sharing the same `lst-kix_XXXX` prefix).
  // After this pass, Turndown emits properly indented nested
  // sublists.
  const listClassDepth = (cls: string): { prefix: string; depth: number } | null => {
    const m = /\blst-kix_([\w-]+?)-(\d+)\b/.exec(cls);
    if (!m) return null;
    return { prefix: m[1], depth: parseInt(m[2], 10) };
  };
  {
    // Snapshot the list elements first; Cheerio's traversal can be
    // invalidated when we move nodes around mid-iteration.
    const lists = $('ul, ol').toArray();
    type CheerioListNode = (typeof lists)[number];
    // Track the most recent list element seen at each depth, keyed
    // by `lst-kix` prefix. When we encounter a nested list, we move
    // it into the last <li> of the recorded parent.
    const lastAtDepth = new Map<string, CheerioListNode[]>();
    for (const node of lists) {
      const el = $(node);
      const info = listClassDepth(el.attr('class') || '');
      if (!info) continue;
      const { prefix, depth } = info;
      if (depth === 0) {
        // Top-level list: record as the latest parent at depth 0.
        const stack = lastAtDepth.get(prefix) || [];
        stack[0] = node;
        stack.length = 1; // reset deeper levels
        lastAtDepth.set(prefix, stack);
        continue;
      }
      // Nested list: look up the parent at depth-1.
      const stack = lastAtDepth.get(prefix);
      if (!stack || !stack[depth - 1]) continue;
      const parentList = $(stack[depth - 1]);
      const lastLi = parentList.children('li').last();
      if (!lastLi.length) continue;
      // Move this list into the last <li> of the parent. Cheerio's
      // append handles re-parenting.
      lastLi.append(el);
      // Record this list as the latest parent at its depth.
      stack[depth] = node;
      stack.length = depth + 1;
    }
  }

  // Split `<p>` elements that contain `<br><br>` (or more) runs into
  // separate paragraphs at those boundaries. Google Docs encodes a
  // stanza break inside a single visual block (poetry, long quotes) as
  // a double `<br>` in the middle of one big `<p>`. Without splitting,
  // the per-line span-split below collapses both stanzas into a
  // continuous run of `<br>`-separated lines and the visual break is
  // lost (we saw stanza N's last line + stanza N+1's first line
  // glued together on one rendered line in Patrocleia).
  //
  // Guard: only split when the paragraph is itself indent-classed.
  // A body paragraph with intentional double-`<br>` is rare but happens,
  // and splitting it would surprise the author.
  if (styles.indentClasses.size > 0 || styles.classMargins.size > 0) {
    $('p').each(function () {
      const el = $(this);
      const inner = el.html() || '';
      const splitRe = /(?:<br\s*\/?>\s*){2,}/g;
      if (!splitRe.test(inner)) return;
      const cls = el.attr('class') || '';
      if (!isParagraphIndented($, el, styles)) return;
      const rawParts = inner.split(splitRe).map(p => p.trim());
      const textLen = (p: string) =>
        p.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;| | /g, ' ').trim().length;
      const parts = rawParts.filter(p => textLen(p) > 0);
      if (parts.length < 2) return;
      const classAttr = cls ? ` class="${cls.replace(/"/g, '&quot;')}"` : '';
      const wrappers = parts.map(p => `<p${classAttr}>${p}</p>`).join('');
      el.replaceWith(wrappers);
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
    if (!isParagraphIndented($, el, styles)) return;
    const cls = el.attr('class') || '';
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
    // Mark split-created `<p>`s so the downstream
    // adjacent-indented-paragraph merge doesn't glue them back into
    // one with `<br>` between. The split was made specifically to
    // expose paragraph breaks the source faked via `<br>+nbsp` runs.
    const wrappers = parts.map(p => `<p${classAttr} data-split-paragraph="1">${p}</p>`).join('');
    el.replaceWith(wrappers);
  });

  // Split <span>s that contain inline <br> elements into one sibling span
  // per line. Google Docs encodes multi-line poetry as a single <span>
  // wrapping every verse line with <br> between them — and then attaches
  // bold/italic classes to that one <span>. If we leave the structure
  // alone, Turndown emits the whole stanza as one multi-line `_**...**_`
  // run; most markdown renderers can't handle emphasis that spans a hard
  // line break cleanly, and the result is malformed delimiters at line
  // starts. Splitting per line first means each line gets its own
  // balanced `_**line**_` in the markdown.
  //
  // Strip leading and trailing <br>s inside the span first — leading ones
  // would split into an empty initial span (a stray blank line at the
  // top of the paragraph); trailing ones are padding at the bottom and
  // would similarly produce an empty final span. Run this AFTER the
  // `<br>+nbsp` paragraph split above so we don't consume `<br>`s that
  // pass needed to find.
  $('span').each(function () {
    const el = $(this);
    let inner = el.html() || '';
    if (!/<br\s*\/?>/.test(inner)) return;
    // A span containing only `<br>`s + whitespace is a line-break
    // separator between sibling content spans. Extract the `<br>`s
    // as siblings OUTSIDE the span so turndown emits them as
    // hard-break newlines — leaving them inside a whitespace-bearing
    // span makes turndown collapse the `<br>` and lose the line break
    // entirely (e.g. Tale of Genji's `<span><br>&nbsp;…</span>` poem
    // line separators turned the whole poem into one stuck-together
    // sentence).
    if (!el.text().trim()) {
      const brCount = (inner.match(/<br\s*\/?>/g) || []).length;
      if (brCount > 0) {
        const brs = '<br>'.repeat(brCount);
        const remaining = inner.replace(/<br\s*\/?>/g, '');
        const cls = el.attr('class') || '';
        const classAttr = cls ? ` class="${cls.replace(/"/g, '&quot;')}"` : '';
        if (remaining.trim()) {
          el.replaceWith(`${brs}<span${classAttr}>${remaining}</span>`);
        } else {
          el.replaceWith(brs);
        }
      }
      return;
    }
    // Extract leading `<br>` runs. Like the trailing case, we can't
    // just discard them — a `<br>` AT THE START of a span sits
    // between this span and the previous sibling span. Dropping it
    // would silently glue verse lines together (real example: Tale
    // of Genji's poems pack each line into its own
    // `<span class="cN"><br>&nbsp;...</span>` — stripping the
    // leading `<br>` collapses the whole poem to one line).
    // Re-emit it as a sibling `<br>` BEFORE the span.
    let leadingBrs = '';
    const leadMatch = inner.match(/^(\s*(?:<br\s*\/?>\s*)+)/);
    if (leadMatch) {
      const brCount = (leadMatch[0].match(/<br\s*\/?>/g) || []).length;
      leadingBrs = '<br>'.repeat(brCount);
      inner = inner.slice(leadMatch[0].length);
    }
    // Extract trailing `<br>` runs. We can't just discard them: a `<br>`
    // sitting between two sibling spans inside the same `<p>` is a
    // line break that visually separates two distinct chunks (title vs
    // byline; verse line vs blank-line; etc). Re-emit it as a sibling
    // `<br>` AFTER the span so the line break survives the split.
    let trailingBrs = '';
    const trailMatch = inner.match(/(?:\s*<br\s*\/?>)+(\s*)$/);
    if (trailMatch) {
      const brCount = (trailMatch[0].match(/<br\s*\/?>/g) || []).length;
      trailingBrs = '<br>'.repeat(brCount);
      // Preserve any trailing whitespace from the captured group; it's
      // what separates this span from the next textually.
      inner = inner.slice(0, inner.length - trailMatch[0].length) + trailMatch[1];
    }
    if (!/<br\s*\/?>/.test(inner)) {
      if (leadingBrs || trailingBrs) {
        const cls = el.attr('class') || '';
        const classAttr = cls ? ` class="${cls.replace(/"/g, '&quot;')}"` : '';
        el.replaceWith(`${leadingBrs}<span${classAttr}>${inner}</span>${trailingBrs}`);
      } else {
        el.html(inner);
      }
      return;
    }
    const cls = el.attr('class') || '';
    const classAttr = cls ? ` class="${cls.replace(/"/g, '&quot;')}"` : '';
    const parts = inner.split(/<br\s*\/?>/);
    const newHtml = leadingBrs + parts.map(p => `<span${classAttr}>${p}</span>`).join('<br>') + trailingBrs;
    el.replaceWith(newHtml);
  });

  // Split `<p>`s at consecutive `<br>` runs (an in-source blank line
  // inside a multi-line block). The previous span-split may leave
  // EMPTY `<span></span>` elements between `<br>`s — those correspond
  // to consecutive `<br>`s in the original span (e.g. Application for
  // Release's `<span>text<br>text<br><br>text</span>`). Match
  // `<br>` runs separated by optional empty spans and whitespace.
  // Turndown otherwise collapses adjacent `<br>`s to a whitespace-only
  // line which inside a blockquote prefix is a hard-break (not a
  // paragraph break), losing the source blank.
  $('p').each(function () {
    const el = $(this);
    const html = el.html() || '';
    const SPLIT_RE = /(?:<br\s*\/?>\s*(?:<span[^>]*>\s*<\/span>\s*)*){2,}/;
    if (!SPLIT_RE.test(html)) return;
    if (!isParagraphIndented($, el, styles)) return;
    const parts = html.split(new RegExp(SPLIT_RE.source, 'g'));
    if (parts.length < 2) return;
    if (parts.every(p => p.replace(/<[^>]+>/g, '').trim().length === 0)) return;
    const cls = el.attr('class') || '';
    const classAttr = cls ? ` class="${cls.replace(/"/g, '&quot;')}"` : '';
    const wrappers = parts
      .map(p => `<p${classAttr} data-split-paragraph="1">${p}</p>`)
      .join('');
    el.replaceWith(wrappers);
  });

  // Heading-by-styling: a `<p>` whose ALL substantive span content is
  // wrapped in a class that's BOTH bold AND noticeably-larger-than-body
  // font-size is almost always a section heading the author created
  // by manually styling text rather than using Google Docs' Heading-N
  // styles. Same goes for a `<p>` styled entirely with underline (no
  // hyperlink): authors sometimes use underline alone for section
  // headings (e.g. More Money Than God lists every chapter as
  // underlined plain text). Lift such paragraphs to <h2> so downstream
  // Turndown emits `## …` directly — bypassing the later bold-to-H2
  // promotion pass (which can't see font-size or underline signals).
  if (styles.underlineClasses.size > 0) {
    $('p').each(function () {
      const p = $(this);
      // Skip if the paragraph contains a hyperlink — those use
      // underline styling by convention, and aren't headings.
      if (p.find('a').length) return;
      const spans = p.find('span');
      if (spans.length === 0) return;
      let hasSubstantive = false;
      let allUnderline = true;
      spans.each(function () {
        const s = $(this);
        if (!s.text().trim()) return;
        hasSubstantive = true;
        const classes = (s.attr('class') || '').split(/\s+/);
        if (!classes.some(c => styles.underlineClasses.has(c))) {
          allUnderline = false;
        }
      });
      if (!hasSubstantive || !allUnderline) return;
      if (p.closest('h1, h2, h3, h4, h5, h6').length) return;
      const text = p.text().trim();
      // Headings should be short — anything past 200 chars is almost
      // certainly an underlined-emphasis sentence, not a section title.
      if (!text || text.length > 200) return;
      p.replaceWith(`<h2>${text}</h2>`);
    });
  }

  if (styles.largeFontClasses.size > 0) {
    $('p').each(function () {
      const p = $(this);
      const spans = p.find('span');
      if (spans.length === 0) return;
      let hasSubstantive = false;
      let allBig = true;
      spans.each(function () {
        const s = $(this);
        if (!s.text().trim()) return; // skip whitespace-only spans
        hasSubstantive = true;
        const classes = (s.attr('class') || '').split(/\s+/);
        const big = classes.some(c => styles.largeFontClasses.has(c));
        // Bold no longer required — large-font alone is enough.
        // Authors style section headings as large + possibly bold,
        // large + italic, or large alone (e.g. The Marriage uses
        // 16pt non-bold for "The Pledge" / "The Carrier" headings).
        if (!big) allBig = false;
      });
      if (!hasSubstantive || !allBig) return;
      // Skip if already inside a heading.
      if (p.closest('h1, h2, h3, h4, h5, h6').length) return;
      // Cap length — a long large-font passage is more likely an
      // emphasized blockquote than a heading.
      const text = p.text().trim();
      if (!text || text.length > 200) return;
      // Build replacement <h2> preserving the inner text content. We
      // pull just the text so downstream `<strong>` wrapping won't
      // double-emphasize the heading text (markdown headings shouldn't
      // be re-bolded — `## **Title**` renders awkwardly).
      p.replaceWith(`<h2>${text}</h2>`);
    });
  }

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

  // Strikethrough: wrap span contents in <s> when any class applies
  // `text-decoration: line-through`. remark-gfm renders markdown
  // `~~text~~` as `<del>`, which is the rendered analogue. The Marriage
  // of Cadmus and Harmony uses strikethrough in its quotations
  // (e.g. striking out an outdated book title) — without preservation
  // those edits get silently dropped.
  if (styles.strikethroughClasses.size > 0) {
    $('span').each(function () {
      const el = $(this);
      const classes = (el.attr('class') || '').split(/\s+/);
      const isStrike = classes.some(c => styles.strikethroughClasses.has(c));
      if (isStrike && el.text().trim()) {
        if (!el.closest('s, del, strike').length) {
          el.wrapInner('<s></s>');
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

  // Image captions: when a `<p>` contains ONLY an `<img>` (no other
  // substantive content), and the next non-empty `<p>` is "caption-
  // shaped" — its paragraph class has `text-align: center` OR ALL its
  // substantive spans are italic — wrap both elements in a `<figure>`
  // and the caption text in a `<figcaption>`. Turndown rules emit
  // those tags as raw HTML wrappers around the markdown-converted
  // image + caption, preserving semantic figure structure for CSS to
  // style. Heuristic chosen after a corpus scan: 100% of italic-after-
  // image cases were genuine captions; centered-text-after-image is
  // the standard Google Docs caption styling.
  {
    const isImageOnlyP = (p: ReturnType<typeof $>) => {
      if (!p.find('img').length) return false;
      // Image present; require no substantive text in the paragraph.
      const text = p.text().replace(/\s/g, '');
      return text.length === 0;
    };
    const isCaptionP = (p: ReturnType<typeof $>) => {
      const cls = (p.attr('class') || '').split(/\s+/);
      const isCentered = cls.some(c => styles.centeredClasses.has(c));
      if (isCentered) return true;
      // Italic-only fallback: every substantive span carries an italic
      // class. Useful for docs where the author didn't center captions
      // but italicized them (kristin-lavransdatter, etc).
      const spans = p.find('span');
      if (!spans.length) return false;
      let hasSubstantive = false;
      let allItalic = true;
      spans.each(function () {
        const s = $(this);
        if (!s.text().trim()) return;
        hasSubstantive = true;
        const sc = (s.attr('class') || '').split(/\s+/);
        if (!sc.some(c => styles.italicClasses.has(c))) allItalic = false;
      });
      return hasSubstantive && allItalic;
    };
    $('body > p, body > div > p').each(function () {
      const p = $(this);
      if (!isImageOnlyP(p)) return;
      // Find next paragraph sibling, skipping empty paragraphs.
      let next = p.next();
      while (next.length && next.is('p') && !next.text().replace(/\s/g, '').length) {
        next = next.next();
      }
      if (!next.length || !next.is('p')) return;
      if (!isCaptionP(next)) return;
      // Cap on caption length to avoid sweeping up long-prose body
      // paragraphs that happen to be centered (rare but possible).
      const captionText = next.text().trim();
      if (!captionText || captionText.length > 500) return;
      // Wrap both in <figure>, and move the caption content into
      // <figcaption>. Preserve the original markup of both elements.
      const figure = $('<figure></figure>');
      p.before(figure);
      figure.append(p);
      const figcaption = $('<figcaption></figcaption>');
      // Move all children of the caption paragraph into figcaption.
      figcaption.append(next.contents());
      next.remove();
      figure.append(figcaption);
    });
  }

  // Blockquote: wrap each indented block in its own <blockquote>. Adjacent
  // single-block blockquotes in the HTML are collapsed into a single
  // multi-paragraph block later, at the markdown level, which avoids the
  // O(N²) DOM-move cost of grouping at the Cheerio level (every `.append()`
  // of an existing node triggers a linear search of the old parent's child
  // array, turning a run of N blocks into an N²-sized operation on large
  // docs — 2025's biggest chunk has thousands of <p> elements and caused
  // multi-minute stalls under the previous grouping approach).
  if (styles.indentClasses.size > 0 || styles.classMargins.size > 0) {
    // Poem-run detection: a sequence of 5+ consecutive `<p>` siblings
    // (separated only by empty `<p>` stanza-breaks) that all carry a
    // class with margin-left in the 10pt–36pt range — i.e. a small
    // visual indent that's below the standard blockquote threshold —
    // is almost always a verse passage the author indented as a poetry
    // block. CS Lewis's "A Confession" + "Joys that Sting" use 14.2pt
    // for every line of each poem; below the default 36pt threshold,
    // so without this detection the lines render as plain body
    // paragraphs. Mark every <p> in such a run with a sentinel
    // attribute so the downstream blockquote-grouper treats them as
    // indented regardless of the per-class margin.
    const POEM_INDENT_MIN = 10;
    const POEM_INDENT_MAX = 36;
    const POEM_RUN_MIN = 5;
    const hasSmallIndent = (p: ReturnType<typeof $>) => {
      const classes = (p.attr('class') || '').split(/\s+/);
      let ml = 0;
      let ti = 0;
      for (const c of classes) {
        const m = styles.classMargins.get(c);
        if (!m) continue;
        ml += m.marginLeft;
        ti += m.textIndent;
      }
      // Hanging indent (negative text-indent) signals a list item —
      // skip those, same logic as `marginsAreIndented` itself.
      if (ti <= -10) return false;
      return ml >= POEM_INDENT_MIN && ml < POEM_INDENT_MAX;
    };
    const siblings = $('body > p, body > div > p').toArray();
    let runStart = -1;
    let runLen = 0;
    const flushRun = (endIdx: number) => {
      if (runLen >= POEM_RUN_MIN) {
        for (let k = runStart; k < endIdx; k++) {
          $(siblings[k]).attr('data-poem-run', '1');
        }
      }
      runStart = -1;
      runLen = 0;
    };
    for (let i = 0; i < siblings.length; i++) {
      const p = $(siblings[i]);
      const isSmall = hasSmallIndent(p);
      const isEmptyP = !p.text().trim() && !p.find('img').length;
      if (isSmall) {
        if (runStart < 0) runStart = i;
        runLen++;
      } else if (isEmptyP && runStart >= 0) {
        // Empty paragraph inside a candidate run is a stanza break —
        // don't reset the run.
        continue;
      } else {
        flushRun(i);
      }
    }
    flushRun(siblings.length);

    // Single-paragraph poem-block: a single `<p>` with a small-indent
    // class and 5+ `<br>` inside is the same author intent as a run of
    // many sibling `<p>` poem lines — just expressed with line-break
    // markup instead of paragraph breaks. CS Lewis's "Joys that Sting"
    // packs the entire 14-line poem into one `<p class="c2 c17">` with
    // `<br>` between each verse line.
    for (const block of siblings) {
      const p = $(block);
      if (p.attr('data-poem-run')) continue;
      if (!hasSmallIndent(p)) continue;
      const brCount = p.find('br').length;
      if (brCount >= 5) {
        p.attr('data-poem-run', '1');
      }
    }

    const isElementIndented = (el: ReturnType<typeof $>) => {
      if (el.attr('data-poem-run')) return true;
      return isParagraphIndented($, el, styles);
      // Note: we do NOT fall back to checking `<li>` margin on a
      // `<ul>`/`<ol>` element. Google Docs gives every `<li>` a
      // standard 36pt margin-left as the bullet-indent — that's the
      // visual indent built into every list, not a signal of
      // blockquoting. Lists that the author actually intended as
      // blockquoted will have the `<ul>` itself wrapped in a deeper
      // indent class (or sit between other indented `<p>` elements,
      // which the markdown-phase detector handles).
    };

    // Preserve source paragraph spacing inside blockquotes: when two
    // indented `<p>`s sit directly adjacent in the source (no empty
    // `<p>` between them), merge them into one `<p>` with `<br>` so
    // turndown emits them as a single multi-line blockquote paragraph
    // (no blank `>` between). When the source DID have an empty `<p>`
    // between, leave them separate — turndown drops the empty `<p>`
    // and the downstream merge inserts a blank `>` separator.
    //
    // This makes Merry Wives' MISTRESS FORD/MISTRESS PAGE blocks
    // render consistently (the previous behavior fired poetry-
    // compaction on short runs but not long ones, producing alternately
    // tight and loose stacks for blocks that were structurally
    // identical in the source).
    {
      // Sum padding-bottom across all classes applied to a paragraph.
      // The gdoc author's intent: padding-bottom == 0 → next paragraph
      // stacks tight (script-style speaker lines); > 0 → next
      // paragraph gets a visual gap (normal prose). Tight stacking
      // wants `<br>` merge; gappy stacking wants paragraph break.
      const paragraphPaddingBottom = (p: ReturnType<typeof $>) => {
        const classes = (p.attr('class') || '').split(/\s+/);
        let pb = 0;
        for (const c of classes) {
          const m = styles.classMargins.get(c);
          if (m) pb += m.paddingBottom;
        }
        return pb;
      };
      const PADDING_TIGHT_MAX = 3;
      const candidates = $('body > p, body > div > p').toArray();
      let i = 0;
      while (i < candidates.length) {
        const head = $(candidates[i]);
        if (!isElementIndented(head)) { i++; continue; }
        // Don't merge into paragraphs that the upstream `<br>+nbsp`
        // splitter created — those are deliberate prose-paragraph
        // breaks that we just unfolded out of one big `<p>`.
        if (head.attr('data-split-paragraph')) { i++; continue; }
        // Only merge tight when the paragraph itself has no
        // padding-bottom — meaning the author styled it to butt up
        // against the next line without a visual gap.
        if (paragraphPaddingBottom(head) > PADDING_TIGHT_MAX) {
          i++;
          continue;
        }
        // Collect a run of directly-adjacent indented siblings.
        const runMembers: ReturnType<typeof $>[] = [head];
        let j = i + 1;
        while (j < candidates.length) {
          const next = $(candidates[j]);
          // An empty `<p>` between two indented `<p>`s is a source
          // separator; break the run so it survives as a blank `>`.
          if (!next.text().trim() && !next.find('img').length) break;
          if (!isElementIndented(next)) break;
          // Same split-paragraph guard for follow-on members.
          if (next.attr('data-split-paragraph')) break;
          // Padding-bottom guard: if NEXT carries a visual gap, the
          // run ends BEFORE it (next becomes its own paragraph).
          if (paragraphPaddingBottom(next) > PADDING_TIGHT_MAX) {
            runMembers.push(next);
            j++;
            break;
          }
          // Don't merge across siblings that aren't immediate DOM
          // neighbors (some `body > div > p` block between them would
          // mean we'd be picking up a non-adjacent paragraph).
          if ((head[0] as any).parent !== (next[0] as any).parent) break;
          runMembers.push(next);
          j++;
        }
        if (runMembers.length >= 2) {
          // Append each subsequent paragraph's contents to the first
          // with a `<br>` between, then remove the now-empty originals.
          for (let k = 1; k < runMembers.length; k++) {
            head.append('<br>');
            head.append(runMembers[k].contents());
            runMembers[k].remove();
          }
        }
        i = j;
      }
    }

    const allBlocks = $('body > p, body > ul, body > ol, body > div > p, body > div > ul, body > div > ol').toArray();
    for (let bi = 0; bi < allBlocks.length; bi++) {
      const block = allBlocks[bi];
      const el = $(block);
      // An image-only paragraph (text empty, but contains an <img>)
      // must NOT be treated as "empty" here — the stanza-break branch
      // below replaces el.html() with `<br>` and would silently drop
      // the image. Image-only paragraphs get their own handling block
      // (below) that keeps them standalone instead of wrapping them
      // in the surrounding blockquote.
      const hasImg = el.find('img').length > 0;
      const isEmpty = !el.text().trim() && !hasImg;
      // An empty `<p>` between two indented blocks is a stanza break
      // inside what the author wrote as one quote. Turndown drops empty
      // `<p>`s, so the break would vanish — and the markdown-level
      // adjacent-blockquote merge would glue both stanzas into one
      // continuous quote with no visual break. Insert a `<br>` so the
      // empty paragraph turns into a turndown-visible blank line (`>  `
      // in the output), which the poetry-compaction pass below
      // recognizes as a stanza marker. The empty `<p>` itself doesn't
      // need to be indent-classed (some authors mark the gap with a
      // body-paragraph-styled empty paragraph between two indented
      // ones); what matters is that the surrounding blocks are.
      if (isEmpty) {
        const prev = bi > 0 ? $(allBlocks[bi - 1]) : null;
        const next = bi + 1 < allBlocks.length ? $(allBlocks[bi + 1]) : null;
        // Only fire when this empty `<p>` is between two short-line
        // indented paragraphs — that pattern is poetry-with-stanza-
        // break, and turndown's drop of the empty `<p>` would
        // collapse the stanza break in compaction. Prose quotes have
        // long paragraphs and don't need this marker; the markdown
        // merge step already produces a `>` paragraph-break that
        // renders correctly.
        if (prev && next && isElementIndented(prev) && isElementIndented(next)) {
          const POETRY_LINE_MAX = 100;
          const prevText = prev.text().trim();
          const nextText = next.text().trim();
          if (prevText.length <= POETRY_LINE_MAX && nextText.length <= POETRY_LINE_MAX) {
            el.html('<br>');
            el.wrap('<blockquote></blockquote>');
          }
        }
        continue;
      }
      // Image-only paragraphs: keep them standalone by default, even
      // when the source paragraph carries an indent class. Wrapping
      // an image in `> ![...]` changes the rendering from "image
      // breaks the quote at full width" to "image continues the quote
      // with blockquote styling" — that's only the right call when
      // the surrounding context is unmistakably a continuous prose
      // quote (≥1 long indented paragraph on EACH side). When the
      // neighbors are short captions, source links, stanza markers,
      // or non-indented body text, the image is more likely an
      // illustration than part of the quote, and standalone is the
      // safer choice. The data-loss bug fix (don't drop `<img>` bytes)
      // is unconditional — only the blockquote-wrap is gated.
      if (hasImg && !el.text().trim()) {
        if (isElementIndented(el)) {
          const IMG_QUOTE_MIN_TEXT = 100;
          const isLongIndented = (sib: ReturnType<typeof $> | null) =>
            !!sib && isElementIndented(sib) && sib.text().trim().length >= IMG_QUOTE_MIN_TEXT;
          // Look at the nearest non-empty sibling on each side, skipping
          // intermediate truly-empty paragraphs (stanza markers).
          const findNonEmptyNeighbor = (dir: 1 | -1) => {
            let k = bi + dir;
            while (k >= 0 && k < allBlocks.length) {
              const sib = $(allBlocks[k]);
              if (sib.text().trim() || sib.find('img').length) return sib;
              k += dir;
            }
            return null;
          };
          const prev = findNonEmptyNeighbor(-1);
          const next = findNonEmptyNeighbor(1);
          if (isLongIndented(prev) && isLongIndented(next)) {
            el.wrap('<blockquote></blockquote>');
          }
        }
        continue;
      }
      if (isElementIndented(el)) {
        // Don't wrap footnote-DEFINITION paragraphs in blockquote. Some
        // gdoc authors hand-format footnotes at the end of a review using
        // the same text-indent class they use for prose styling; those
        // would otherwise come out as \`> [[N]](#ftnt_refN) ...\` even
        // though they're not quotes.
        //
        // Match the footnote-def anchor only (\`id="ftntN"\`, where N is
        // a digit), NOT the body-reference anchor (\`id="ftnt_refN"\`).
        // Real quote paragraphs frequently end with a body-reference
        // anchor that links into the footnote section, and we want those
        // wrapped normally.
        let hasFtntDefAnchor = false;
        el.find('a[id^="ftnt"]').each(function () {
          const id = $(this).attr('id') || '';
          if (/^ftnt\d/.test(id)) hasFtntDefAnchor = true;
        });
        if (hasFtntDefAnchor) continue;
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
    // Collapse multiple whitespace after a numbered- or bulleted-list
    // marker. Google Docs sometimes uses a span with 5+ nbsps between
    // the bullet/number and the content (visual hanging indent that
    // replaces the standard list-item indent). After nbsp→space
    // normalization those become 5+ regular spaces, and CommonMark
    // treats the content as an INDENTED CODE BLOCK inside the list
    // item — rendering "Peacocking" etc as monospace gray. Don't Bang
    // Denmark is the canonical example. Collapse to a single space
    // so the list item stays a normal list item.
    .replace(/^(\s*(?:\*\*)?(?:\d+\.|[-*•])(?:\*\*)?) {2,}(?=\S)/gm, '$1 ')
    // Restore escaped blockquote markers at the start of a line. Turndown
    // emits `\>` when a `>`-character text fragment sits at the start of
    // a paragraph and could be mistaken for a blockquote marker. The
    // italic-wrapped variant `_\> ... _` happens when the whole paragraph
    // carried italic styling — Google Docs sometimes italicizes
    // typewriter-style quoted excerpts (e.g. Orality and Literacy
    // quoting Homer with `_> ..._`). In both cases the author meant a
    // real blockquote; convert to `> ...`. The italic wrapper is
    // dropped — `>` itself can't be italicized in markdown and the
    // visual effect of italic-on-quoted-prose isn't load-bearing.
    .replace(/^_\\>\s*(.+?)_\s*$/gm, '> $1')
    .replace(/^\\>/gm, '>')
    // Clean up multiple consecutive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove escaped asterisks at line starts (but preserve ** for bold)
    .replace(/^\\(\*[^*])/gm, '$1')
    // Collapse adjacent identical-emphasis delimiters that came from
    // Google Docs splitting a bold/italic run across multiple sibling
    // spans (e.g. the run plus a trailing punctuation span both flagged
    // bold), which Turndown emits as `**foo****bar**` or `__foo____bar__`.
    // The `****` / `____` pairs render as literal characters in some
    // markdown parsers and look ugly even when they don't. Only collapse
    // when sandwiched between non-whitespace characters; a `****` line by
    // itself is a thematic break and must be preserved.
    .replace(/(?<=\S)\*\*\*\*(?=\S)/g, '')
    .replace(/(?<=\S)____(?=\S)/g, '')
    // Repair broken italic across a non-italic span (typically a book
    // title set in roman inside italic prose):
    //   `_X_ Y_punct...rest_` → `_X_ Y*punct...rest*`
    // CommonMark's `_` flanking rules disallow `_` from opening when
    // preceded by an alphanumeric and followed by punctuation (e.g.
    // `Karamazov_.`), so the second italic chunk renders as literal
    // underscores. `*` has more lenient flanking and opens cleanly
    // before punctuation. Constrained to: a balanced `_X_`, then space,
    // then a non-italic chunk, then an italic run that STARTS with
    // punctuation — that combination is exactly the "italic / roman
    // title / italic-resumed" pattern and is otherwise unambiguous.
    .replace(
      /(_[^_\n]+?_)(\s+)([^_\n]+?)_([.,;:][^_\n]*?)_/g,
      '$1$2$3*$4*'
    );

  // Dedent italic-only lines that start with significant leading
  // whitespace. Some authors indent poem lines via &nbsp; runs for
  // visual rhythm; after our nbsp→space normalization above, lines with
  // 4+ leading spaces would render as indented CODE BLOCKS in CommonMark,
  // turning the italic poetry into grey monospace text. The line is
  // safe to dedent because the entire content is wrapped in `_`-italic
  // (`_` is not a meaningful character in indented code blocks).
  md = md.replace(/^ {4,}(_[^_\n]+_[ \t]*)$/gm, '$1');

  // Dedent over-indented lines inside blockquotes. After nbsp→space
  // normalization, a blockquoted verse line like `>      **Myrmidons...`
  // has 5+ leading spaces inside the blockquote, which CommonMark parses
  // as an INDENTED CODE BLOCK — rendered as monospace grey on a grey
  // muted background (unreadable). We don't want any author-intended
  // markdown to silently turn into code; preserve a single space of
  // visual lead-in and drop the rest.
  md = md.replace(/^(>\s)[ \t]{4,}(?=\S)/gm, '$1');
  // And the same for body lines that aren't quoted: 4+ leading spaces
  // on inline-emphasis content is the nbsp-indent artifact left over
  // from Google Docs first-line indentation, not an intentional code
  // block. Don't touch list markers (`* ` / `- ` / `1. `) — those
  // indents ARE meaningful (nested list children).
  //
  // We deliberately do NOT dedent indented `#`-prefixed lines.  In
  // Google Docs exports, Python code blocks come through as a sequence
  // of paragraphs with leading `&nbsp;`s for indent; after our nbsp→
  // space normalization, an inline code comment like `    # get wins`
  // would dedent to `# get wins`, which the H1-splitter then sees as
  // a new review boundary and splits one review into many.
  md = md.replace(/^ {4,}(?=(?:\*\*|_))/gm, '');

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
  //
  // Even without an attribution, a run of 2+ italic-only short lines is
  // almost always poetry/song lyrics. Wrap those too — the downstream
  // poetry-compaction pass will render them with hard line breaks.
  {
    // Attribution shape: a single bullet-list item, optionally inside a
    // blockquote (`> *   foo` if the gdoc list happened to be inside a
    // blockquote group, or just `*   foo` otherwise). The "standalone"
    // guard below — next non-blank line is NOT another such bullet —
    // ensures multi-item lists (which aren't attributions) don't fire.
    const isAttribution = (s: string) => /^(?:>\s*)?[*-]\s+\S/.test(s);
    const isItalicOnly = (s: string) => /^\s*_[^_\n]+_[ \t]*$/.test(s);
    const POETRY_LEN = 80;
    const plainTextLen = (s: string) =>
      s.trim().replace(/[*_~`>]/g, '').trim().length;
    const lines = md.split('\n');
    let i = 0;
    while (i < lines.length) {
      if (!isItalicOnly(lines[i])) { i++; continue; }
      // Collect a contiguous run of italic-only paragraphs (with
      // blank lines allowed between).
      const italicIdxs: number[] = [];
      let j = i;
      while (j < lines.length) {
        if (lines[j].trim() === '') { j++; continue; }
        if (isItalicOnly(lines[j])) { italicIdxs.push(j); j++; continue; }
        break;
      }
      // Check whether a standalone attribution follows.
      let attribIdx = -1;
      if (j < lines.length && isAttribution(lines[j])) {
        let k = j + 1;
        while (k < lines.length && lines[k].trim() === '') k++;
        if (k >= lines.length || !isAttribution(lines[k])) attribIdx = j;
      }
      const allShort = italicIdxs.every(
        idx => plainTextLen(lines[idx]) <= POETRY_LEN
      );
      const shouldWrap =
        attribIdx >= 0 ||
        (italicIdxs.length >= 2 && allShort);
      if (shouldWrap) {
        for (const idx of italicIdxs) {
          lines[idx] = `> ${lines[idx].trim()}`;
        }
        if (attribIdx >= 0 && !/^>/.test(lines[attribIdx])) {
          lines[attribIdx] = `> ${lines[attribIdx].trim()}`;
        }
        i = attribIdx >= 0 ? attribIdx + 1 : j;
      } else {
        i = j;
      }
    }
    md = lines.join('\n');
  }

  // Convert single-paragraph pull-quotes to blockquotes. Pattern: a line
  // that STARTS with `"` or `"` and ENDS with `"` or `"` (optionally
  // followed by a parenthesized citation like `(intro)`, `(189-90)`, or
  // ` [1]`), with no intervening quote marks. This catches the common
  // convention of setting off a long quoted passage as its own paragraph
  // (Affluent Society uses this for every excerpt from Galbraith).
  // Risk of false positives is low — paragraph-shaped lines that open
  // AND close on a quotation, with nothing outside the quotes other than
  // a citation, are essentially always pull-quotes.
  {
    const OPEN_QUOTE = /[“"]/;
    // Match optional trailing `_` or `*` after the closing quote — Google
    // Docs sometimes wraps the close-quote glyph in an italic span (the
    // gdoc author hit italic mid-line), so the line ends with e.g.
    // `…holiday.**_”_` instead of `…holiday."`. Accept that variant so
    // the line still counts as a single-paragraph pull quote.
    const QUOTE_PARA_RE =
      /^[“"][^“”"\n]+[”"][_*]?(?:\s*\([^)\n]+\))?(?:\s*\[\d+\])?\s*$/;
    md = md
      .split('\n')
      .map(line => {
        if (!OPEN_QUOTE.test(line[0] || '')) return line;
        if (line.startsWith('> ')) return line; // already a blockquote
        if (!QUOTE_PARA_RE.test(line)) return line;
        return `> ${line}`;
      })
      .join('\n');
  }

  // Merge adjacent blockquote paragraphs separated by a single blank line
  // into a single multi-paragraph blockquote. We emit one <blockquote> per
  // indented block (to avoid O(N²) DOM moves during the GDoc→HTML pass);
  // this restores the multi-paragraph quote rendering at the markdown level.
  // Pattern: a blockquote line, blank line, another blockquote line. The
  // global match is non-overlapping, so a single pass merges chains.
  md = md.replace(/(^>.*)\n\n(?=>)/gm, '$1\n>\n');

  // (Poetry-compaction pass removed.) Source-paragraph spacing is now
  // preserved by the HTML-stage adjacent-`<p>` merge: paragraphs the
  // author wrote as adjacent siblings (no empty `<p>` between) are
  // glued into one `<p>` with `<br>` so they emit as a single multi-
  // line blockquote paragraph; paragraphs separated by an empty `<p>`
  // stay separate and the markdown-stage blockquote-merge inserts the
  // blank `>` between them. The old poetry-compaction had to guess
  // from line length and produced inconsistent output (e.g. Merry
  // Wives' short FORD/Did pair tightened while the long PAGE/Letter
  // pair stayed loose, despite identical source structure).

  // Convert hard-break joins between prose paragraphs (outside any
  // blockquote) into proper paragraph breaks. Some gdocs use `<br>`
  // between sibling paragraphs inside one `<p>` instead of separate
  // `<p>` elements; turndown emits `  \n` (trailing two-space hard
  // break) between them, and the renderer shows them as a single
  // paragraph with line-breaks instead of multiple paragraphs.
  // Outside blockquotes (where `  ` is usually a verse-line marker),
  // hard-break-joined prose is almost always a paragraph-break
  // formatting error in the source.
  {
    const lines = md.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.endsWith('  ') && !l.startsWith('>')) {
        const next = lines[i + 1];
        if (
          next !== undefined &&
          next.trim() !== '' &&
          !next.startsWith('>') &&
          !next.startsWith('![')
        ) {
          out.push(l.replace(/\s+$/, ''));
          out.push('');
          continue;
        }
      }
      out.push(l);
    }
    md = out.join('\n');
  }

  // Collapse consecutive blank-`>` lines in a blockquote into a single
  // `>` blank. The stanza-marker insertion earlier in the pipeline may
  // leave the markdown with patterns like `> \n> \n>  \n>` between
  // paragraphs — renderers treat that as one paragraph break anyway,
  // but the extra lines bloat the wordCount frontmatter and add noise.
  md = md.replace(/(?:^>[ \t]*\n){2,}/gm, '>\n');

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

  // Promote bold-only short standalone lines to H2. Simplest possible
  // rule (per user feedback after the older heuristic-stack got too
  // fragile): a line that is ENTIRELY `**…**` and short (≤120 chars
  // inside the delimiters) becomes a heading. Skip lines that are
  // clearly NOT headings:
  //   • Sentence-fragment punctuation at the end (`,` / `;`) — those
  //     are bold emphasis runs inside a paragraph.
  //   • A leading em/en-dash — almost always a bold attribution after
  //     a quote (`**— Author**`), not a section title.
  // A trailing `.`/`?`/`:` is FINE — titles like `The Pledge.` and
  // `What about X?` are common.
  {
    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = /^\*\*([^*\n]{1,120})\*\*[ \t]*$/.exec(lines[i]);
      if (!m) continue;
      const text = m[1].trim();
      if (!text) continue;
      // Reject bold lines that end with any sentence punctuation. Real
      // titles usually don't end in `.!?:;,` — and reviews like The Son
      // Also Rises use bold-sentence emphasis whose every instance ends
      // in `.`, which we don't want sweeping into the heading tree.
      // Headings styled with a TRUE Heading-N style or with large-font
      // styling are handled separately in the HTML-stage pass.
      if (/[.!?:;,]$/.test(text)) continue;
      if (/^[-–—]|[-–—]$/.test(text)) continue;
      // Strip turndown's `\.` escape; inside `## …` it's not needed.
      const headingText = text.replace(/(\d)\\\./g, '$1.');
      lines[i] = `## ${headingText}`;
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
  // Also handles the `N: content` form (colon separator, no extra
  // whitespace) used by docs like A Residence of Twenty-One Years.
  //
  // Heuristic: walk back from EOF, collecting consecutive numbered-def
  // lines (allowing blank lines between). Require 2+ such lines to avoid
  // converting a single coincidentally numbered tail paragraph.
  {
    const lines = md.split('\n');
    let i = lines.length - 1;
    while (i >= 0 && lines[i].trim() === '') i--;
    const defIndices: number[] = [];
    // Match trailing footnote defs in any of these shapes:
    //   `N   content`     — two-space gap
    //   `N: content`      — colon
    //   `[N]: content`    — bracketed + colon (looks like a markdown
    //                      link-reference def, but with prose content,
    //                      not a URL, it's a footnote def)
    //   `**N**. content`  — bold number + period (Mentzer style)
    //   `**N**: content`  — bold number + colon
    // For the bracketed form, exclude lines whose content is a URL
    // (those ARE link-reference defs).
    const TAIL_DEF_RE =
      /^(?:\d+(?:\s{2,}|:\s+)|\[\d+\]:\s+|\*\*\d+\*\*[.:]\s+)\S/;
    const isLinkRefDef = (line: string) =>
      /^\[\d+\]:\s+<?https?:\/\//.test(line);
    while (i >= 0) {
      const line = lines[i];
      if (TAIL_DEF_RE.test(line) && !isLinkRefDef(line)) {
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
        lines[idx] = lines[idx]
          .replace(/^(\d+)\s{2,}/, '[$1] ')
          .replace(/^(\d+):\s+/, '[$1] ')
          .replace(/^\[(\d+)\]:\s+/, '[$1] ')
          .replace(/^\*\*(\d+)\*\*[.:]\s+/, '[$1] ');
      }
      md = lines.join('\n');
    }
  }

  // Numbered footnote defs after a "Footnotes" / "Footnote" marker.
  // Some gdoc authors title a section "Footnotes" (or "Footnote:" for a
  // single one) and then list defs as plain numbered paragraphs
  // `N. text` (turndown sometimes escapes the period as `N\.` when N
  // could otherwise start a numbered list). Body refs use the
  // convention `[N]` (a bare bracketed digit, often preceded by a
  // space).
  //
  // Rewrite both to pandoc-style `[^N]` so lib/footnotes.ts picks them
  // up via the `pandoc` format. The explicit Footnotes marker (heading
  // or plain `Footnote:` paragraph) is a strong enough signal that we
  // allow 1+ matching def lines — Hero in History has just one footnote.
  {
    // Match the Footnotes/Notes section marker. Variants accepted:
    //   `## Footnotes`, `### Notes:`, `## Note`
    //   `**Footnotes:**`, `**Notes:**`
    //   plain `Footnotes`, `Notes:`, etc.
    const KEY = '(?:Footnotes?|Notes?)';
    const markerRe = new RegExp(
      `^(?:#{2,4}[ \\t]+${KEY}:?[ \\t]*|\\*\\*${KEY}:?\\*\\*[ \\t]*|${KEY}[ \\t]*:?[ \\t]*)$`,
      'm'
    );
    const markerMatch = markerRe.exec(md);
    if (markerMatch) {
      const before = md.slice(0, markerMatch.index);
      const markerLine = markerMatch[0];
      const after = md.slice(markerMatch.index + markerLine.length);
      const afterLines = after.split('\n');
      // Identify numbered-def lines and their ids in order. Accept
      // any of `N.`, `N\.`, `N:`, `(N)`, or `[N]` as the leading
      // marker. Optional `>` blockquote prefix — some authors style
      // the footnotes block as a blockquoted indented passage
      // (Sovereign Child does this for its `Notes:` section).
      const defLineRe =
        /^>?\s*(?:\[(\d+)\]|\((\d+)\)|(\d+)\\?[.:])[ \t]+(.*)$/;
      const ids: string[] = [];
      const rewrittenAfter = afterLines.map(line => {
        const m = defLineRe.exec(line);
        if (m) {
          const id = m[1] ?? m[2] ?? m[3];
          ids.push(id);
          return `[^${id}]: ${m[4]}`;
        }
        return line;
      });
      if (ids.length >= 1) {
        // Promote a plain `Footnote:` / `Footnotes:` paragraph marker to
        // an actual `## Footnotes` heading so it renders as a real
        // section divider.
        const isHeading = /^##/.test(markerLine);
        const normalizedMarker = isHeading ? markerLine : '## Footnotes';
        // Rewrite body refs to `[^N]` for the ids we found. Accept
        // either `[N]` (bracketed) or `(N)` (parenthesized — used by
        // docs like Bickerstaff that use parens consistently). Only
        // when not already a link / image reference (so a `[N]` glued
        // to `(http…)` or `:url` stays untouched).
        const idSet = new Set(ids);
        const reBody = /(\s?)\[(\d+)\](?![(:])/g;
        const reBodyParen = /(\s)\((\d+)\)/g;
        const newBefore = before
          .replace(reBody, (full, sp, n: string) => {
            if (!idSet.has(n)) return full;
            return `[^${n}]`;
          })
          .replace(reBodyParen, (full, sp, n: string) => {
            if (!idSet.has(n)) return full;
            // Preserve the leading space (it sat between a sentence
            // and the parenthesized ref); pandoc renderers join `[^N]`
            // tightly to surrounding text.
            return `${sp}[^${n}]`;
          });
        md = newBefore + normalizedMarker + rewrittenAfter.join('\n');
      }
    }
  }

  // Normalize heading depth. Some authors style every section with the
  // Heading-4 style in Google Docs (`####`) but use no Heading-2 — the
  // result is sections that render as tiny, weak headings in the
  // reader's typography (`<h4>` is typically much smaller than `<h2>`).
  // When the doc has H3-or-deeper headings but NO H2, shift every
  // heading shallower so the shallowest H-level becomes H2. Examples:
  //   • Gilgamesh has only `####` → all `####` become `##`
  //   • A doc using `###` + `####` has `###` → `##` and `####` → `###`
  // We deliberately skip H1 in this calculation: H1 is usually the
  // document title (one per file) and shouldn't change depth.
  {
    const lines = md.split('\n');
    const headingRe = /^(#{1,6})\s/;
    // Ignore H1 entirely — those are title/byline lines (Google Docs
    // Heading-1 style), and they'll be stripped by stripLeadingTitle.
    // Only consider H2-H6 when deciding the shallowest section depth.
    let shallowest = 7;
    for (let i = 0; i < lines.length; i++) {
      const m = headingRe.exec(lines[i]);
      if (m) {
        const level = m[1].length;
        if (level < 2) continue;
        if (level < shallowest) shallowest = level;
      }
    }
    if (shallowest > 2 && shallowest <= 6) {
      const shift = shallowest - 2;
      for (let i = 0; i < lines.length; i++) {
        const m = headingRe.exec(lines[i]);
        if (m) {
          const level = m[1].length;
          if (level < 2) continue; // leave H1 alone
          const newLevel = Math.max(2, level - shift);
          lines[i] = '#'.repeat(newLevel) + lines[i].slice(m[1].length);
        }
      }
      md = lines.join('\n');
    }
  }

  // `FOOTNOTE N` keyword-style footnotes (Der Untergang format). Body
  // refs appear as `[FOOTNOTE N]` or `(FOOTNOTE N)`; definitions at
  // the tail are `FOOTNOTE N` (with optional trailing colon) headers
  // followed by body paragraph(s). Rewrite to pandoc.
  //
  // Multi-paragraph footnote bodies are joined into a single
  // `[^N]: …` def line by indenting continuation paragraphs (pandoc's
  // syntax). Only fires when 2+ such headers exist, so we don't
  // mis-fire on a stray "FOOTNOTE 1" line in some other context.
  {
    const headerRe = /^FOOTNOTE\s+#?(\d+):?\s*$/m;
    const lines = md.split('\n');
    const headerIdxs: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (headerRe.test(lines[i])) headerIdxs.push(i);
    }
    if (headerIdxs.length >= 2) {
      // Process from last to first so indices stay valid.
      const ids: string[] = [];
      for (let h = headerIdxs.length - 1; h >= 0; h--) {
        const startIdx = headerIdxs[h];
        const endIdx = h + 1 < headerIdxs.length
          ? headerIdxs[h + 1]
          : lines.length;
        const m = headerRe.exec(lines[startIdx])!;
        const id = m[1];
        ids.push(id);
        // Skip blanks immediately after header.
        let bodyStart = startIdx + 1;
        while (bodyStart < endIdx && lines[bodyStart].trim() === '') bodyStart++;
        if (bodyStart >= endIdx) {
          // No body — replace header alone.
          lines.splice(startIdx, endIdx - startIdx, `[^${id}]: `);
          continue;
        }
        // First body line gets the `[^N]:` prefix. Remaining non-blank
        // lines get a 4-space indent so the pandoc extractor reads
        // them as continuation lines of the same def.
        const replacement: string[] = [`[^${id}]: ${lines[bodyStart]}`];
        for (let k = bodyStart + 1; k < endIdx; k++) {
          if (lines[k].trim() === '') {
            replacement.push('');
          } else {
            replacement.push(`    ${lines[k]}`);
          }
        }
        lines.splice(startIdx, endIdx - startIdx, ...replacement);
      }
      const idSet = new Set(ids);
      md = lines.join('\n')
        .replace(/\[FOOTNOTE\s+#?(\d+)\]/g, (full, n: string) =>
          idSet.has(n) ? `[^${n}]` : full)
        .replace(/(\s)\(FOOTNOTE\s+#?(\d+)\)/g, (full, sp, n: string) =>
          idSet.has(n) ? `${sp}[^${n}]` : full);
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
  const cachePath = path.join(GDOC_CACHE_DIR, `${docId}.html`);
  if (!GDOC_CACHE_DISABLED && fs.existsSync(cachePath)) {
    console.log(`  Reading cached: ${docId}`);
    return fs.readFileSync(cachePath, 'utf8');
  }

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
        if (!GDOC_CACHE_DISABLED) {
          fs.mkdirSync(GDOC_CACHE_DIR, { recursive: true });
          fs.writeFileSync(cachePath, text);
        }
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
function convertHtmlChunk(html: string, bodySizeHint?: number): string {
  // Parse CSS class→style mappings BEFORE loading into Cheerio and removing <style>.
  const styles = parseGDocStyles(html, bodySizeHint);

  const $ = cheerio.load(html);

  // Remove Google Docs page-footer artifacts. Docs that had a header/footer
  // turned on export with a stub like `<div><p>...Page  of </p></div>`
  // (or "Page 3 of 7" with literal numbers) sitting at the bottom of the
  // body, just before the footnote `<hr>`. These leak into the rendered
  // review as a stray "Page of" line. Match the normalized text content of
  // any top-level <p>/<div> to the page-number pattern and strip it.
  const PAGE_FOOTER_RE = /^\s*Page\s*(?:[0-9ivxlcdm]+)?\s*of\s*(?:[0-9ivxlcdm]+)?\s*$/i;
  $('body > div, body > p').each(function () {
    const el = $(this);
    const text = el.text().replace(/ /g, ' ').trim();
    if (text && PAGE_FOOTER_RE.test(text)) {
      el.remove();
    }
  });

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
  // We also preserve spans containing a `<br>` — those are standalone
  // line-break separators between sibling spans inside one `<p>`
  // (e.g. dialogue lines in Tale of Genji); removing them collapses the
  // dialogue into a single run-on line.
  $('span').each(function() {
    const el = $(this);
    if (!el.text() && !el.find('img').length && !el.find('br').length) {
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

  // Compute body font size ONCE across the whole document. Without
  // this hint, each chunk would compute its own — and a chunk that
  // happens to be dominated by footnote text (smaller font) would mis-
  // identify the body font, then sweep real body paragraphs into the
  // "large font = heading" rule. Dictator Book Club exhibited this:
  // a chunk where 10pt footnote text outweighed 13pt body text re-
  // classified 13pt body paragraphs as headings.
  const bodySizeHint = detectBodyFontSize(html);

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
    parts.push(convertHtmlChunk(shell, bodySizeHint));
  }

  // Concatenating cleaned chunks may produce 4+ consecutive blank lines at
  // chunk boundaries. Collapse those once more.
  return parts.join('\n\n').replace(/\n{4,}/g, '\n\n\n');
}
