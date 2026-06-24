import type { ImageObject } from './types';

const cache = new Map<string, HTMLImageElement>();

export function getCachedImage(key: string): HTMLImageElement | undefined {
  return cache.get(key);
}

export async function preloadImage(key: string, src: string): Promise<HTMLImageElement> {
  const existing = cache.get(key);
  if (existing?.complete && existing.naturalWidth > 0) return existing;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

export function renderImage(
  ctx: CanvasRenderingContext2D,
  image: ImageObject,
  htmlImg: HTMLImageElement,
): void {
  const { transform, width, height } = image;
  ctx.save();
  ctx.translate(transform.cx, transform.cy);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scale, transform.scale);
  ctx.drawImage(htmlImg, -width / 2, -height / 2, width, height);
  ctx.restore();
}

export function clearImageCache(): void {
  cache.clear();
}

export async function preloadImages(images: ImageObject[]): Promise<void> {
  await Promise.all(images.map((img) => preloadImage(img.id, img.src)));
}
