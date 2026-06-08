'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { FEEDBACK_CONTEST_YEAR, FEEDBACK_MESSAGE_MAX } from '@/lib/constants';

interface Props {
  reviewSlug: string;
  reviewYear: number;
}

interface Stored {
  senderName: string;
  message: string;
  sent: boolean;
}

export function FeedbackCard({ reviewSlug, reviewYear }: Props) {
  const { data: session, status } = useSession();
  const { openSignIn } = useSignInPrompt();

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [stored, setStored] = useState<Stored | null>(null);
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthed = status === 'authenticated';
  const email = session?.user?.email ?? '';

  // Load any existing feedback once signed in; prefill the name field.
  useEffect(() => {
    if (!isAuthed) return;
    setName((n) => n || session?.user?.name || '');
    let cancelled = false;
    fetch(`/api/feedback?reviewSlug=${encodeURIComponent(reviewSlug)}`)
      .then((r) => (r.ok ? r.json() : { feedback: null }))
      .then((d: { feedback: Stored | null }) => {
        if (cancelled || !d.feedback) return;
        setStored(d.feedback);
        setName(d.feedback.senderName);
        setMessage(d.feedback.message);
        setEditing(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthed, reviewSlug, session?.user?.name]);

  if (reviewYear !== FEEDBACK_CONTEST_YEAR) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewSlug, name, message }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError((body.error ?? `error_${res.status}`).replace(/_/g, ' '));
        return;
      }
      const d = (await res.json()) as { feedback: Stored };
      setStored(d.feedback);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback?reviewSlug=${encodeURIComponent(reviewSlug)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStored(null);
        setMessage('');
        setEditing(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border rounded-xl bg-card px-4 py-5 sm:px-5 my-4 shadow-sm">
      <div className="text-sm font-semibold text-foreground mb-1">Send feedback to the author</div>
      <p className="text-xs text-muted-foreground mb-3">
        Your message is stored now and emailed to the author after the contest ends. The author can
        reply to you, but their identity stays hidden unless they choose to respond.
      </p>

      {!isAuthed ? (
        <button type="button" onClick={openSignIn} className="text-link underline text-sm">
          Sign in to send feedback
        </button>
      ) : stored && !editing ? (
        <div className="text-sm">
          <div className="text-muted-foreground mb-2">
            {stored.sent
              ? 'Your feedback has been sent to the author.'
              : 'You sent this feedback — the author will receive it after the contest ends.'}
          </div>
          <blockquote className="border-l-2 border-border pl-3 whitespace-pre-wrap text-foreground">
            {stored.message}
          </blockquote>
          {!stored.sent && (
            <div className="mt-3 flex gap-4">
              <button type="button" onClick={() => setEditing(true)} className="text-link underline text-xs">
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-xs text-muted-foreground hover:text-red-600 underline"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Your name (shown to the author)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Your email (shown to the author so they can reply)
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={FEEDBACK_MESSAGE_MAX}
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <div className="text-xs text-red-600">Couldn&apos;t save: {error}</div>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={busy || !name.trim() || !message.trim()}
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {stored ? 'Update feedback' : 'Save feedback'}
            </button>
            {stored && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-muted-foreground underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
