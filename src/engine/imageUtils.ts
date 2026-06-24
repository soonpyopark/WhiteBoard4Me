const MAX_IMAGE_DIMENSION = 480;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  const img = await loadImageElement(src);
  return fitImageSize(img.naturalWidth, img.naturalHeight);
}

/** Display size에 맞춰 JPEG로 압축 — 원본 base64 그대로 저장하면 용량이 커져 저장 API가 실패할 수 있음 */
export async function prepareImageFileForScene(
  file: File,
): Promise<{ src: string; width: number; height: number }> {
  const rawSrc = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawSrc);
  const { width, height } = fitImageSize(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.drawImage(img, 0, 0, width, height);
  const src = canvas.toDataURL('image/jpeg', 0.85);
  return { src, width, height };
}

export function fitImageSize(
  naturalWidth: number,
  naturalHeight: number,
  maxDim = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxDim, height: maxDim };
  }
  const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
}

export function extractImageFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];
  if (dataTransfer.files?.length) {
    for (const file of dataTransfer.files) {
      if (file.type.startsWith('image/')) files.push(file);
    }
  }
  return files;
}

export async function extractClipboardImage(
  clipboardData: DataTransfer,
): Promise<File | null> {
  const files = extractImageFiles(clipboardData);
  if (files.length > 0) return files[0];

  for (const item of clipboardData.items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
