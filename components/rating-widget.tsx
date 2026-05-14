'use client';

import { useState, useEffect } from 'react';
import { LIKERT_LABELS, LIKERT_MAX, tierOf } from '@/lib/voting/likert';

type Mode = 'preview' | 'live';

interface RatingWidgetProps {
  /** The persisted rating, or null when unrated. */
  current: number | null;
  mode: Mode;
  size?: 'compact' | 'expanded';
  /** Called in 'live' mode whenever the user taps a star. */
  onCommit?: (rating: number) => void;
  /** Called in 'preview' mode whenever the user taps a star (so the parent can show preview UI). */
  onPreview?: (rating: number) => void;
  /** Tap the Remove button. */
  onRemove?: () => void;
  /** Override the previewed rating from the parent (e.g. when resetting). */
  previewOverride?: number | null;
}

export function RatingWidget({
  current,
  mode,
  size = 'compact',
  onCommit,
  onPreview,
  onRemove,
  previewOverride,
}: RatingWidgetProps) {
  // In 'preview' mode the widget tracks its own tentatively-selected value.
  // In 'live' mode the parent owns the value via `current`.
  const [preview, setPreview] = useState<number | null>(current);
  // Transient hover/focus state — takes precedence over `selected` for both
  // star fill and label display so users can read what each rating means
  // before committing.
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (mode === 'preview' && previewOverride !== undefined) {
      setPreview(previewOverride);
      setHover(null);
    }
  }, [previewOverride, mode]);

  // Keep the live-mode internal state in sync with the prop so star fills
  // reflect any optimistic update made by the parent.
  useEffect(() => {
    if (mode === 'live') {
      setPreview(current);
      setHover(null);
    }
  }, [current, mode]);

  const selected = mode === 'live' ? current : preview;
  const displayed = hover ?? selected;
  const labelWord = displayed ? LIKERT_LABELS[displayed] : '';

  function handleClick(n: number) {
    if (mode === 'live') {
      onCommit?.(n);
    } else {
      setPreview(n);
      onPreview?.(n);
    }
  }

  const starSize = size === 'expanded' ? 'w-9 h-9' : 'w-7 h-7';
  const gap = size === 'expanded' ? 'gap-1.5' : 'gap-1';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex ${gap} justify-center py-2`}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: LIKERT_MAX }, (_, i) => {
          const n = i + 1;
          const filled = displayed !== null && n <= displayed;
          return (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} — ${LIKERT_LABELS[n]}`}
              aria-pressed={selected === n}
              onClick={() => handleClick(n)}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              className={`${starSize} inline-flex items-center justify-center transition-transform hover:scale-110`}
            >
              <Star filled={filled} />
            </button>
          );
        })}
      </div>
      {displayed !== null && (
        <div className={`text-center font-bold ${tierClass(displayed)} ${size === 'expanded' ? 'text-base' : 'text-sm'}`}>
          <span className="text-foreground">{displayed}</span>
          <span className="text-muted-foreground mx-1">/ 10 ·</span>
          <span>{labelWord}</span>
        </div>
      )}
      {current !== null && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-3 text-xs text-red-600 hover:text-red-700 underline"
        >
          Remove rating
        </button>
      )}
    </div>
  );
}

function tierClass(n: number): string {
  const t = tierOf(n);
  return t === 'high'
    ? 'text-amber-700'
    : t === 'mid'
    ? 'text-amber-600'
    : 'text-muted-foreground';
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill={filled ? '#f59e0b' : '#f1f1ec'}
        stroke={filled ? '#b45309' : '#c8c5be'}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
