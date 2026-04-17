import fs from 'fs';
import path from 'path';
import { markdownToHtml, parseMarkdown } from '../lib/markdown';

const REVIEWS_DIR = path.join(process.cwd(), 'data', 'reviews');
const OUT_DIR = process.argv[2];

if (!OUT_DIR) {
  console.error('Usage: tsx scripts/diff-rendered-html.ts <output-dir>');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

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
      const { content } = parseMarkdown(full);
      const result = await markdownToHtml(content);
      const payload =
        typeof result === 'string'
          ? result
          : `<!-- BODY -->\n${result.html}\n<!-- FOOTNOTES -->\n${JSON.stringify(
              result.footnotes,
              null,
              2
            )}\n`;
      fs.writeFileSync(path.join(OUT_DIR, `${contestDir}__${slug}.html`), payload);
      count++;
    }
  }
  console.log(`Wrote ${count} files to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
