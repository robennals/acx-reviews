import fs from 'fs';
import path from 'path';
import type { ImageDimensions } from './image-size';

/**
 * Committed manifest of natural pixel dimensions for review images, keyed by
 * their full R2 URL. Read once at module load (build/SSG time, same pattern
 * as reviews-index.json); the client never sees this file. A URL absent from
 * the manifest gets no width/height stamping — that's how the rollout is
 * scoped per contest.
 */
const MANIFEST_PATH = path.join(process.cwd(), 'data', 'image-dimensions.json');

let manifest: Record<string, ImageDimensions> | null = null;

function loadManifest(): Record<string, ImageDimensions> {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    manifest = {};
  }
  return manifest!;
}

export function lookupDimensions(url: string): ImageDimensions | undefined {
  return loadManifest()[url];
}
