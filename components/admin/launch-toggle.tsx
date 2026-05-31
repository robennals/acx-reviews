'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LaunchToggle({
  initialLive,
  contestTitle,
}: {
  initialLive: boolean;
  contestTitle: string | null;
}) {
  const [live, setLive] = useState(initialLive);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    const next = !live;
    setBusy(true);
    try {
      const res = await fetch('/admin/api/flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contestLive: next }),
      });
      if (!res.ok) {
        alert(`Failed to update flag: ${res.status}`);
        return;
      }
      setLive(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
      <div className="flex-1">
        <div className="text-sm font-semibold">
          {contestTitle ?? 'Contest'} — {live ? 'LIVE' : 'hidden'}
        </div>
        <div className="text-xs text-muted-foreground">
          {live
            ? 'Reviews are public and the voting banner is on.'
            : 'Reviews are hidden from listings and the banner is off.'}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
          live
            ? 'bg-muted text-foreground hover:bg-muted/80'
            : 'bg-amber-500 text-black hover:bg-amber-600'
        }`}
      >
        {busy ? 'Saving…' : live ? 'Turn OFF' : 'Launch contest'}
      </button>
    </div>
  );
}
