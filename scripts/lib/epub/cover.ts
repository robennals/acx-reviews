/**
 * Generate a simple typographic cover (no artwork) as a 1600x2560 PNG.
 * Rendered from SVG via sharp; uses generic serif so it works with
 * whatever system fonts are available.
 */

import sharp from 'sharp';
import { escapeXml } from './xhtml';

export async function generateCover(opts: {
  topLine: string; // "Astral Codex Ten"
  year: string; // "2026"
  bottomLines: string[]; // ["Book Review", "Contest Entries"]
}): Promise<Buffer> {
  const bottom = opts.bottomLines
    .map(
      (line, i) =>
        `<text x="800" y="${1750 + i * 130}" text-anchor="middle" font-family="Georgia, serif" font-size="100" fill="#e8e4d8">${escapeXml(line)}</text>`
    )
    .join('\n  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2560">
  <rect width="1600" height="2560" fill="#1f2a38"/>
  <rect x="80" y="80" width="1440" height="2400" fill="none" stroke="#8a7b52" stroke-width="6"/>
  <text x="800" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="110" fill="#e8e4d8">${escapeXml(opts.topLine)}</text>
  <text x="800" y="1350" text-anchor="middle" font-family="Georgia, serif" font-size="520" font-weight="bold" fill="#c9b87c">${escapeXml(opts.year)}</text>
  ${bottom}
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
