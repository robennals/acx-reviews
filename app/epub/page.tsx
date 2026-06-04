// app/epub/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getEpubs } from '@/lib/epubs';

export const metadata: Metadata = {
  title: 'Download as ePub — ACX Review Archive',
  description:
    'Download all entries to the Astral Codex Ten book review contest as an ePub for Kindle, phone, tablet, or e-reader.',
};

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function formatWords(words: number): string {
  return `${(words / 1_000_000).toFixed(1)}M words`;
}

export default async function EpubPage() {
  const epubs = await getEpubs();

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
      <header className="mb-10 pb-8 border-b border-border">
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight mb-4 text-balance">
          Download as ePub
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Read the contest entries on your Kindle, phone, tablet, or e-reader —
          offline, in one book.
        </p>
      </header>

      {epubs.length === 0 ? (
        <p className="text-muted-foreground mb-12">No ePubs are available yet. Check back soon.</p>
      ) : (
        <div className="space-y-6 mb-12">
          {epubs.map((epub) => (
            <div key={epub.contestId} className="bg-muted/50 rounded-lg p-6 sm:p-8">
              <h2 className="font-serif text-2xl font-semibold mb-2">{epub.name}</h2>
              <p className="text-muted-foreground mb-5">
                {epub.entryCount} entries · {formatWords(epub.wordCount)} ·{' '}
                {formatSize(epub.sizeBytes)}
              </p>
              <a
                href={epub.url}
                className="inline-block px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
                download={`acx-${epub.contestId}.epub`}
              >
                Download ePub
              </a>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-8">
        <h2 className="font-serif text-2xl font-semibold border-b border-border pb-3">
          How to read it
        </h2>

        <div>
          <h3 className="font-serif text-xl font-semibold mb-2">Kindle</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground leading-relaxed">
            <li>
              Easiest: go to{' '}
              <a href="https://www.amazon.com/sendtokindle" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                Send to Kindle
              </a>{' '}
              in your browser, sign in, and drop the downloaded file in. It appears in
              your library on every Kindle device and app, with your reading position synced.
            </li>
            <li>
              On your phone: download the file, share it, and pick the <strong>Kindle</strong> app
              from the share sheet.
            </li>
            <li>
              Or email the file to your Kindle address (find it under Settings → Your Account
              on your Kindle, or at Amazon&apos;s &ldquo;Manage Your Content and Devices&rdquo;).
            </li>
            <li>Or copy it over USB into the Kindle&apos;s <code>documents</code> folder.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-xl font-semibold mb-2">iPhone / iPad</h3>
          <p className="text-muted-foreground leading-relaxed">
            Tap the downloaded file and it opens in <strong>Apple Books</strong>. (If you
            prefer the Kindle app, use the share sheet → Kindle instead.)
          </p>
        </div>

        <div>
          <h3 className="font-serif text-xl font-semibold mb-2">Android</h3>
          <p className="text-muted-foreground leading-relaxed">
            Open the downloaded file with <strong>Google Play Books</strong> (or share it into
            the Kindle app). In Play Books you may need to enable &ldquo;Upload files&rdquo; once.
          </p>
        </div>

        <div>
          <h3 className="font-serif text-xl font-semibold mb-2">Kobo &amp; other e-readers</h3>
          <p className="text-muted-foreground leading-relaxed">
            Copy the file over USB, or download it directly using the device&apos;s built-in
            browser. ePub is the native format — no conversion needed.
          </p>
        </div>

        <div>
          <h3 className="font-serif text-xl font-semibold mb-2">Computer</h3>
          <p className="text-muted-foreground leading-relaxed">
            Open it with Apple Books (Mac),{' '}
            <a href="https://calibre-ebook.com" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">Calibre</a>{' '}
            or{' '}
            <a href="https://thorium.edrlab.org" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">Thorium Reader</a>{' '}
            (Mac/Windows/Linux).
          </p>
        </div>
      </section>

      <p className="mt-12 pt-6 border-t border-border">
        <Link href="/" className="text-link hover:underline">
          ← Back to the archive
        </Link>
      </p>
    </div>
  );
}
