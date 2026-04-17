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
    // Detect meaningful indentation (blockquote-like).
    // Google Docs uses two patterns for indented/quoted text:
    //   1. margin-left >= 18pt  (block-level left indent)
    //   2. text-indent >= 24pt  (deep first-line indent, distinct from the
    //      normal ~13.5pt first-line indent used for body paragraphs)
    const marginMatch = props.match(/margin-left\s*:\s*(\d+(?:\.\d+)?)pt/);
    if (marginMatch && parseFloat(marginMatch[1]) >= 18) {
      indentClasses.add(cls);
    }
    const textIndentMatch = props.match(/text-indent\s*:\s*(\d+(?:\.\d+)?)pt/);
    if (textIndentMatch && parseFloat(textIndentMatch[1]) >= 24) {
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

  // Blockquote: group consecutive indented block elements (p, ul, ol) into a
  // single <blockquote> so they render as one block, not many separate quotes.
  // This handles indented paragraphs followed by indented lists (common in
  // Google Docs where a quote intro is followed by bullet points).
  if (styles.indentClasses.size > 0) {
    // Check if an element (or its children for lists) is indented
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
    let i = 0;
    while (i < allBlocks.length) {
      const el = $(allBlocks[i]);
      const indented = isElementIndented(el);

      if (indented && el.text().trim()) {
        // Start of an indented run
        const runStart = i;
        while (i < allBlocks.length) {
          const curr = $(allBlocks[i]);
          const currIndented = isElementIndented(curr);
          const isEmpty = !curr.text().trim();
          if (currIndented || (isEmpty && i > runStart && i + 1 < allBlocks.length)) {
            if (isEmpty) {
              const next = $(allBlocks[i + 1]);
              if (!isElementIndented(next)) break;
            }
            i++;
          } else {
            break;
          }
        }

        // Wrap the entire run in a single <blockquote>
        const bq = $('<blockquote></blockquote>');
        $(allBlocks[runStart]).before(bq);
        for (let j = runStart; j < i; j++) {
          bq.append(allBlocks[j]);
        }
      } else {
        i++;
      }
    }
  }

  // Also detect paragraphs indented with &nbsp; runs (Google Docs sometimes
  // uses non-breaking spaces instead of CSS for indentation). The nbsp
  // characters may be inside nested <span> elements.
  $('p').each(function () {
    const el = $(this);
    if (el.closest('blockquote').length) return;
    // Get the raw text content (Cheerio decodes &nbsp; to \u00a0)
    const text = el.text();
    // Check if text starts with ≥6 non-breaking spaces (with optional leading newline)
    if (/^\s*\u00a0{6,}/.test(text)) {
      // Strip the leading nbsp indent from the inner HTML.
      // Walk the first text-bearing descendant and trim its leading whitespace.
      const firstSpan = el.find('span').first();
      const target = firstSpan.length ? firstSpan : el;
      const innerHtml = target.html() || '';
      const cleaned = innerHtml
        .replace(/^(<br\s*\/?>)?\s*((\u00a0|&nbsp;)\s*)+/, '')
        .trim();
      target.html(cleaned);
      el.wrap('<blockquote></blockquote>');
    }
  });
}

/**
 * Clean up markdown output
 */
export function cleanupMarkdown(markdown: string): string {
  return markdown
    // Strip leading non-breaking spaces from blockquote lines (Google Docs
    // sometimes uses &nbsp; for indentation even inside CSS-indented blocks)
    .replace(/^(>\s*)\u00a0+/gm, '$1')
    // Convert soft line breaks (trailing two spaces) inside blockquotes to
    // full paragraph breaks. Google Docs uses <br> (Shift+Enter) within a
    // single <p>, which Turndown renders as "  \n" — but inside a blockquote
    // this should be a new paragraph for consistent spacing.
    .replace(/^(>.*) {2,}\n(?=>)/gm, '$1\n>\n')
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
    .replace(/^\\(\*[^*])/gm, '$1')
    .trim();
}

/**
 * Fetch a Google Doc as HTML using the public export URL
 */
export async function fetchGDocAsHTML(docId: string): Promise<string> {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
  console.log(`  Fetching doc: ${docId}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for doc ${docId}`);
  }

  return await response.text();
}

/**
 * Extract the document body content from Google Docs HTML export
 * and convert to markdown
 */
export function convertGDocToMarkdown(html: string): string {
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
