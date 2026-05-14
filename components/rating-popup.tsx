'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { RatingCard } from './rating-card';

interface Props {
  open: boolean;
  onClose: () => void;
  reviewId: string;
  reviewYear: number;
  reviewTitle: string;
}

/**
 * Modal wrapper around <RatingCard>. Used by <RatingChip> on home and
 * My Votes rows so the compact chip can summon the full rating UX
 * without disturbing the surrounding layout.
 */
export function RatingPopup({ open, onClose, reviewId, reviewYear, reviewTitle }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/40 z-40"
          onClick={(e) => e.stopPropagation()}
        />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md w-full bg-background border border-border sm:rounded-xl rounded-t-xl shadow-xl z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <Dialog.Title className="flex-1 min-w-0 text-sm">
              <span className="text-muted-foreground">Rating: </span>
              <span
                className="font-semibold truncate inline-block max-w-full align-bottom"
                title={reviewTitle}
              >
                {reviewTitle}
              </span>
            </Dialog.Title>
            <Dialog.Close
              className="text-muted-foreground hover:text-foreground text-xl leading-none shrink-0"
              aria-label="Close"
            >
              ×
            </Dialog.Close>
          </div>
          <div className="px-4 py-2">
            <RatingCard
              reviewId={reviewId}
              reviewYear={reviewYear}
              onCommitClose={onClose}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
