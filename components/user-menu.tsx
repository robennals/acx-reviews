'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useSignInPrompt } from './sign-in-prompt-provider';

export function UserMenu({
  isAdmin = false,
  authAvailable = true,
}: {
  isAdmin?: boolean;
  authAvailable?: boolean;
}) {
  const { data: session, status } = useSession();
  const { openSignIn } = useSignInPrompt();
  // If auth isn't wired on this deployment, render nothing — the article
  // experience continues to work without a sign-in affordance.
  if (!authAvailable) return null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (status === 'loading') {
    return <div className="h-8 w-16" aria-hidden />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => openSignIn()}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign in
      </button>
    );
  }

  const initials =
    (session.user.name || session.user.email || '?')
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
        aria-label="Account menu"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        ) : (
          initials
        )}
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px]">
          <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground truncate">
            {session.user.email}
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="block px-3 py-2 text-sm hover:bg-muted no-underline"
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut({ redirect: false }).then(() => window.location.reload());
            }}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
