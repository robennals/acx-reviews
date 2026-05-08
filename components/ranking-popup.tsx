'use client';

import { useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useVotesContext } from '@/context/votes-context';
import { insertAt, moveTo, removeFrom, COUNTING_ZONE_SIZE } from '@/lib/voting/ballot';
import type { Review } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The review the user clicked Vote on. */
  review: Pick<Review, 'id' | 'title'>;
  /** Resolver for displaying titles of other ballot entries. */
  reviewLookup: Map<string, string>;
}

export function RankingPopup({ open, onClose, review, reviewLookup }: Props) {
  const { ballot, setBallot, rankOf } = useVotesContext();
  const currentRank = rankOf(review.id);
  const isEditing = currentRank !== null;

  const rows = useMemo(() => {
    return ballot.map((id, i) => ({
      reviewId: id,
      rank: i + 1,
      title: reviewLookup.get(id) ?? id,
      isSelf: id === review.id,
    }));
  }, [ballot, reviewLookup, review.id]);

  const showTrailingSlot =
    !isEditing && ballot.length < COUNTING_ZONE_SIZE;

  const handleSlot = (target: { beforeReviewId: string } | { atEnd: true }) => {
    const next = isEditing
      ? moveTo(ballot, review.id, target)
      : insertAt(ballot, review.id, target);
    setBallot(next);
    onClose();
  };

  const handleRemove = () => {
    setBallot(removeFrom(ballot, review.id));
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm w-full bg-background border border-border sm:rounded-xl rounded-t-xl shadow-xl z-50 overflow-hidden"
          aria-describedby={undefined}
        >
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <Dialog.Title className="flex-1 min-w-0 text-sm">
              <span className="text-muted-foreground">Voting for: </span>
              <span className="font-semibold truncate align-bottom inline-block max-w-full" title={review.title}>
                {review.title}
              </span>
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground text-xl leading-none shrink-0">×</Dialog.Close>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {ballot.length > 0 && (
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Place before
              </div>
            )}

            {rows.map((row) => {
              const isBelowCap = row.rank > COUNTING_ZONE_SIZE;
              const baseClasses =
                'w-full text-left px-4 py-2.5 border-b border-border flex items-center gap-2.5';

              if (row.isSelf) {
                return (
                  <div
                    key={row.reviewId}
                    className={`${baseClasses} bg-amber-100 dark:bg-amber-900/30 border-l-[3px] border-l-amber-500`}
                  >
                    <RankBadge rank={row.rank} variant="self" />
                    <span className="flex-1 text-sm font-bold">{row.title}</span>
                    <span className="text-[10px] uppercase tracking-wide font-bold text-amber-600">
                      This one
                    </span>
                  </div>
                );
              }

              if (isBelowCap) {
                return (
                  <div
                    key={row.reviewId}
                    className={`${baseClasses} opacity-50 cursor-not-allowed`}
                  >
                    <RankBadge rank={row.rank} variant="muted" />
                    <span className="flex-1 text-sm">{row.title}</span>
                  </div>
                );
              }

              return (
                <button
                  key={row.reviewId}
                  type="button"
                  className={`${baseClasses} hover:bg-muted/50`}
                  onClick={() => handleSlot({ beforeReviewId: row.reviewId })}
                >
                  <RankBadge rank={row.rank} />
                  <span className="flex-1 text-sm">{row.title}</span>
                </button>
              );
            })}

            {showTrailingSlot && (
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 bg-amber-50/60 dark:bg-amber-950/10 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                onClick={() => handleSlot({ atEnd: true })}
              >
                <span className="w-6 h-6 rounded-full border border-dashed border-amber-500 inline-flex items-center justify-center text-[11px] font-bold text-amber-600">
                  {ballot.length + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Rank at #{ballot.length + 1}
                </span>
              </button>
            )}

            {!isEditing && ballot.length === 0 && (
              <div className="mx-4 my-3 px-3 py-2 rounded-md border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                This is your first vote. When you vote for multiple reviews,
                you’ll be able to choose the order.
              </div>
            )}
          </div>

          {isEditing && (
            <div className="px-4 py-3 border-t border-border">
              <button
                type="button"
                onClick={handleRemove}
                className="w-full py-2 rounded-lg border border-red-500 text-red-600 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Remove from list
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RankBadge({
  rank,
  variant = 'default',
}: { rank: number; variant?: 'default' | 'self' | 'muted' }) {
  const cls =
    variant === 'self'
      ? 'bg-amber-500 text-black'
      : variant === 'muted'
      ? 'bg-muted text-muted-foreground'
      : rank === 1
      ? 'bg-amber-500 text-black'
      : rank === 2
      ? 'bg-gray-400 text-black'
      : rank === 3
      ? 'bg-amber-700 text-white'
      : 'bg-muted text-foreground';
  return (
    <span
      className={`${cls} rounded-full w-6 h-6 inline-flex items-center justify-center font-bold text-[11px] shrink-0`}
    >
      {rank}
    </span>
  );
}
