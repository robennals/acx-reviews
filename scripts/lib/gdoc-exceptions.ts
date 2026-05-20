/**
 * One-off exceptions for the gdoc pipeline.
 *
 * The pipeline applies the same heuristic conversion rules to every gdoc.
 * Most reviews fit those rules; a few have unusual structure (e.g., a
 * multi-section review with section headings the pipeline mistakes for
 * separate reviews, or a paired-bold pattern only one author uses) where
 * the generic rules produce the wrong output.
 *
 * Rather than over-fit the generic rules to one-off cases, the pipeline
 * loads `data/gdoc-exceptions.json` and applies these surgical overrides
 * after conversion. Two kinds of override are supported:
 *
 * - **slugRenames**: when the title produces a specific base slug, rewrite
 *   the slug + title to use these values instead. Used for reviews the
 *   pipeline misclassifies (e.g., a section heading interpreted as a new
 *   review's title).
 *
 * - **perFileH2Overrides**: for the named slug, the listed bold-only lines
 *   become H2 headings and any other H2 in the file reverts to bold. Used
 *   for files where the bold-only-to-H2 promoter picks the wrong line in
 *   a stacked-bold pattern.
 *
 * Keep this file small. If a pattern appears in 2+ unrelated reviews, fix
 * the generic rule in `gdoc-html.ts` instead.
 */
import fs from 'fs';
import path from 'path';

export interface SlugRenameRule {
  /** Base slug the pipeline derives via `slugify(title)`. */
  fromBaseSlug: string;
  /** Slug to use instead. */
  toSlug: string;
  /** Title to use instead. */
  toTitle: string;
  /** Free-text comment for humans — not used by the code. */
  comment?: string;
}

export interface PerFileH2OverrideRule {
  /** Bold-only lines (inner text, no `**`) that should be promoted to H2. */
  h2Lines: string[];
  /** Free-text comment for humans. */
  comment?: string;
}

export interface GDocExceptions {
  slugRenames: SlugRenameRule[];
  perFileH2Overrides: Record<string, PerFileH2OverrideRule>;
}

const EMPTY: GDocExceptions = { slugRenames: [], perFileH2Overrides: {} };

let cached: GDocExceptions | null = null;

export function loadExceptions(cwd: string = process.cwd()): GDocExceptions {
  if (cached) return cached;
  const filepath = path.join(cwd, 'data', 'gdoc-exceptions.json');
  if (!fs.existsSync(filepath)) {
    cached = EMPTY;
    return cached;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filepath, 'utf8')) as Partial<GDocExceptions>;
    cached = {
      slugRenames: parsed.slugRenames ?? [],
      perFileH2Overrides: parsed.perFileH2Overrides ?? {},
    };
    return cached;
  } catch (err) {
    console.warn(`Failed to parse gdoc-exceptions.json: ${err}`);
    cached = EMPTY;
    return cached;
  }
}

/** Reset the cache. Tests use this; production callers don't need it. */
export function resetCache(): void {
  cached = null;
}

/**
 * Apply a per-file H2 override: promote the listed bold-only lines to H2
 * and revert any other H2 in the markdown back to bold. Returns the new
 * markdown content.
 */
export function applyH2Overrides(markdown: string, allowedH2Lines: string[]): string {
  const allowed = new Set(allowedH2Lines.map(l => l.trim()));
  // Unescape turndown's markdown escapes so the allowed-list can be
  // written with natural text (e.g. "1. Foo" matches `1\. Foo`).
  const unescape = (s: string) => s.replace(/\\([.])/g, '$1').trim();
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const boldMatch = /^\*\*([^*\n]+)\*\*[ \t]*$/.exec(lines[i]);
    if (boldMatch && allowed.has(boldMatch[1].trim())) {
      lines[i] = `## ${boldMatch[1].trim()}`;
      continue;
    }
    // Plain (non-bold) lines: a single short paragraph whose unescaped
    // text appears in the allowed list. Used for documents like Fear and
    // Trembling where section headings are plain `1. Title` paragraphs
    // (no bold or heading style in the source gdoc).
    const plainText = unescape(lines[i]);
    if (
      plainText &&
      allowed.has(plainText) &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('*') &&
      !lines[i].startsWith('-')
    ) {
      lines[i] = `## ${plainText}`;
      continue;
    }
    const h2Match = /^## (.+?)\s*$/.exec(lines[i]);
    if (h2Match && !allowed.has(h2Match[1].trim())) {
      lines[i] = `**${h2Match[1].trim()}**`;
    }
  }
  return lines.join('\n');
}

/**
 * Look up a slug-rename rule for the given base slug. Returns the rule or
 * null if no rule matches.
 */
export function findSlugRename(
  exceptions: GDocExceptions,
  baseSlug: string,
): SlugRenameRule | null {
  return exceptions.slugRenames.find(r => r.fromBaseSlug === baseSlug) ?? null;
}

/**
 * Look up a per-file H2 override for the given slug.
 */
export function findH2Override(
  exceptions: GDocExceptions,
  slug: string,
): PerFileH2OverrideRule | null {
  return exceptions.perFileH2Overrides[slug] ?? null;
}
