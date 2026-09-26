import * as cheerio from 'cheerio';
import katex from 'katex';
import { prepareImage } from './images';
import type { ReviewFootnote } from '../types';

type Node = ReturnType<cheerio.CheerioAPI> extends cheerio.Cheerio<infer T> ? T : never;
export interface PreviewDiagnostic { code: string; severity: 'error' | 'warning'; message: string; excerpt: string; blockId?: string }
export interface PreviewArticle { title: string; html: string; footnotes: ReviewFootnote[]; diagnostics: PreviewDiagnostic[] }
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Submission-v1: construct trusted HTML, never pass source HTML to the browser. */
export async function parsePreview(html: string): Promise<PreviewArticle> {
  if (Buffer.byteLength(html) > 20 * 1024 * 1024) throw new Error('This document is too large to preview.');
  const $ = cheerio.load(html);
  if ($('*').length > 30_000) throw new Error('This document has too many elements to preview.');
  if ($('body').text().length > 500_000) throw new Error('This document contains too much text to preview (500,000 character limit).');
  const diagnostics: PreviewDiagnostic[] = [];
  const ids = new Map<Node, string>();
  let serial = 0;
  const id = (node: Node) => { if (!ids.has(node)) ids.set(node, `preview-block-${++serial}`); return ids.get(node)!; };
  const report = (code: string, message: string, node?: Node, severity: 'error' | 'warning' = 'error') => {
    diagnostics.push({ code, message, severity, excerpt: node ? $(node).text().trim().slice(0, 140) : '', blockId: node ? id(node) : undefined });
  };
  const css = new Map<string, Record<string, string>>();
  const parseCss = (text: string) => Object.fromEntries(text.split(';').map(x => x.split(/:(.*)/s).slice(0, 2).map(v => v.trim())).filter(x => x.length === 2));
  for (const match of $('style').text().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of match[1].split(',')) css.set(selector.trim(), parseCss(match[2]));
  }
  const style = (node: Node): Record<string, string> => {
    if (!('tagName' in node)) return {};
    const result = { ...css.get(node.tagName) };
    for (const name of ($(node).attr('class') || '').split(/\s+/)) Object.assign(result, css.get(`.${name}`));
    return Object.assign(result, parseCss($(node).attr('style') || ''));
  };
  // Source scripts/styles/comments never participate in article content.
  $('script,style,iframe,object,embed').each((_, el) => {
    if (!['script', 'style'].includes(el.tagName)) report('unsupported', 'Embedded content is not supported. Replace it with text, a link, or an image.', el);
    $(el).remove();
  });
  // Google exports nested lists as adjacent list elements with indented li's.
  const sourceBlocks = $('body').children().toArray();
  for (let i = 0; i < sourceBlocks.length; i++) {
    if (!$(sourceBlocks[i]).is('ul,ol')) continue;
    let end = i + 1;
    while (end < sourceBlocks.length && $(sourceBlocks[end]).is('ul,ol')) end++;
    const stack: Array<{ depth: number; list: Node }> = [];
    for (const list of sourceBlocks.slice(i, end)) {
      const firstLi = $(list).children('li')[0];
      const depth = firstLi ? parseFloat(style(firstLi)['margin-left'] || '0') : 0;
      while (stack.length && stack.at(-1)!.depth > depth) stack.pop();
      const parent = stack.at(-1);
      if (parent && parent.depth < depth) {
        $(parent.list).children('li').last().append($(list));
        stack.push({ depth, list });
      } else if (parent && $(parent.list).is(('tagName' in list ? list.tagName : 'ul')) &&
        // An explicit restart is a new list, not another flattened chunk.
        (!$(list).is('ol') || !$(list).attr('start') ||
          Number($(list).attr('start')) === Number($(parent.list).attr('start') || 1) + $(parent.list).children('li').length)) {
        $(parent.list).append($(list).children('li')); $(list).remove();
      } else { stack.push({ depth, list }); }
    }
    i = end - 1;
  }
  const images = new Map<Node, string>();
  let imageBytes = 0;
  for (const [index, node] of $('img').toArray().entries()) {
    try {
      if (index >= 50) throw new Error('This document has too many images (50 maximum).');
      const asset = await prepareImage($(node).attr('src') || '', $(node).attr('style'), $(node).parent().attr('style'));
      imageBytes += asset.src.length;
      if (imageBytes > 28 * 1024 * 1024) throw new Error('The combined images are too large to preview.');
      images.set(node, `<img src="${asset.src}" width="${asset.width}" height="${asset.height}" alt="${escapeHtml($(node).attr('alt') || '')}" loading="lazy">`);
    } catch (error) {
      report('image', error instanceof Error ? error.message : 'Could not process this image.', node);
      images.set(node, '<span class="text-destructive">[Image could not be imported]</span>');
    }
  }
  const mathHtml = new Map<string, string>();
  let formulaCount = 0;
  let formulaBytes = 0;
  // Join formula text across Docs style runs, but retain surrounding inline styles.
  for (const block of $('p,li,td,th,h1,h2,h3,h4,h5,h6').toArray()) {
    if ($(block).find('p,li,td,th').length) continue;
    const texts: Array<{ node: Node & { data: string }; start: number; end: number }> = [];
    let full = '';
    const walk = (node: Node) => {
      if (node.type === 'text') { const start = full.length; full += node.data; texts.push({ node, start, end: full.length }); }
      else if ('children' in node) for (const child of node.children) walk(child);
    };
    walk(block);
    const matches = [...full.matchAll(/\$\$([\s\S]*?)\$\$|\\\(([\s\S]*?)\\\)/g)];
    formulaCount += matches.length;
    if (formulaCount > 200) throw new Error('This document has too many equations to preview (200 maximum).');
    const remainder = full.replace(/\$\$([\s\S]*?)\$\$|\\\(([\s\S]*?)\\\)/g, '');
    if (/^\s*\$\$|\\[()]/.test(remainder)) report('math', 'Math delimiters are unmatched. Use $$…$$ for display math or \\(…\\) for inline math.', block);
    for (const match of matches.reverse()) {
      const display = match[1] !== undefined;
      let rendered: string;
      try {
        if (match[0].length > 10_000) throw new Error('Formula too long');
        if (display && full.trim() !== match[0]) throw new Error('Display math must be in its own paragraph');
        rendered = katex.renderToString(match[1] ?? match[2], { displayMode: display, throwOnError: true, trust: false, strict: 'error', maxExpand: 1000, maxSize: 20 });
      } catch {
        report('math', 'This formula could not be rendered. Check the LaTeX; display math ($$…$$) must occupy its own paragraph.', block);
        rendered = `<code>${escapeHtml(match[0])}</code>`;
      }
      formulaBytes += rendered.length;
      if (formulaBytes > 2 * 1024 * 1024) throw new Error('Rendered equations are too large to preview.');
      const key = String(mathHtml.size); mathHtml.set(key, rendered);
      const start = match.index!, end = start + match[0].length;
      // Re-read text nodes after each replacement. Later formulas may have
      // shared a text node with this one; replacement detaches that node.
      const liveTexts: typeof texts = [];
      let position = 0;
      const collect = (n: Node) => {
        if (n.type === 'text') { const start = position; position += n.data.length; liveTexts.push({ node: n, start, end: position }); }
        else if ('children' in n) for (const child of n.children) collect(child);
      };
      collect(block);
      const affected = liveTexts.filter(t => t.end > start && t.start < end);
      for (const t of affected.slice(1)) t.node.data = t.node.data.slice(Math.max(0, end - t.start));
      const first = affected[0];
      if (first) {
        const before = first.node.data.slice(0, start - first.start);
        const after = first.node.data.slice(Math.max(0, end - first.start));
        $(first.node).replaceWith(`${escapeHtml(before)}<preview-math data-key="${key}"></preview-math>${escapeHtml(after)}`);
      }
    }
  }
  const noteNodes = new Map<string, Node>();
  for (const anchor of $('a[id^="ftnt"]').toArray()) {
    const key = $(anchor).attr('id')!;
    if (!/^ftnt\d+$/.test(key)) continue;
    const parent = $(anchor).closest('div').length ? $(anchor).closest('div') : $(anchor).closest('p');
    if (!parent.length) continue;
    if (parent.prev().is('hr')) parent.prev().remove();
    noteNodes.set(key, parent[0]);
    $(anchor).remove(); parent.remove();
  }
  const noteIds = new Map<string, string>();
  const usedRefs = new Set<string>();
  const safeLink = (href: string) => {
    try {
      let url = new URL(href);
      if (url.hostname === 'www.google.com' || url.hostname === 'google.com') {
        if (url.pathname === '/url') url = new URL(url.searchParams.get('q') || url.searchParams.get('url') || href);
      }
      return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const inline = (node: Node): string => {
    if (node.type === 'text') return escapeHtml(node.data);
    if (!('tagName' in node)) return '';
    const el = $(node), tag = node.tagName;
    if (tag === 'preview-math') return mathHtml.get(el.attr('data-key') || '') || '';
    if (tag === 'img') return `<span id="${id(node)}">${images.get(node) || ''}</span>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = el.attr('href') || '';
      const note = href.match(/^#(ftnt\d+)$/)?.[1];
      if (note) {
        if (!noteIds.has(note)) noteIds.set(note, String(noteIds.size + 1));
        const number = noteIds.get(note)!;
        if (!noteNodes.has(note)) report('footnote', 'This footnote has no matching note text.', node);
        const refId = usedRefs.has(note) ? '' : ` id="fn-ref-${number}"`;
        usedRefs.add(note);
        return `<sup class="fn-ref" data-fn-id="${number}"${refId}>[${number}]</sup>`;
      }
      const hrefSafe = safeLink(href);
      const content = el.contents().toArray().map(inline).join('');
      if (href && !hrefSafe) report('link', 'This link could not be preserved. Use a full http(s) or email link.', node, 'warning');
      return hrefSafe ? `<a href="${escapeHtml(hrefSafe)}" rel="noreferrer">${content}</a>` : content;
    }
    let content = el.contents().toArray().map(inline).join('');
    const st = style(node);
    if (['b', 'strong'].includes(tag) || Number(st['font-weight']) >= 600 || st['font-weight'] === 'bold') content = `<strong>${content}</strong>`;
    if (['i', 'em'].includes(tag) || st['font-style'] === 'italic') content = `<em>${content}</em>`;
    if (['s', 'del', 'strike'].includes(tag) || st['text-decoration']?.includes('line-through')) content = `<del>${content}</del>`;
    if (tag === 'u' || st['text-decoration']?.includes('underline')) content = `<u>${content}</u>`;
    if (tag === 'sup' && !el.find('a[href^="#ftnt"]').length || st['vertical-align'] === 'super') content = `<sup>${content}</sup>`;
    if (tag === 'sub' || st['vertical-align'] === 'sub') content = `<sub>${content}</sub>`;
    return content;
  };
  const empty = (n: Node) => !$(n).text().trim() && !$(n).find('img,preview-math,hr').length && !$(n).is('img,hr');
  const quote = (n: Node) => $(n).is('p') && parseFloat(style(n)['margin-left'] || '0') >= 35 && !$(n).find('img').length;
  const isCaption = (n: Node) => $(n).is('p') && style(n)['text-align'] === 'center' &&
    (style(n)['font-style'] === 'italic' || $(n).find('span').toArray().filter(x => $(x).text().trim()).every(x => style(x)['font-style'] === 'italic') && $(n).find('span').length > 0 || $(n).find('em,i').length > 0);
  const titles = $('body .title').toArray();
  let title = titles.length ? $(titles[0]).text().trim() : 'Untitled review';
  if (titles.length !== 1 || !title) report('title-count', 'Use exactly one nonempty Title paragraph at the beginning of your review.');
  if (!title) title = 'Untitled review';
  const firstBlock = $('body').children().toArray().find(n => !empty(n));
  if (titles[0] && firstBlock !== titles[0]) report('title-position', 'Move the Title paragraph to the beginning of the review.', titles[0]);
  const titleNode = titles[0];
  let hasSection = false;
  const blocks = (nodes: Node[]): string => {
    let output = '';
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node === titleNode || empty(node)) continue;
      const el = $(node), tag = 'tagName' in node ? node.tagName : '';
      const anchor = ` id="${id(node)}"`;
      if (/^h[1-6]$/.test(tag)) {
        const level = Number(tag[1]);
        if (level > 2) report('heading-level', 'Only Heading 1 and Heading 2 are supported.', node);
        if (level === 2 && !hasSection) report('heading-parent', 'Add a Heading 1 section before using Heading 2.', node);
        if (level === 1) hasSection = true;
        const renderedLevel = Math.min(level + 1, 3);
        // Docs exports heading weight on both the heading and its spans.
        // Let the site's heading style own weight; nested strong tags would
        // activate Typography's heavier heading-emphasis rules.
        const headingHtml = inline(node).replace(/<\/?strong>/g, '');
        output += `<h${renderedLevel}${anchor}>${headingHtml}</h${renderedLevel}>`; continue;
      }
      if (tag === 'hr') { output += '<hr>'; continue; }
      if (tag === 'table') {
        if (el.find('table').length || el.find('[colspan],[rowspan]').toArray().some(cell => Number($(cell).attr('colspan') || 1) > 1 || Number($(cell).attr('rowspan') || 1) > 1)) report('table', 'Use a simple table without merged cells or nested tables.', node);
        output += `<div${anchor} class="overflow-x-auto"><table>`;
        el.children('tbody,thead,tfoot').children('tr').add(el.children('tr')).each((rowIndex, row) => {
          output += rowIndex === 0 ? '<thead><tr>' : rowIndex === 1 ? '<tbody><tr>' : '<tr>';
          $(row).children('td,th').each((_, cell) => {
            const t = rowIndex === 0 ? 'th' : 'td';
            const paragraphs = $(cell).children('p');
            const content = paragraphs.length === 1 && $(cell).children().length === 1
              ? inline(paragraphs[0])
              : paragraphs.length ? blocks($(cell).contents().toArray()) : inline(cell);
            output += `<${t}${t === 'th' ? ' scope="col"' : ''}>${content}</${t}>`;
          });
          output += rowIndex === 0 ? '</tr></thead>' : '</tr>';
        });
        if (el.children('tbody,thead,tfoot').children('tr').add(el.children('tr')).length > 1) output += '</tbody>';
        output += '</table></div>'; continue;
      }
      if (tag === 'ul' || tag === 'ol') {
        const start = Number(el.attr('start'));
        output += `<${tag}${anchor}${tag === 'ol' && Number.isSafeInteger(start) && start > 0 ? ` start="${start}"` : ''}>`;
        el.children('li').each((_, li) => { output += `<li>${blocks($(li).contents().toArray())}</li>`; });
        output += `</${tag}>`; continue;
      }
      if (quote(node)) {
        let j = i;
        const stanzas: Node[][] = [[]];
        while (j < nodes.length && (quote(nodes[j]) || empty(nodes[j]))) {
          if (empty(nodes[j])) { if (stanzas.at(-1)!.length) stanzas.push([]); }
          else stanzas.at(-1)!.push(nodes[j]);
          j++;
        }
        output += '<blockquote>';
        for (const stanza of stanzas.filter(x => x.length)) {
          if (stanza.length > 1 && stanza.some(n => [...$(n).text().trim()].length > 60)) report('ambiguous-poetry', 'A line in this group exceeds 60 characters. Use Shift+Enter inside one paragraph to confirm a stanza, or add blank lines between prose paragraphs.', stanza[0]);
          output += `<p id="${id(stanza[0])}">${stanza.map(inline).join('<br>')}</p>`;
        }
        output += '</blockquote>'; i = j - 1; continue;
      }
      if (tag === 'p') {
        const onlyImage = el.find('img').length === 1 && !el.text().trim();
        if (onlyImage) {
          const next = nodes[i + 1];
          const image = el.find('img')[0];
          if (next && !empty(next) && isCaption(next)) {
            const alt = el.find('img').attr('alt');
            if (!alt && images.has(image)) images.set(image, images.get(image)!.replace('alt=""', `alt="${escapeHtml($(next).text().trim())}"`));
            output += `<figure${anchor}><p>${inline(node)}</p><figcaption><p>${inline(next)}</p></figcaption></figure>`; i++; continue;
          }
          if (!el.find('img').attr('alt')) report('image-alt', 'Add a centered italic caption or alt text describing this image.', node, 'warning');
        }
        const previous = nodes[i - 1];
        if (!/^\s*(?:<span[^>]*>\s*)*<br\s*\/?\s*>/.test(el.html() || '') && previous && $(previous).is('p') && previous !== titleNode && !empty(previous) && !quote(previous) && !$(previous).find('img').length && !el.find('img').length) {
          report('paragraph-spacing', 'Leave a blank line between paragraphs, or use Shift+Enter if these lines belong together.', node);
        }
        output += `<p${anchor}>${inline(node)}</p>`; continue;
      }
      if (tag === 'div' || tag === 'section') { output += blocks(el.contents().toArray()); continue; }
      if (['video', 'audio', 'svg', 'canvas'].includes(tag)) { report('unsupported', 'This embedded content cannot be imported.', node); output += `<p${anchor}>[Unsupported content]</p>`; continue; }
      output += inline(node);
    }
    return output;
  };
  const bodyHtml = blocks($('body').contents().toArray());
  const footnotes: ReviewFootnote[] = [];
  for (const [key, note] of noteNodes) {
    if (!noteIds.has(key)) { noteIds.set(key, String(noteIds.size + 1)); report('footnote', 'This footnote has no reference in the review.', note); }
    footnotes.push({ id: noteIds.get(key)!, html: blocks($(note).is('p') ? [note] : $(note).contents().toArray()) });
  }
  for (const [key, number] of noteIds) if (!noteNodes.has(key)) footnotes.push({ id: number, html: '<p>[Footnote text missing]</p>' });
  footnotes.sort((a, b) => Number(a.id) - Number(b.id));
  if (Buffer.byteLength(bodyHtml) + footnotes.reduce((sum, note) => sum + Buffer.byteLength(note.html), 0) > 30 * 1024 * 1024) throw new Error('The rendered document is too large to preview.');
  return { title, html: bodyHtml, footnotes, diagnostics };
}
