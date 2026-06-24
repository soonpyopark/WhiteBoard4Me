import { useEffect, useRef } from 'react';
import { renderPathsToCanvas } from '../engine/thumbnailRenderer';
import type { PathObject } from '../engine/types';

interface ThumbnailPreviewProps {
  paths?: PathObject[];
  thumbnail?: string;
  alt: string;
}

export function ThumbnailPreview({ paths, thumbnail, alt }: ThumbnailPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (thumbnail || !paths || paths.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderPathsToCanvas(ctx, paths, canvas.width, canvas.height);
  }, [paths, thumbnail]);

  if (thumbnail) {
    return <img src={thumbnail} alt={alt} className="card-preview-img" />;
  }

  return (
    <canvas
      ref={canvasRef}
      className="card-preview-canvas"
      width={320}
      height={200}
      aria-label={alt}
    />
  );
}
