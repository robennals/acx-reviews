'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useVotesContext } from '@/context/votes-context';
import { RatingWidget } from './rating-widget';

interface Props {
  open: boolean;
  onClose: () => void;
  reviewId: string;
  reviewTitle: string;
}

export function RatingPopup({ open, onClose, reviewId, reviewTitle }: Props) {
  const { ratingOf, setRating, clearRating } = useVotesContext();
  const current = ratingOf(reviewId);
  const [preview, setPreview] = useState<number | null>(current);

  useEffect(() => {
    if (open) setPreview(current);
  }, [open, current]);

  async function handleSave() {
    if (preview === null) return;
    await setRating(reviewId, preview);
    onClose();
  }

  async function handleRemove() {
    await clearRating(reviewId);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/40 z-40"
          onClick={(e) => e.stopPropagation()}
        />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm w-full bg-background border border-border sm:rounded-xl rounded-t-xl shadow-xl z-50 overflow-hidden"
          aria-describedby={undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <Dialog.Title className="flex-1 min-w-0 text-sm">
              <span className="text-muted-foreground">Rating: </span>
              <span
                className="font-semibold truncate align-bottom inline-block max-w-full"
                title={reviewTitle}
              >
                {reviewTitle}
              </span>
            </Dialog.Title>
            <Dialog.Close
              className="text-muted-foreground text-xl leading-none shrink-0"
              onClick={onClose}
            >
              ×
            </Dialog.Close>
          </div>

          <div className="px-4 py-4">
            <RatingWidget
              current={current}
              previewOverride={preview}
              mode="preview"
              size="expanded"
              onPreview={(n) => setPreview(n)}
            />
          </div>

          <div className="px-4 py-3 border-t border-border flex gap-2">
            {current !== null && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex-1 py-2 rounded-lg border border-red-500 text-red-600 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={preview === null}
              className="flex-1 py-2 rounded-lg bg-amber-500 text-black text-sm font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
