'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { SignInDialog } from './sign-in-dialog';

interface SignInPromptValue {
  openSignIn: () => void;
}

const SignInPromptContext = createContext<SignInPromptValue | undefined>(undefined);

export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSignIn = useCallback(() => setOpen(true), []);

  return (
    <SignInPromptContext.Provider value={{ openSignIn }}>
      {children}
      <SignInDialog open={open} onOpenChange={setOpen} />
    </SignInPromptContext.Provider>
  );
}

export function useSignInPrompt(): SignInPromptValue {
  const ctx = useContext(SignInPromptContext);
  if (!ctx) throw new Error('useSignInPrompt must be used within SignInPromptProvider');
  return ctx;
}
