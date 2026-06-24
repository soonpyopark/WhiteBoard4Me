import type { ImageObject, PathObject, TextObject } from './types';

export function clonePaths(paths: PathObject[]): PathObject[] {
  return structuredClone(paths);
}

export function cloneImages(images: ImageObject[]): ImageObject[] {
  return images.map((image) => ({
    ...image,
    transform: { ...image.transform },
  }));
}

export function cloneTexts(texts: TextObject[]): TextObject[] {
  return texts.map((text) => ({
    ...text,
    transform: { ...text.transform },
  }));
}
