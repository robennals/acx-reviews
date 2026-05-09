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
import { COUNTING_ZONE_SIZE } from '@/lib/voting/ballot';
import { useToast } from '@/context/toast-context';

interface VotesState {
  ballot: string[];
  contestYear: number | null;
  contestTitle: string | null;
  contestId: string | null;
  votingStart: Date | null;
  votingEnd: Date | null;
}

interface VotesContextValue extends VotesState {
  /** Optimistic full-ballot replace; returns server-confirmed ballot. */
  setBallot: (next: string[]) => Promise<string[]>;
  /** 1-based rank, or null if not in ballot. */
  rankOf: (reviewId: string) => number | null;
  /** Count of entries in the counting zone (rank ≤ 10). */
  countingCount: () => number;
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
  const { show: toast } = useToast();
  const [state, setState] = useState<VotesState>(() => ({
    ballot: initial.ballot,
    contestYear: initial.contestYear,
    contestTitle: initial.contestTitle,
    contestId: initial.contestId,
    votingStart: initial.votingStart ? new Date(initial.votingStart) : null,
    votingEnd: initial.votingEnd ? new Date(initial.votingEnd) : null,
  }));
  const inflight = useRef<Promise<string[]> | null>(null);

  const setBallot = useCallback(
    async (next: string[]) => {
      if (status !== 'authenticated' || !state.contestId) return state.ballot;
      // Apply optimistic update immediately so the UI is responsive.
      setState((s) => ({ ...s, ballot: next }));

      // Serialize PUTs so responses can't clobber each other and rollbacks
      // don't revert past a more recent optimistic update.
      const wait = inflight.current ?? Promise.resolve();
      const myTurn: Promise<string[]> = wait
        .catch(() => undefined)
        .then(async () => {
          try {
            const res = await fetch('/api/votes/ballot', {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ contestId: state.contestId, reviewIds: next }),
            });
            if (!res.ok) {
              let reason = `error ${res.status}`;
              try {
                const body = (await res.json()) as { error?: string };
                if (body?.error) reason = body.error.replace(/_/g, ' ');
              } catch {
                /* response had no JSON body */
              }
              toast(`Couldn’t save your vote: ${reason}`, 'error');
              // Don't revert — that would race with any newer optimistic
              // update queued behind us. The toast tells the user.
              return next;
            }
            const data = (await res.json()) as { ballot: string[] };
            // Only mirror the server's response if no newer write is queued.
            if (inflight.current === myTurn) {
              setState((s) => ({ ...s, ballot: data.ballot }));
            }
            return data.ballot;
          } catch {
            toast("Couldn’t save your vote — network error.", 'error');
            return next;
          }
        });

      inflight.current = myTurn;
      return myTurn;
    },
    [state.contestId, status, toast]
  );

  const rankOf = useCallback(
    (reviewId: string) => {
      const idx = state.ballot.indexOf(reviewId);
      return idx === -1 ? null : idx + 1;
    },
    [state.ballot]
  );

  const countingCount = useCallback(
    () => Math.min(state.ballot.length, COUNTING_ZONE_SIZE),
    [state.ballot.length]
  );

  return (
    <VotesContext.Provider value={{ ...state, setBallot, rankOf, countingCount }}>
      {children}
    </VotesContext.Provider>
  );
}

export function useVotesContext() {
  const ctx = useContext(VotesContext);
  if (!ctx) throw new Error('useVotesContext must be used within VotesProvider');
  return ctx;
}
