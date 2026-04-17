/**
 * Generates the pre-footnotes baseline HTML snapshot using the exact behavior
 * of `markdownToHtml` on main (no footnote extraction). Used once to capture
 * /tmp/html-before, then compared against the feature-branch output later.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';

const REVIEWS_DIR = path.join(process.cwd(), 'data', 'reviews');
const OUT_DIR = process.argv[2];

if (!OUT_DIR) {
  console.error('Usage: tsx scripts/baseline-rendered-html.ts <output-dir>');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

async function mainMarkdownToHtml(md: string): Promise<string> {
  const result = await remark().use(gfm).use(html, { sanitize: false }).process(md);
  return result.toString();
}

async function main() {
  const contestDirs = fs.readdirSync(REVIEWS_DIR).filter((d) =>
    fs.statSync(path.join(REVIEWS_DIR, d)).isDirectory()
  );

  let count = 0;
  for (const contestDir of contestDirs) {
    const files = fs
      .readdirSync(path.join(REVIEWS_DIR, contestDir))
      .filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      const full = fs.readFileSync(path.join(REVIEWS_DIR, contestDir, file), 'utf8');
      const { content } = matter(full);
      const htmlStr = await mainMarkdownToHtml(content);
      fs.writeFileSync(path.join(OUT_DIR, `${contestDir}__${slug}.html`), htmlStr);
      count++;
    }
  }
  console.log(`Wrote ${count} files to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
