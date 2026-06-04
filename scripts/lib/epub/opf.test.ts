import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContainerXml,
  buildContentOpf,
  buildNavXhtml,
  buildTocNcx,
  EPUB_CSS,
} from './opf';

const items = [
  { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' },
  { id: 'cover-img', href: 'img/cover.png', mediaType: 'image/png', properties: 'cover-image' },
  { id: 'c001', href: 'chapters/001-a.xhtml', mediaType: 'application/xhtml+xml' },
];

test('container.xml points at the opf', () => {
  const xml = buildContainerXml();
  assert.ok(xml.includes('full-path="OEBPS/content.opf"'));
});

test('content.opf has metadata, manifest, spine, and kindle cover meta', () => {
  const opf = buildContentOpf({
    title: 'T & co',
    author: 'A',
    uuid: 'abc-123',
    modified: '2026-06-03T00:00:00Z',
    items,
    spineIds: ['c001'],
    coverImageId: 'cover-img',
  });
  assert.ok(opf.includes('<dc:title>T &amp; co</dc:title>'));
  assert.ok(opf.includes('urn:uuid:abc-123'));
  assert.ok(opf.includes('<meta property="dcterms:modified">2026-06-03T00:00:00Z</meta>'));
  assert.ok(opf.includes('properties="nav"'));
  assert.ok(opf.includes('properties="cover-image"'));
  assert.ok(opf.includes('<itemref idref="c001"'));
  assert.ok(opf.includes('<meta name="cover" content="cover-img"'));
  assert.ok(opf.includes('toc="ncx"'), 'spine should reference the NCX fallback');
});

test('nav.xhtml lists toc entries in order', () => {
  const nav = buildNavXhtml([
    { title: 'First & Co', href: 'chapters/001-a.xhtml' },
    { title: 'Second', href: 'chapters/002-b.xhtml' },
  ]);
  assert.ok(nav.includes('epub:type="toc"'));
  assert.ok(nav.indexOf('First &amp; Co') < nav.indexOf('Second'));
  assert.ok(nav.includes('href="chapters/001-a.xhtml"'));
});

test('toc.ncx has navpoints with playOrder', () => {
  const ncx = buildTocNcx({
    uuid: 'abc-123',
    title: 'T',
    toc: [
      { title: 'One', href: 'chapters/001-a.xhtml' },
      { title: 'Two', href: 'chapters/002-b.xhtml' },
    ],
  });
  assert.ok(ncx.includes('urn:uuid:abc-123'));
  assert.ok(ncx.includes('playOrder="1"'));
  assert.ok(ncx.includes('playOrder="2"'));
  assert.ok(ncx.includes('src="chapters/002-b.xhtml"'));
});

test('stylesheet constrains images', () => {
  assert.ok(EPUB_CSS.includes('max-width: 100%'));
});
