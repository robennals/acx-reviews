#!/usr/bin/env tsx
/**
 * Generate an EPUB3 of all entries for one contest.
 *
 * Usage:
 *   pnpm generate-epub <contestId> [--upload]
 *   pnpm generate-epub 2026-book-reviews --upload
 *
 * Steps: render every entry through the site markdown pipeline,
 * download + downscale images, package with jszip, validate with
 * epubcheck (mandatory — install via `brew install epubcheck`).
 * With --upload: push to R2 under a content-hashed key and update
 * the committed data/epubs.json manifest.
 */

import 'dotenv/config';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { parseMarkdown, markdownToHtml } from '../lib/markdown';
import { htmlFragmentToXhtml, wrapXhtmlDocument, escapeXml } from './lib/epub/xhtml';
import {
  sortEntries,
  collectImageUrls,
  rewriteImageSrcs,
  buildChapterBody,
  chapterFilename,
  stripBrokenFragmentLinks,
} from './lib/epub/chapters';
import {
  buildContainerXml,
  buildContentOpf,
  buildNavXhtml,
  buildTocNcx,
  EPUB_CSS,
  type EpubItem,
  type TocEntry,
} from './lib/epub/opf';
import { fetchAndProcessImages } from './lib/epub/images';
import { generateCover } from './lib/epub/cover';
import { mergeManifest, type EpubManifestEntry } from './lib/epub/manifest';
import { uploadIfMissing } from './lib/r2-client';

const SITE_URL = 'https://acxreviews.robennals.org';

interface IndexEntry {
  contestId: string;
  title: string;
  slug: string;
  wordCount: number;
}

