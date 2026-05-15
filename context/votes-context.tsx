'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useSession, signOut } from 'next-auth/react';
import type { InitialVotesState } from '@/lib/server/initial-votes';
import { useToast } from '@/context/toast-context';

type RatingEntry = { rating: number; updatedAt: number };

interface VotesState {
  ratings: Record<string, RatingEntry>;
  contestYear: number | null;
  contestTitle: string | null;
  contestId: string | null;
  votingStart: Date | null;
  votingEnd: Date | null;
}

interface VotesContextValue extends VotesState {
  ratingOf: (reviewId: string) => number | null;
  ratedAtOf: (reviewId: string) => number | null;
  setRating: (reviewId: string, rating: number) => Promise<void>;
  clearRating: (reviewId: string) => Promise<void>;
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
    ratings: initial.ratings,
    contestYear: initial.contestYear,
    contestTitle: initial.contestTitle,
    contestId: initial.contestId,
    votingStart: initial.votingStart ? new Date(initial.votingStart) : null,
    votingEnd: initial.votingEnd ? new Date(initial.votingEnd) : null,
  }));

  // Per-review single-flight: queue writes for the same reviewId so two
  // rapid clicks don't race. Different reviews are independent.
  const queues = useRef(new Map<string, Promise<void>>());

  const enqueue = useCallback(
    (reviewId: string, fn: () => Promise<void>): Promise<void> => {
      const prev = queues.current.get(reviewId) ?? Promise.resolve();
      const next = prev.catch(() => undefined).then(fn);
      queues.current.set(reviewId, next);
      next.finally(() => {
        if (queues.current.get(reviewId) === next) {
          queues.current.delete(reviewId);
        }
      });
      return next;
    },
    []
  );

  // Snapshot the previous rating so we can roll back on auth-expired (401).
  // Other error codes (403 voting closed, 400 invalid) keep the optimistic
  // value and surface a toast — matches existing policy.
  const setRating = useCallback(
    async (reviewId: string, rating: number) => {
      if (status !== 'authenticated' || !state.contestId) return;
      const optimisticAt = Date.now();
      let prev: RatingEntry | undefined;
      setState((s) => {
        prev = s.ratings[reviewId];
        return {
          ...s,
          ratings: { ...s.ratings, [reviewId]: { rating, updatedAt: optimisticAt } },
        };
      });

      await enqueue(reviewId, async () => {
        try {
          const res = await fetch('/api/votes/rating', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ contestId: state.contestId, reviewId, rating }),
          });
          if (res.status === 401) {
            // Session expired (JWT past maxAge / cookie cleared). Roll back
            // the optimistic update and flip the local session to signed-out
            // so the UI shows the "Sign in to rate" affordance instead of
            // silently swallowing future clicks.
            setState((s) => {
              const next = { ...s.ratings };
              if (prev) next[reviewId] = prev;
              else delete next[reviewId];
              return { ...s, ratings: next };
            });
            toast('Your session expired — please sign in again.', 'error');
            void signOut({ redirect: false });
            return;
          }
          if (!res.ok) {
            let reason = `error ${res.status}`;
            try {
              const body = (await res.json()) as { error?: string };
              if (body?.error) reason = body.error.replace(/_/g, ' ');
            } catch {
              /* no JSON body */
            }
            toast(`Couldn't save your rating: ${reason}`, 'error');
            return;
          }
          const data = (await res.json()) as {
            rating: { reviewId: string; rating: number; updatedAt: number };
          };
          // Mirror the server's authoritative updatedAt — but only if the
          // client's current rating still matches what we just sent. If a
          // later clearRating or setRating mutated the entry in between, the
          // response is stale and writing it back would resurrect a deleted
          // row or overwrite a newer value.
          setState((s) => {
            const cur = s.ratings[reviewId];
            if (!cur || cur.rating !== data.rating.rating) return s;
            return {
              ...s,
              ratings: {
                ...s.ratings,
                [reviewId]: {
                  rating: data.rating.rating,
                  updatedAt: data.rating.updatedAt,
                },
              },
            };
          });
        } catch {
          toast("Couldn't save your rating — network error.", 'error');
        }
      });
    },
    [state.contestId, status, toast, enqueue]
  );

  const clearRating = useCallback(
    async (reviewId: string) => {
      if (status !== 'authenticated' || !state.contestId) return;
      let prev: RatingEntry | undefined;
      setState((s) => {
        prev = s.ratings[reviewId];
        const next = { ...s.ratings };
        delete next[reviewId];
        return { ...s, ratings: next };
      });

      await enqueue(reviewId, async () => {
        try {
          const url = `/api/votes/rating?contestId=${encodeURIComponent(state.contestId!)}&reviewId=${encodeURIComponent(reviewId)}`;
          const res = await fetch(url, { method: 'DELETE' });
          if (res.status === 401) {
            // Session expired — restore the prior rating so we don't show
            // the user as having un-rated when the server didn't see it.
            setState((s) => ({
              ...s,
              ratings: prev ? { ...s.ratings, [reviewId]: prev } : s.ratings,
            }));
            toast('Your session expired — please sign in again.', 'error');
            void signOut({ redirect: false });
            return;
          }
          if (!res.ok) {
            let reason = `error ${res.status}`;
            try {
              const body = (await res.json()) as { error?: string };
              if (body?.error) reason = body.error.replace(/_/g, ' ');
            } catch {
              /* no JSON body */
            }
            toast(`Couldn't remove your rating: ${reason}`, 'error');
          }
        } catch {
          toast("Couldn't remove your rating — network error.", 'error');
        }
      });
    },
    [state.contestId, status, toast, enqueue]
  );

  const ratingOf = useCallback(
    (reviewId: string) => state.ratings[reviewId]?.rating ?? null,
    [state.ratings]
  );
  const ratedAtOf = useCallback(
    (reviewId: string) => state.ratings[reviewId]?.updatedAt ?? null,
    [state.ratings]
  );

  return (
    <VotesContext.Provider
      value={{ ...state, ratingOf, ratedAtOf, setRating, clearRating }}
    >
      {children}
    </VotesContext.Provider>
  );
}

export function useVotesContext() {
  const ctx = useContext(VotesContext);
  if (!ctx) throw new Error('useVotesContext must be used within VotesProvider');
  return ctx;
}
