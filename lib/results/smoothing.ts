// Discrete Gaussian smoothing over an evenly-spaced series (one value per
// integer x). Returns a same-length array; used to draw a soft density curve
// behind exact-count histogram bars. bandwidth is the Gaussian sigma in
// x-units; bandwidth <= 0 returns an unchanged copy.
export function gaussianSmooth(ys: number[], bandwidth: number): number[] {
  if (bandwidth <= 0) return ys.slice();
  const n = ys.length;
  const radius = Math.max(1, Math.ceil(bandwidth * 3));
  const kernel: number[] = [];
  for (let d = -radius; d <= radius; d++) {
    kernel.push(Math.exp(-(d * d) / (2 * bandwidth * bandwidth)));
  }
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    let wsum = 0;
    for (let d = -radius; d <= radius; d++) {
      const j = i + d;
      if (j < 0 || j >= n) continue;
      const w = kernel[d + radius];
      acc += ys[j] * w;
      wsum += w;
    }
    out[i] = wsum > 0 ? acc / wsum : 0;
  }
  return out;
}
