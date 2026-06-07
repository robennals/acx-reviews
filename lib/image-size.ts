// lib/image-size.ts

/** Natural pixel dimensions of a stored image, plus an optional display-scale
 *  hint (used for equation-sized images we no longer upscale on disk). */
export interface ImageDimensions {
  w: number;
  h: number;
  scale?: number;
}

/** Computed display size to stamp as width/height attributes. */
export interface DisplaySize {
  width: number;
  height: number;
}

/** The review text column is `max-w-3xl` (48rem = 768px) minus px-6/px-8
 *  padding; the usable content width is ~704px. Images bias toward filling it. */
export const TARGET_WIDTH = 704;

/** Never display an image wider than this multiple of its natural width —
 *  caps blur on low-resolution source images. */
export const MAX_UPSCALE = 2;

/** Portrait images taller than this (after width sizing) scale down to fit,
 *  so a tall screenshot never dominates the page. */
export const MAX_HEIGHT = 700;

/** Images at or below this natural height are layout strips / equations /
 *  dividers; stretching them to the column would be absurd, so they render
 *  at their (scaled) natural size. */
export const SHORT_IMAGE_HEIGHT = 150;

/**
 * Pure policy: map natural pixel dimensions to a display width/height.
 * Returns null when dimensions are missing or non-positive (caller leaves
 * the <img> untouched).
 */
export function computeDisplaySize(dim: ImageDimensions): DisplaySize | null {
  if (!dim || !dim.w || !dim.h || dim.w <= 0 || dim.h <= 0) return null;

  const scale = dim.scale && dim.scale > 0 ? dim.scale : 1;
  const nw = dim.w * scale;
  const nh = dim.h * scale;
  const aspect = nh / nw;

  // Short strips/equations: render at (scaled) natural size.
  if (nh <= SHORT_IMAGE_HEIGHT) {
    return { width: Math.round(nw), height: Math.round(nh) };
  }

  // Bias to column width, but never upscale beyond MAX_UPSCALE.
  let width = Math.min(TARGET_WIDTH, MAX_UPSCALE * nw);
  let height = width * aspect;

  // Portrait cap: if too tall, shrink both to fit MAX_HEIGHT.
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = height / aspect;
  }

  return { width: Math.round(width), height: Math.round(height) };
}
