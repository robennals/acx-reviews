'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import type { InitialVotesState } from '@/lib/server/initial-votes';

interface VotesState {
  votedReviewIds: Set<string>;
  contestYear: number | null;
  contestTitle: string | null;
  votingStart: Date | null;
  votingEnd: Date | null;
}

interface VotesContextValue extends VotesState {
  /**
   * Toggle a vote optimistically. Caller must ensure user is signed in;
   * if they aren't, the VoteButton opens the sign-in dialog instead of
   * calling this.
   */
  toggleVote: (reviewSlug: string, reviewId: string) => Promise<boolean>;
}

const VotesContext = createContext<VotesContextValue | undefined>(undefined);

export function VotesProvider({
  initial,
  children,
}: {
  initial: InitialVotesState;
  children: ReactNode;
}) {
  const { status } = useSession();
  const [state, setState] = useState<VotesState>(() => ({
    votedReviewIds: new Set(initial.votedReviewIds),
    contestYear: initial.contestYear,
    contestTitle: initial.contestTitle,
    votingStart: initial.votingStart ? new Date(initial.votingStart) : null,
    votingEnd: initial.votingEnd ? new Date(initial.votingEnd) : null,
  }));
  const inflight = useRef<Map<string, Promise<boolean>>>(new Map());

  const toggleVote = useCallback(
    async (reviewSlug: string, reviewId: string) => {
      if (status !== 'authenticated') return false;
      if (inflight.current.has(reviewId)) return inflight.current.get(reviewId)!;
      const wasVoted = state.votedReviewIds.has(reviewId);
      // Optimistic
      setState((s) => {
        const next = new Set(s.votedReviewIds);
        if (wasVoted) next.delete(reviewId);
        else next.add(reviewId);
        return { ...s, votedReviewIds: next };
      });

      const promise = (async () => {
        try {
          const res = await fetch('/api/votes/toggle', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reviewSlug }),
          });
          if (!res.ok) {
            // Roll back
            setState((s) => {
              const next = new Set(s.votedReviewIds);
              if (wasVoted) next.add(reviewId);
              else next.delete(reviewId);
              return { ...s, votedReviewIds: next };
            });
            return wasVoted;
          }
          const data = (await res.json()) as { voted: boolean };
          setState((s) => {
            const next = new Set(s.votedReviewIds);
            if (data.voted) next.add(reviewId);
            else next.delete(reviewId);
            return { ...s, votedReviewIds: next };
          });
          return data.voted;
        } finally {
          inflight.current.delete(reviewId);
        }
      })();

      inflight.current.set(reviewId, promise);
      return promise;
    },
    [state.votedReviewIds, status]
  );

  return (
    <VotesContext.Provider value={{ ...state, toggleVote }}>
      {children}
    </VotesContext.Provider>
  );
}

export function useVotesContext() {
  const ctx = useContext(VotesContext);
  if (!ctx) throw new Error('useVotesContext must be used within VotesProvider');
  return ctx;
}
