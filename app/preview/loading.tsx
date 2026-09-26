import { Loader2 } from 'lucide-react';

export default function LoadingPreview() {
  return <div role="status" aria-busy="true" className="max-w-3xl mx-auto px-6 sm:px-8 py-16">
    <div className="flex items-center gap-3">
      <Loader2 aria-hidden="true" className="h-6 w-6 shrink-0 animate-spin motion-reduce:animate-none" />
      <h1 className="text-3xl font-serif font-semibold">Generating preview…</h1>
    </div>
    <p className="mt-3 text-muted-foreground">Fetching the Google Doc and checking its formatting.</p>
  </div>;
}
