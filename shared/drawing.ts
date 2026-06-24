export type DrawTool = 'pencil' | 'pen' | 'highlighter' | 'eraser';

export type EraserMode = 'partial' | 'stroke';

export type LineEndStyle = 'plain' | 'arrow-end' | 'arrow-both';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  pointerType: string;
}

export interface PathTransform {
  cx: number;
  cy: number;
  rotation: number;
  scale: number;
}

export interface PathObject {
  id: string;
  points: StrokePoint[];
  tool: DrawTool;
  color: string;
  baseWidth: number;
  minWidth: number;
  maxWidth: number;
  opacity: number;
  textured: boolean;
  transform: PathTransform;
  zIndex?: number;
  lineEnd?: LineEndStyle;
}

export interface ImageObject {
  id: string;
  src: string;
  width: number;
  height: number;
  transform: PathTransform;
  zIndex?: number;
}

export interface TextObject {
  id: string;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  lineHeight: number;
  width: number;
  height: number;
  transform: PathTransform;
  zIndex?: number;
}

export type SceneObject = PathObject | ImageObject | TextObject;

export function isPathObject(obj: SceneObject): obj is PathObject {
  return 'points' in obj;
}

export function isImageObject(obj: SceneObject): obj is ImageObject {
  return 'src' in obj && !('points' in obj);
}

export function isTextObject(obj: SceneObject): obj is TextObject {
  return 'content' in obj && !('points' in obj) && !('src' in obj);
}
