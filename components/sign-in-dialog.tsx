'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { signIn } from 'next-auth/react';

type Step = 'choose' | 'email' | 'pin' | 'done';

export function SignInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep('choose');
    setEmail('');
    setPin('');
    setError(null);
    setBusy(false);
  }

  async function requestPin() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/pin/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; retryAfterMs?: number };
      if (!res.ok) {
        if (data.error === 'cooldown' && data.retryAfterMs) {
          setError(`Please wait ${Math.ceil(data.retryAfterMs / 1000)}s before requesting another code.`);
        } else if (data.error === 'invalid_email') {
          setError('Please enter a valid email address.');
        } else {
          setError('Could not send code. Please try again.');
        }
        return;
      }
      setStep('pin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyPin() {
    setError(null);
    setBusy(true);
    try {
      const result = await signIn('pin', { email, pin, redirect: false });
      if (result?.error) {
        setError('Incorrect or expired code.');
        return;
      }
      setStep('done');
      onOpenChange(false);
      reset();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-background border border-border rounded-lg p-6 shadow-xl">
          <Dialog.Title className="text-lg font-serif font-semibold mb-1">
            Sign in
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Sign in to vote and sync your reading across devices.
          </Dialog.Description>

          {step === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => signIn('google')}
                className="w-full px-4 py-2.5 rounded-md border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
              >
                Continue with Google
              </button>
              <button
                onClick={() => setStep('email')}
                className="w-full px-4 py-2.5 rounded-md border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
              >
                Sign in with email
              </button>
            </div>
          )}

          {step === 'email' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) requestPin();
              }}
              className="space-y-3"
            >
              <label className="block text-sm font-medium">
                Email address
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--link))]/20"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || !email}
                className="w-full px-4 py-2.5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Send code'}
              </button>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </form>
          )}

          {step === 'pin' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) verifyPin();
              }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent to <strong>{email}</strong>.
              </p>
              <label className="block text-sm font-medium">
                Code
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground text-center tracking-[0.5em] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--link))]/20"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || pin.length !== 6}
                className="w-full px-4 py-2.5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setPin('');
                  setError(null);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Use a different email
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
