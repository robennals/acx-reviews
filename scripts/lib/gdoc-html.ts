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

  // Merge adjacent blockquote paragraphs separated by a single blank line
  // into a single multi-paragraph blockquote. We emit one <blockquote> per
  // indented block (to avoid O(N²) DOM moves during the GDoc→HTML pass);
  // this restores the multi-paragraph quote rendering at the markdown level.
  // Pattern: a blockquote line, blank line, another blockquote line. The
  // global match is non-overlapping, so a single pass merges chains.
  md = md.replace(/(^>.*)\n\n(?=>)/gm, '$1\n>\n');

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

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const label = attempt === 1 ? '' : ` (attempt ${attempt}/${MAX_ATTEMPTS})`;
    console.log(`  Fetching doc: ${docId}${label}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        return await response.text();
      }

      // 4xx (except 429) is unlikely to succeed on retry — fail fast.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for doc ${docId}`);
      }

      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for doc ${docId} after ${MAX_ATTEMPTS} attempts`);
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`  ⚠️  HTTP ${response.status} — backing off ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    } catch (err: unknown) {
      // Network errors (ENOTFOUND, ECONNRESET, etc.) — retry up to the limit.
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
