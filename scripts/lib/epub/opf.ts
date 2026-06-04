/**
 * EPUB3 package-document generation: container.xml, content.opf,
 * nav.xhtml (EPUB3 TOC), toc.ncx (EPUB2 fallback for older readers),
 * and the book stylesheet. All pure string builders.
 */

import { escapeXml, wrapXhtmlDocument } from './xhtml';

export interface EpubItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

export interface TocEntry {
  title: string;
  href: string;
}

export function buildContainerXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;
}

export function buildContentOpf(opts: {
  title: string;
  author: string;
  uuid: string;
  modified: string; // CCYY-MM-DDThh:mm:ssZ
  items: EpubItem[];
  spineIds: string[];
  coverImageId: string;
}): string {
  const manifest = opts.items
    .map((i) => {
      const props = i.properties ? ` properties="${i.properties}"` : '';
      return `    <item id="${i.id}" href="${escapeXml(i.href)}" media-type="${i.mediaType}"${props}/>`;
    })
    .join('\n');
  const spine = opts.spineIds
    .map((id) => `    <itemref idref="${id}"/>`)
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${opts.uuid}</dc:identifier>
    <dc:title>${escapeXml(opts.title)}</dc:title>
    <dc:creator>${escapeXml(opts.author)}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${opts.modified}</meta>
    <meta name="cover" content="${opts.coverImageId}"/>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>
`;
}

export function buildNavXhtml(toc: TocEntry[]): string {
  const lis = toc
    .map((t) => `      <li><a href="${escapeXml(t.href)}">${escapeXml(t.title)}</a></li>`)
    .join('\n');
  const body = `<nav epub:type="toc" id="toc">
  <h1>Contents</h1>
  <ol>
${lis}
  </ol>
</nav>`;
  return wrapXhtmlDocument({ title: 'Contents', bodyHtml: body, cssHref: 'css/style.css' });
}

export function buildTocNcx(opts: { uuid: string; title: string; toc: TocEntry[] }): string {
  const navPoints = opts.toc
    .map(
      (t, i) => `    <navPoint id="np-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(t.title)}</text></navLabel>
      <content src="${escapeXml(t.href)}"/>
    </navPoint>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${opts.uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(opts.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>
`;
}

export const EPUB_CSS = `
body { font-family: serif; line-height: 1.5; margin: 0 5%; }
h1.chapter-title { font-size: 1.6em; margin: 1.2em 0 0.8em; }
h1, h2, h3, h4 { line-height: 1.25; }
img { max-width: 100%; height: auto; }
figure { margin: 1em 0; text-align: center; }
figcaption { font-size: 0.85em; color: #555; }
blockquote { margin: 1em 1.5em; font-style: italic; }
blockquote em, blockquote i { font-style: normal; }
table { border-collapse: collapse; font-size: 0.9em; }
td, th { border: 1px solid #999; padding: 0.3em 0.5em; }
code, pre { font-family: monospace; font-size: 0.9em; }
pre { white-space: pre-wrap; }
hr { border: none; border-top: 1px solid #999; margin: 1.5em 20%; }
a.fn-ref { text-decoration: none; }
section.footnotes { margin-top: 2em; border-top: 1px solid #999; font-size: 0.9em; }
aside.footnote { margin: 0.8em 0; }
p.fn-label { font-weight: bold; margin-bottom: 0.2em; }
`;
