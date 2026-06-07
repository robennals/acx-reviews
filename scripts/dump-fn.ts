/** Dump what extractFootnotes pulls from a review file. Usage: pnpm exec tsx scripts/dump-fn.ts <path-or-slug> */
import fs from 'node:fs'; import path from 'node:path'; import matter from 'gray-matter';
import { extractFootnotes } from '../lib/footnotes';
function resolve(arg: string): string {
  if (fs.existsSync(arg)) return arg;
  const ROOT = path.join(__dirname, '..', 'data', 'reviews');
  for (const c of fs.readdirSync(ROOT)) { const p = path.join(ROOT, c, `${arg}.md`); if (fs.existsSync(p)) return p; }
  throw new Error('not found: ' + arg);
}
for (const a of process.argv.slice(2)) {
  const file = resolve(a);
  const { content, data } = matter(fs.readFileSync(file, 'utf8'));
  const { body, footnotes } = data.disableFootnotes === true ? { body: content, footnotes: [] as any[] }
    : extractFootnotes(content, data.superscriptFootnotes === true ? { forceFormat: 'superscript' } : {});
  const refd = new Set<string>(); for (const m of body.matchAll(/data-fn-id="([^"]+)"/g)) refd.add(m[1]);
  for (const f of footnotes) for (const m of f.raw.matchAll(/data-fn-id="([^"]+)"/g)) refd.add(m[1]);
  console.log(`\n===== ${file} =====`);
  console.log(`disableFootnotes=${data.disableFootnotes===true} fns=${footnotes.length} referenced=${[...refd].length} bodyLen=${body.length}`);
  console.log(`bodyTail: ...${body.replace(/\s+$/,'').slice(-160).replace(/\n/g,'\\n')}`);
  for (const f of footnotes) {
    const orphan = refd.has(f.id) ? '' : ' [ORPHAN]';
    console.log(`  [${f.id}]${orphan} (${f.raw.length}c): ${f.raw.slice(0,80).replace(/\n/g,' ')}`);
  }
}
