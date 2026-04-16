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
    // Detect meaningful left indentation (blockquote-like).
    // Google Docs uses margin-left for indented paragraphs.
    // Ignore small indents (text-indent for first-line) — only catch
    // margin-left >= 18pt which typically indicates a block indent.
    const marginMatch = props.match(/margin-left\s*:\s*(\d+(?:\.\d+)?)pt/);
    if (marginMatch && parseFloat(marginMatch[1]) >= 18) {
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
        // Don't double-wrap if already inside <strong> or <b>
        if (!el.closest('strong, b').length) {
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
        if (!el.closest('em, i').length) {
          el.wrapInner('<em></em>');
        }
      }
    });
  }

  // Blockquote: wrap indented paragraphs
  if (styles.indentClasses.size > 0) {
    $('p').each(function () {
      const el = $(this);
      const classes = (el.attr('class') || '').split(/\s+/);
      const isIndented = classes.some(c => styles.indentClasses.has(c));
      if (isIndented && el.text().trim()) {
        el.wrap('<blockquote></blockquote>');
      }
    });
  }
}

/**
 * Clean up markdown output
 */
export function cleanupMarkdown(markdown: string): string {
  return markdown
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
