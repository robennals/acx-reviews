import sharp from 'sharp';
import { computeDisplaySize } from '../image-size';

const pixels = (css: string, name: string) => {
  const value = css.match(new RegExp(`(?:^|;)\\s*${name}:\\s*(-?[\\d.]+)px`));
  return value ? Number(value[1]) : undefined;
};

/** Decode and re-encode only embedded raster assets; no arbitrary network fetches. */
export async function prepareImage(src: string, css = '', parentCss = '') {
  // Avoid a repeated capture over megabytes: V8's cold RegExp interpreter
  // can exhaust its stack before optimizing it (observed in Next dev).
  const comma = src.indexOf(',');
  const prefix = src.slice(0, comma);
  if (comma < 0 || comma > 50 || !/^data:image\/(?:png|jpe?g|webp|gif);base64$/.test(prefix)) {
    throw new Error('This image could not be imported. Use an image inserted directly into Google Docs; only embedded raster images are supported in this preview.');
  }
  const payload = src.slice(comma + 1);
  if (payload.length > 14 * 1024 * 1024) throw new Error('This image is too large (10 MB limit).');
  if (!payload || /[^A-Za-z0-9+/=\s]/.test(payload)) throw new Error('This image has invalid data.');
  const buffer = Buffer.from(payload, 'base64');
  let pipeline = sharp(buffer, { limitInputPixels: 40_000_000 });
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Could not read this image.');
  if ((metadata.pages || 1) > 1) throw new Error('Animated images are not supported. Insert a still image.');
  if (/overflow:\s*hidden/.test(parentCss)) {
    const boxW = pixels(parentCss, 'width'), boxH = pixels(parentCss, 'height');
    const imgW = pixels(css, 'width'), imgH = pixels(css, 'height');
    if (boxW && boxH && imgW && imgH) {
      const left = Math.max(0, Math.round(-(pixels(css, 'margin-left') || 0) / imgW * metadata.width));
      const top = Math.max(0, Math.round(-(pixels(css, 'margin-top') || 0) / imgH * metadata.height));
      const width = Math.min(metadata.width - left, Math.round(boxW / imgW * metadata.width));
      const height = Math.min(metadata.height - top, Math.round(boxH / imgH * metadata.height));
      if (width <= 0 || height <= 0) throw new Error('This image crop is invalid. Reset the crop in Google Docs.');
      pipeline = pipeline.extract({ left, top, width, height });
    }
  }
  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });
  if (data.length > 10 * 1024 * 1024) throw new Error('The processed image is too large (10 MB limit).');
  const size = computeDisplaySize({ w: info.width, h: info.height })!;
  return { src: `data:image/png;base64,${data.toString('base64')}`, ...size };
}