async function main() {
  const args = process.argv.slice(2);
  const upload = args.includes('--upload');
  const contestId = args.find((a) => !a.startsWith('--'));
  if (!contestId) {
    console.error('Usage: pnpm generate-epub <contestId> [--upload]');
    process.exit(1);
  }

  const contests = JSON.parse(fs.readFileSync('data/contests.json', 'utf8')) as Array<{
    id: string;
    name: string;
    year: number;
  }>;
  const contest = contests.find((c) => c.id === contestId);
  if (!contest) {
    console.error(`Unknown contest: ${contestId}`);
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync('data/reviews-index.json', 'utf8')) as IndexEntry[];
  const entries = sortEntries(index.filter((r) => r.contestId === contestId));
  if (entries.length === 0) {
    console.error(`No entries found for ${contestId}`);
    process.exit(1);
  }
  console.log(`${entries.length} entries for ${contest.name}`);

  // --- Render chapters through the site pipeline ---
  const chapters: Array<{
    slug: string;
    title: string;
    file: string;
    html: string; // body fragment, pre-XHTML
  }> = [];
  for (const [i, entry] of entries.entries()) {
    const mdPath = path.join('data/reviews', contestId, `${entry.slug}.md`);
    const { content } = parseMarkdown(fs.readFileSync(mdPath, 'utf8'));
    const { html, footnotes } = await markdownToHtml(content);
    const rawBody = buildChapterBody({ title: entry.title, html, footnotes });
    chapters.push({
      slug: entry.slug,
      title: entry.title,
      file: chapterFilename(i, entry.slug),
      html: stripBrokenFragmentLinks(rawBody),
    });
    if ((i + 1) % 25 === 0) console.log(`  …rendered ${i + 1}/${entries.length}`);
  }

  // --- Images ---
  const allUrls = chapters.flatMap((c) => collectImageUrls(c.html));
  const uniqueUrls = [...new Set(allUrls)];
  console.log(`Processing ${uniqueUrls.length} images…`);
  const images = await fetchAndProcessImages(uniqueUrls, '.epub-image-cache');
  // Chapters live in OEBPS/chapters/, images in OEBPS/img/ → "../img/x".
  const urlToLocal = new Map(
    [...images.entries()].map(([url, img]) => [url, `../${img.filename}`])
  );

  // --- Book metadata ---
  const title = `Astral Codex Ten: ${contest.name.replace(/Reviews$/, 'Review')} Contest Entries`;
  const author = 'Astral Codex Ten Readers';
  const uuid = crypto.createHash('sha256').update(`acx-epub:${contestId}`).digest('hex');
  const uuidFormatted = [
    uuid.slice(0, 8), uuid.slice(8, 12), uuid.slice(12, 16), uuid.slice(16, 20), uuid.slice(20, 32),
  ].join('-');
  const now = new Date();
  const modified = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  // --- Front matter ---
  const coverPng = await generateCover({
    topLine: 'Astral Codex Ten',
    year: String(contest.year),
    // "2026 Book Reviews" → ["Book Review", "Contest Entries"]
    bottomLines: [contest.name.replace(/^\d+\s*/, '').replace(/Reviews$/, 'Review'), 'Contest Entries'],
  });
  const coverXhtml = wrapXhtmlDocument({
    title,
    bodyHtml: '<p style="text-align:center;margin:0;"><img src="img/cover.png" alt="Cover" style="max-height:100%;"/></p>',
    cssHref: 'css/style.css',
  });
  // e.g. "2026 Book Reviews" → "Book Review"
  const contestLabel = contest.name.replace(/^\d+\s*/, '').replace(/Reviews$/, 'Review');

  // Read voting-config.json to decide whether this is the active contest.
  let activeVotingYear: number | null = null;
  try {
    const vcRaw = fs.readFileSync(path.join(process.cwd(), 'data/voting-config.json'), 'utf8');
    const vc = JSON.parse(vcRaw);
    if (typeof vc.contestYear === 'number') activeVotingYear = vc.contestYear;
  } catch {
    // Missing or invalid — treat as no active contest.
  }
  const isActiveContest = activeVotingYear === contest.year;

  const introParagraph = isActiveContest
    ? `This book contains all ${entries.length} entries to the Astral Codex Ten ${contest.year} ${contestLabel} Contest, in alphabetical order by title. Entries are anonymous until the contest concludes.`
    : `This book contains all ${entries.length} entries to the Astral Codex Ten ${contest.year} ${contestLabel} Contest, in alphabetical order by title.`;
  const introLink = isActiveContest
    ? `You can read the entries online, and vote for your favorites, at <a href="${SITE_URL}">${SITE_URL.replace('https://', '')}</a>.`
    : `You can read the entries online at <a href="${SITE_URL}">${SITE_URL.replace('https://', '')}</a>.`;

  const introBody = `<section epub:type="frontmatter">
<h1>${escapeXml(title)}</h1>
<p>${introParagraph}</p>
<p>${introLink}</p>
<p>Generated ${now.toISOString().slice(0, 10)}.</p>
</section>`;
  const introXhtml = wrapXhtmlDocument({
    title: 'About this book',
    bodyHtml: htmlFragmentToXhtml(introBody),
    cssHref: 'css/style.css',
  });

  // --- Manifest + spine + TOC ---
  const items: EpubItem[] = [
    { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' },
    { id: 'ncx', href: 'toc.ncx', mediaType: 'application/x-dtbncx+xml' },
    { id: 'css', href: 'css/style.css', mediaType: 'text/css' },
    { id: 'cover-img', href: 'img/cover.png', mediaType: 'image/png', properties: 'cover-image' },
    { id: 'cover', href: 'cover.xhtml', mediaType: 'application/xhtml+xml' },
    { id: 'intro', href: 'intro.xhtml', mediaType: 'application/xhtml+xml' },
  ];
  const spineIds = ['cover', 'intro', 'nav'];
  const toc: TocEntry[] = [{ title: 'About this book', href: 'intro.xhtml' }];
  chapters.forEach((c, i) => {
    const id = `c${String(i + 1).padStart(3, '0')}`;
    // OPF-014: if the chapter contains MathML (from KaTeX), declare it.
    const hasMathML = /<math[\s>]/i.test(c.html);
    items.push({
      id,
      href: c.file,
      mediaType: 'application/xhtml+xml',
      ...(hasMathML ? { properties: 'mathml' } : {}),
    });
    spineIds.push(id);
    toc.push({ title: c.title, href: c.file });
  });
  for (const img of images.values()) {
    items.push({
      id: `i-${path.basename(img.filename).replace(/\..*$/, '')}`,
      href: img.filename,
      mediaType: img.mediaType,
    });
  }

  // --- Assemble zip ---
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', buildContainerXml());
  zip.file('OEBPS/content.opf', buildContentOpf({
    title, author, uuid: uuidFormatted, modified, items, spineIds, coverImageId: 'cover-img',
  }));
  zip.file('OEBPS/nav.xhtml', buildNavXhtml(toc));
  zip.file('OEBPS/toc.ncx', buildTocNcx({ uuid: uuidFormatted, title, toc }));
  zip.file('OEBPS/css/style.css', EPUB_CSS);
  zip.file('OEBPS/cover.xhtml', coverXhtml);
  zip.file('OEBPS/intro.xhtml', introXhtml);
  zip.file('OEBPS/img/cover.png', coverPng);
  for (const c of chapters) {
    const localized = rewriteImageSrcs(c.html, urlToLocal);
    const doc = wrapXhtmlDocument({
      title: c.title,
      bodyHtml: htmlFragmentToXhtml(localized),
      cssHref: '../css/style.css',
    });
    zip.file(`OEBPS/${c.file}`, doc);
  }
  for (const img of images.values()) {
    zip.file(`OEBPS/${img.filename}`, img.data);
  }

  fs.mkdirSync('dist', { recursive: true });
  const outPath = path.join('dist', `acx-${contestId}.epub`);
  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);

  // --- epubcheck (mandatory) ---
  console.log('Running epubcheck…');
  const check = spawnSync('epubcheck', [outPath], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (check.error && (check.error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error('epubcheck not found. Install it with: brew install epubcheck');
    process.exit(1);
  }
  console.log(check.stdout);
  if (check.status !== 0) {
    console.error(check.stderr);
    console.error('epubcheck FAILED — not uploading.');
    process.exit(1);
  }
  console.log('epubcheck passed ✓');

  // --- Upload + manifest ---
  if (upload) {
    const fileHash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    // Content-hashed key: changed content → new key; old object is intentionally orphaned on R2 (immutable URLs stay valid; storage is cheap).
    const key = `epubs/acx-${contestId}-${fileHash}.epub`;
    const { url, uploaded } = await uploadIfMissing(key, buf, 'application/epub+zip');
    console.log(`${uploaded ? 'Uploaded' : 'Already on R2'}: ${url}`);

    const manifestPath = 'data/epubs.json';
    const existing: EpubManifestEntry[] = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : [];
    const merged = mergeManifest(existing, {
      contestId,
      name: contest.name,
      url,
      sizeBytes: buf.length,
      entryCount: entries.length,
      wordCount: entries.reduce((sum, e) => sum + (e.wordCount ?? 0), 0),
      generatedAt: modified,
    });
    fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2) + '\n');
    console.log(`Updated ${manifestPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
