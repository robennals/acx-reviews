'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, MousePointerClick, Pause, Play, X } from 'lucide-react';
import { matchParagraphsToBlocks, wordIndexAtTime } from '@/lib/audio-sync';

export interface ReviewAudio {
  audioUrl: string;
  wordsUrl: string;
  durationSeconds: number;
}

interface Word {
  w: string;
  s: number;
  e: number;
  p: number;
}

interface AudioPlayerProps {
  slug: string;
  audio: ReviewAudio;
}

const RATES = [1, 1.25, 1.5, 2];
const PARA_CLASS = 'audio-current-para';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function positionKey(slug: string): string {
  return `acx-audio-pos:${slug}`;
}

const highlightsSupported = () =>
  typeof CSS !== 'undefined' && 'highlights' in CSS;

/**
 * Narration player: a "Listen" button that expands into a fixed bottom bar.
 * While playing, the current word is highlighted via the CSS Custom
 * Highlight API (no DOM mutation) and the current paragraph gets a class +
 * auto-scroll. Falls back to paragraph-only highlighting where the
 * Highlight API is unavailable.
 */
export function AudioPlayer({ slug, audio }: AudioPlayerProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'active'>('idle');
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [picking, setPicking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordsRef = useRef<Word[]>([]);
  // paragraph index -> matched DOM block (null = no match, skip highlight)
  const paraElementsRef = useRef<Map<number, HTMLElement | null>>(new Map());
  // paragraph index -> per-word Ranges, built lazily on first visit
  const paraRangesRef = useRef<Map<number, (Range | null)[]>>(new Map());
  // word array index of each paragraph's first word, for range lookup
  const paraFirstWordRef = useRef<Map<number, number>>(new Map());
  const curWordRef = useRef(-1);
  const curParaRef = useRef(-1);
  const rafRef = useRef(0);
  // Mirrored into a ref so the stable setParagraph callback sees it.
  const pickingRef = useRef(false);
  pickingRef.current = picking;

  /** Map speech paragraphs to rendered DOM blocks (once per activation). */
  const buildParagraphMap = useCallback((words: Word[]) => {
    const container = document.querySelector('[data-review-body]');
    if (!container) return;

    const paraIndices: number[] = [];
    const paraTexts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const p = words[i].p;
      if (paraIndices.length === 0 || paraIndices[paraIndices.length - 1] !== p) {
        paraIndices.push(p);
        paraTexts.push(words[i].w);
        paraFirstWordRef.current.set(p, i);
      } else {
        paraTexts[paraTexts.length - 1] += ' ' + words[i].w;
      }
    }

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p')
    );
    const matches = matchParagraphsToBlocks(
      paraTexts,
      blocks.map((b) => b.textContent ?? '')
    );
    matches.forEach((blockIdx, i) => {
      paraElementsRef.current.set(
        paraIndices[i],
        blockIdx === null ? null : blocks[blockIdx]
      );
    });
  }, []);

  /** Build word Ranges for one paragraph by walking its text nodes. */
  const rangesForParagraph = useCallback((paraIndex: number): (Range | null)[] => {
    const cached = paraRangesRef.current.get(paraIndex);
    if (cached) return cached;

    const element = paraElementsRef.current.get(paraIndex);
    const paraWords = wordsRef.current.filter((w) => w.p === paraIndex);
    if (!element) {
      const empty = paraWords.map(() => null);
      paraRangesRef.current.set(paraIndex, empty);
      return empty;
    }

    // Concatenate the paragraph's text nodes, remembering node boundaries.
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let full = '';
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      nodes.push({ node: n as Text, start: full.length });
      full += n.textContent ?? '';
    }
    const lower = full.toLowerCase();

    const locate = (globalOffset: number): { node: Text; offset: number } => {
      let lo = 0;
      let hi = nodes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (nodes[mid].start <= globalOffset) lo = mid;
        else hi = mid - 1;
      }
      return { node: nodes[lo].node, offset: globalOffset - nodes[lo].start };
    };

    let cursor = 0;
    const ranges = paraWords.map((word) => {
      // Try the verbatim token, then a punctuation-stripped version (the
      // DOM may differ around footnote markers).
      const candidates = [word.w.toLowerCase(), word.w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')];
      for (const token of candidates) {
        if (!token) continue;
        const at = lower.indexOf(token, cursor);
        if (at === -1) continue;
        cursor = at + token.length;
        const range = new Range();
        const start = locate(at);
        const end = locate(at + token.length - 1);
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset + 1);
        return range;
      }
      return null;
    });
    paraRangesRef.current.set(paraIndex, ranges);
    return ranges;
  }, []);

  const setParagraph = useCallback((paraIndex: number) => {
    if (paraIndex === curParaRef.current) return;
    const prev = paraElementsRef.current.get(curParaRef.current);
    prev?.classList.remove(PARA_CLASS);
    curParaRef.current = paraIndex;
    const el = paraElementsRef.current.get(paraIndex);
    if (el) {
      el.classList.add(PARA_CLASS);
      // Keep the playing location in view — except in pick mode, where the
      // reader is deliberately navigating elsewhere to choose a word.
      if (!pickingRef.current) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, []);

  /** Move word + paragraph highlighting to the word spoken at time t. */
  const syncToTime = useCallback((t: number) => {
    const words = wordsRef.current;
    const idx = wordIndexAtTime(words, t);
    if (idx === curWordRef.current) return;
    if (idx < 0) {
      // Before the first word (e.g. scrubbed to 0:00): clear word highlight.
      curWordRef.current = -1;
      if (highlightsSupported()) CSS.highlights.delete('audio-word');
      return;
    }
    curWordRef.current = idx;
    const word = words[idx];
    setParagraph(word.p);
    if (highlightsSupported()) {
      const ranges = rangesForParagraph(word.p);
      const first = paraFirstWordRef.current.get(word.p) ?? 0;
      const range = ranges[idx - first];
      if (range) {
        CSS.highlights.set('audio-word', new Highlight(range));
      } else {
        CSS.highlights.delete('audio-word');
      }
    }
  }, [rangesForParagraph, setParagraph]);

  const tick = useCallback(() => {
    const player = audioRef.current;
    if (!player) return;
    setCurrentTime(player.currentTime);
    syncToTime(player.currentTime);
    if (!player.paused) rafRef.current = requestAnimationFrame(tick);
  }, [syncToTime]);

  const activate = useCallback(async () => {
    setStatus('loading');
    const player = new Audio(audio.audioUrl);
    player.preload = 'auto';
    audioRef.current = player;

    try {
      const res = await fetch(audio.wordsUrl);
      if (res.ok) {
        const data = await res.json();
        wordsRef.current = data.words.filter(
          (w: Word) => typeof w.s === 'number' && typeof w.e === 'number'
        );
        buildParagraphMap(wordsRef.current);
      }
    } catch {
      // Words are an enhancement; audio still plays without highlighting.
      wordsRef.current = [];
    }

    const saved = Number(localStorage.getItem(positionKey(slug)) ?? 0);
    if (saved > 10 && saved < audio.durationSeconds - 15) {
      player.currentTime = saved;
    }

    player.addEventListener('play', () => {
      setPlaying(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    });
    player.addEventListener('pause', () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      localStorage.setItem(positionKey(slug), String(player.currentTime));
    });
    player.addEventListener('ended', () => {
      localStorage.removeItem(positionKey(slug));
    });

    setStatus('active');
    void player.play();
  }, [audio, slug, buildParagraphMap, tick]);

  const close = useCallback(() => {
    const player = audioRef.current;
    if (player) {
      if (!player.ended) {
        localStorage.setItem(positionKey(slug), String(player.currentTime));
      }
      player.pause();
      player.src = '';
    }
    cancelAnimationFrame(rafRef.current);
    if (highlightsSupported()) CSS.highlights.delete('audio-word');
    paraElementsRef.current.get(curParaRef.current)?.classList.remove(PARA_CLASS);
    curWordRef.current = -1;
    curParaRef.current = -1;
    audioRef.current = null;
    setPlaying(false);
    setPicking(false);
    setStatus('idle');
  }, [slug]);

  // Self-heal if the article DOM is ever replaced out from under us (e.g.
  // a re-render that resets dangerouslySetInnerHTML): cached elements and
  // Ranges would silently point at detached nodes. Rebuild and re-sync.
  useEffect(() => {
    if (status !== 'active') return;
    const container = document.querySelector('[data-review-body]');
    if (!container) return;
    const observer = new MutationObserver(() => {
      const current = paraElementsRef.current.get(curParaRef.current);
      if (current && current.isConnected) return; // our nodes survived
      paraElementsRef.current = new Map();
      paraRangesRef.current = new Map();
      paraFirstWordRef.current = new Map();
      if (highlightsSupported()) CSS.highlights.delete('audio-word');
      buildParagraphMap(wordsRef.current);
      // Force a full re-sync at the current position.
      curWordRef.current = -1;
      curParaRef.current = -1;
      const t = audioRef.current?.currentTime;
      if (t !== undefined) syncToTime(t);
    });
    observer.observe(container, { childList: true });
    return () => observer.disconnect();
  }, [status, buildParagraphMap, syncToTime]);

  // Persist position periodically while playing.
  useEffect(() => {
    if (status !== 'active') return;
    const id = setInterval(() => {
      const player = audioRef.current;
      if (player && !player.paused) {
        localStorage.setItem(positionKey(slug), String(player.currentTime));
      }
    }, 5000);
    return () => clearInterval(id);
  }, [status, slug]);

  /** Word index at a click point, via the caret-from-point APIs. Falls back
   *  to the paragraph's first word when the APIs or ranges can't place it. */
  const wordIndexAtPoint = useCallback(
    (x: number, y: number, target: HTMLElement): number | null => {
      const block = target.closest<HTMLElement>('h1,h2,h3,h4,h5,h6,p');
      if (!block) return null;
      let paraIndex = -1;
      for (const [pi, el] of paraElementsRef.current) {
        if (el === block) {
          paraIndex = pi;
          break;
        }
      }
      if (paraIndex === -1) return null;

      const firstWord = paraFirstWordRef.current.get(paraIndex) ?? 0;
      const ranges = rangesForParagraph(paraIndex);

      // Standard API first (Firefox), then the WebKit/Blink one.
      type CaretPoint = { node: Node; offset: number };
      const doc = document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      let caret: CaretPoint | null = null;
      if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(x, y);
        if (pos) caret = { node: pos.offsetNode, offset: pos.offset };
      } else if (doc.caretRangeFromPoint) {
        const r = doc.caretRangeFromPoint(x, y);
        if (r) caret = { node: r.startContainer, offset: r.startOffset };
      }
      if (caret) {
        try {
          for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            if (!range) continue;
            const cmp = range.comparePoint(caret.node, caret.offset);
            // Inside this word, or in the whitespace before it: take it.
            if (cmp <= 0) return firstWord + i;
          }
        } catch {
          // comparePoint throws for nodes outside the range tree; fall through.
        }
      }
      return firstWord;
    },
    [rangesForParagraph]
  );

  // Pick mode: one click anywhere in the article starts reading there.
  useEffect(() => {
    if (!picking || status !== 'active') return;
    const container = document.querySelector<HTMLElement>('[data-review-body]');
    if (!container) return;
    container.style.cursor = 'pointer';

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (target.closest('[data-fn-id]')) return; // let footnote popovers behave
      const idx = wordIndexAtPoint(ev.clientX, ev.clientY, target);
      if (idx === null) return; // click wasn't on readable text; stay in pick mode
      ev.preventDefault();
      const player = audioRef.current;
      const word = wordsRef.current[idx];
      if (player && word) {
        player.currentTime = word.s;
        setCurrentTime(word.s);
        syncToTime(word.s);
        localStorage.setItem(positionKey(slug), String(word.s));
        if (player.paused) void player.play();
      }
      setPicking(false);
    };
    container.addEventListener('click', onClick);
    return () => {
      container.style.cursor = '';
      container.removeEventListener('click', onClick);
    };
  }, [picking, status, slug, syncToTime, wordIndexAtPoint]);

  // Cleanup on unmount.
  useEffect(() => () => {
    audioRef.current?.pause();
    cancelAnimationFrame(rafRef.current);
    if (highlightsSupported()) CSS.highlights.delete('audio-word');
  }, []);

  const togglePlay = () => {
    const player = audioRef.current;
    if (!player) return;
    if (player.paused) void player.play();
    else player.pause();
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  if (status === 'idle') {
    return (
      <button
        onClick={activate}
        className="inline-flex items-center gap-2 text-sm text-link hover:underline"
      >
        <Headphones className="w-4 h-4" />
        Listen ({Math.round(audio.durationSeconds / 60)} min)
      </button>
    );
  }

  return (
    <>
      {/* Lightning CSS (Turbopack) rejects ::highlight as unknown, so this
          rule can't live in globals.css — inject it untouched instead. */}
      <style
        dangerouslySetInnerHTML={{
          __html: '::highlight(audio-word){background-color:hsl(45 90% 60% / 0.45);color:inherit;}',
        }}
      />
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Headphones className="w-4 h-4" />
        {status === 'loading' ? 'Loading audio…' : 'Playing'}
      </span>
      {status === 'active' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-background/95 backdrop-blur px-4 py-2 shadow-lg">
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {picking
              ? 'Click a word to play from there…'
              : `${formatTime(currentTime)} / ${formatTime(audio.durationSeconds)}`}
          </span>
          <button
            onClick={cycleRate}
            aria-label="Playback speed"
            className="text-sm font-medium text-muted-foreground hover:text-foreground tabular-nums"
          >
            {rate}×
          </button>
          <button
            onClick={() => setPicking((p) => !p)}
            aria-label="Play from a word you click"
            title="Play from a word you click"
            aria-pressed={picking}
            className={picking ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
          >
            <MousePointerClick className="w-4 h-4" />
          </button>
          <button
            onClick={close}
            aria-label="Close player"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
