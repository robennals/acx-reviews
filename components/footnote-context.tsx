'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { ReviewFootnote } from '@/lib/types';

interface FootnoteContextValue {
  footnotes: ReviewFootnote[];
  openId: string | null;
  open: (id: string) => void;
  close: () => void;
}

const FootnoteContext = createContext<FootnoteContextValue | null>(null);

export function FootnoteProvider({
  footnotes,
  children,
}: {
  footnotes: ReviewFootnote[];
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = useCallback((id: string) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);
  const value = useMemo(
    () => ({ footnotes, openId, open, close }),
    [footnotes, openId, open, close]
  );
  return <FootnoteContext.Provider value={value}>{children}</FootnoteContext.Provider>;
}

export function useFootnotes(): FootnoteContextValue {
  const ctx = useContext(FootnoteContext);
  if (!ctx) {
    throw new Error('useFootnotes must be used within a FootnoteProvider');
  }
  return ctx;
}
