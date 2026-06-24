import { useCallback, useEffect, useRef, useState } from 'react';
import { DrawingEngine } from '../engine/drawingEngine';
import {
  extractClipboardImage,
  extractImageFiles,
  prepareImageFileForScene,
} from '../engine/imageUtils';
import type { DrawingOptions, HandleId, ImageObject, PathObject, StrokePoint, TextObject, Tool } from '../engine/types';
import { TOOL_PRESETS } from '../engine/types';
import { drawSettingsToOptions, isDrawSettingsTool, type DrawToolSettings } from '../drawToolSettings';
import type { EraserSettings } from '../eraserSettings';
import { SceneLayerMenu } from './SceneLayerMenu';
import { TextOptionsPopover } from './TextOptionsPopover';
import { ZoomControls } from './ZoomControls';
import {
  getTextTopLeft,
  TextEditorOverlay,
  type TextEditSession,
} from './TextEditorOverlay';
import type { TextToolSettings } from '../textToolSettings';
import { isTextObject } from '../engine/types';

interface DrawingCanvasProps {
  tool: Tool;
  drawSettings: DrawToolSettings;
  eraserSettings: EraserSettings;
  engineRef: React.MutableRefObject<DrawingEngine | null>;
  initialPaths?: PathObject[];
  initialImages?: ImageObject[];
  initialTexts?: TextObject[];
  textSettings: TextToolSettings;
  textOptionsOpen?: boolean;
  onTextSettingsChange?: (patch: Partial<TextToolSettings>) => void;
  onTextOptionsClose?: () => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onPathsChange?: () => void;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
  attachImageRef?: React.MutableRefObject<((at?: { x: number; y: number }) => void) | null>;
  onImageAdded?: () => void;
  onTextAdded?: () => void;
  onTextEditStart?: (existing: TextObject | null) => void;
  onTextEditEnd?: () => void;
}

function toScreenPoint(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function toWorldPoint(
  e: React.PointerEvent<HTMLCanvasElement>,
  engine: DrawingEngine,
): StrokePoint {
  const screen = toScreenPoint(e);
  const world = engine.screenToWorld(screen.x, screen.y);
  return {
    x: world.x,
    y: world.y,
    pressure: e.pressure,
    pointerType: e.pointerType,
  };
}

type InteractionMode =
  | 'draw'
  | 'select-lasso'
  | 'select-move'
  | 'pan'
  | 'handle'
  | 'long-press-wait'
  | 'idle';

type PendingPointerKind = 'draw' | 'pan' | 'select-move' | 'select-lasso' | 'idle';

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 8;

function isStylusPointer(e: React.PointerEvent): boolean {
  return e.pointerType === 'pen';
}

function isDrawTool(tool: Tool): boolean {
  return tool === 'eraser' || isDrawSettingsTool(tool);
}

function shouldIgnoreTouchForDraw(tool: Tool, pointerType: string, activePenCount: number): boolean {
  return isDrawTool(tool) && pointerType === 'touch' && activePenCount > 0;
}

export function DrawingCanvas({
  tool,
  drawSettings,
  eraserSettings,
  engineRef,
  initialPaths = [],
  initialImages = [],
  initialTexts = [],
  textSettings,
  textOptionsOpen = false,
  onTextSettingsChange,
  onTextOptionsClose,
  onSelectionChange,
  onPathsChange,
  onHistoryChange,
  attachImageRef,
  onImageAdded,
  onTextAdded,
  onTextEditStart,
  onTextEditEnd,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePlaceRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const modeRef = useRef<InteractionMode>('idle');
  const activeHandleRef = useRef<HandleId | null>(null);
  const lastClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [textEditSession, setTextEditSession] = useState<TextEditSession | null>(null);
  const textDraftRef = useRef('');
  const [layerMenu, setLayerMenu] = useState<{ x: number; y: number } | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressClientRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pendingMoveWorldRef = useRef<{ x: number; y: number } | null>(null);
  const pendingScreenRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPointerKindRef = useRef<PendingPointerKind>('idle');
  const activePenPointerCountRef = useRef(0);

  const isSelectMode = tool === 'select';
  const isLassoMode = tool === 'lasso';
  const isHandMode = tool === 'hand';
  const isEraserMode = tool === 'eraser';
  const isImageMode = tool === 'image';
  const isTextMode = tool === 'text';
  const isSelectionTool = isSelectMode || isLassoMode;
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const lastScreenPointRef = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openLayerMenu = useCallback(
    (clientX: number, clientY: number) => {
      setLayerMenu({ x: clientX, y: clientY });
    },
    [],
  );

  const resetActivePointer = useCallback(() => {
    cancelLongPress();
    const canvas = canvasRef.current;
    const pointerId = activePointerRef.current;
    if (canvas && pointerId !== null) {
      try {
        canvas.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
    }
    activePointerRef.current = null;
    modeRef.current = 'idle';
  }, [cancelLongPress]);

  const tryOpenContextMenuAt = useCallback(
    (clientX: number, clientY: number, worldX: number, worldY: number): boolean => {
      const engine = engineRef.current;
      if (!engine) return false;

      const hit = engine.hitTestSceneObjectAt(worldX, worldY);
      if (!hit) return false;

      resetActivePointer();
      cancelLongPress();
      engine.selectAt(worldX, worldY);
      openLayerMenu(clientX, clientY);
      return true;
    },
    [cancelLongPress, engineRef, openLayerMenu, resetActivePointer],
  );

  const beginContextPointer = useCallback(
    (
      e: React.PointerEvent<HTMLCanvasElement>,
      worldX: number,
      worldY: number,
      kind: PendingPointerKind,
    ) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerRef.current = e.pointerId;
      modeRef.current = 'long-press-wait';
      longPressClientRef.current = { x: e.clientX, y: e.clientY };
      longPressTriggeredRef.current = false;
      pendingMoveWorldRef.current = { x: worldX, y: worldY };
      pendingScreenRef.current = toScreenPoint(e);
      pendingPointerKindRef.current = kind;
      cancelLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        if (pendingPointerKindRef.current === 'draw') return;

        longPressTriggeredRef.current = true;
        const engine = engineRef.current;
        const pending = pendingMoveWorldRef.current;
        const start = longPressClientRef.current;
        if (engine && pending) {
          engine.selectAt(pending.x, pending.y);
        }
        if (start) {
          openLayerMenu(start.x, start.y);
        }
        resetActivePointer();
      }, LONG_PRESS_MS);
    },
    [cancelLongPress, engineRef, openLayerMenu, resetActivePointer],
  );

  const getDrawOptions = useCallback((): DrawingOptions => {
    if (tool === 'eraser') {
      const preset = TOOL_PRESETS.eraser;
      return {
        tool: 'eraser',
        color: '#000000',
        baseWidth: preset.baseWidth,
        minWidth: preset.minWidth,
        maxWidth: preset.maxWidth,
        opacity: preset.opacity,
        lineEnd: 'plain',
        eraserMode: eraserSettings.mode,
      };
    }

    if (!isDrawSettingsTool(tool)) {
      const preset = TOOL_PRESETS.pen;
      return {
        tool: 'pen',
        color: drawSettings.color,
        baseWidth: preset.baseWidth,
        minWidth: preset.minWidth,
        maxWidth: preset.maxWidth,
        opacity: preset.opacity,
        lineEnd: 'plain',
      };
    }

    const opts = drawSettingsToOptions(tool, drawSettings);
    return {
      tool,
      color: opts.color,
      baseWidth: opts.baseWidth,
      minWidth: opts.minWidth,
      maxWidth: opts.maxWidth,
      opacity: opts.opacity,
      lineEnd: opts.lineEnd,
    };
  }, [tool, drawSettings, eraserSettings.mode]);

  const getCursorTool = (): 'select' | 'lasso' | 'hand' | 'draw' | 'image' | 'text' => {
    if (isHandMode) return 'hand';
    if (isLassoMode) return 'lasso';
    if (isSelectMode) return 'select';
    if (isImageMode) return 'image';
    if (isTextMode) return 'text';
    return 'draw';
  };

  const openTextEditor = useCallback(
    (text: TextObject | null, x?: number, y?: number) => {
      onTextEditStart?.(text);

      if (text) {
        const engine = engineRef.current;
        engine?.selectAt(text.transform.cx, text.transform.cy);
        const topLeft = getTextTopLeft(text);
        setTextEditSession({
          id: text.id,
          topLeftX: topLeft.x,
          topLeftY: topLeft.y,
          draft: text.content,
        });
        return;
      }

      setTextEditSession({
        id: null,
        topLeftX: x ?? 0,
        topLeftY: y ?? 0,
        draft: '',
      });
    },
    [engineRef, onTextEditStart],
  );

  const tryOpenTextForEdit = useCallback(
    (hit: TextObject) => {
      resetActivePointer();
      openTextEditor(hit);
    },
    [openTextEditor, resetActivePointer],
  );

  const detectDoubleClick = (screen: { x: number; y: number }): boolean => {
    const now = Date.now();
    const last = lastClickRef.current;
    lastClickRef.current = { time: now, x: screen.x, y: screen.y };
    return (
      last !== null &&
      now - last.time < 350 &&
      Math.hypot(screen.x - last.x, screen.y - last.y) < 10
    );
  };

  const cancelTextEdit = useCallback(() => {
    setTextEditSession(null);
    onTextEditEnd?.();
  }, [onTextEditEnd]);

  textDraftRef.current = textEditSession?.draft ?? '';

  const commitTextEdit = useCallback(
    (draft: string) => {
      const session = textEditSession;
      if (!session) return;

      const trimmed = draft.trim();
      if (!trimmed) {
        setTextEditSession(null);
        onTextEditEnd?.();
        return;
      }

      const engine = engineRef.current;
      if (!engine) {
        setTextEditSession(null);
        return;
      }

      if (session.id) {
        engine.updateText(session.id, trimmed, textSettings);
      } else {
        engine.addText(trimmed, session.topLeftX, session.topLeftY, textSettings);
      }

      setTextEditSession(null);
      onTextAdded?.();
    },
    [engineRef, onTextAdded, onTextEditEnd, textEditSession, textSettings],
  );

  useEffect(() => {
    if (!textEditSession || !textOptionsOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest?.('.text-options-popover')) return;
      if (target.closest?.('.canvas-text-editor')) return;
      commitTextEdit(textDraftRef.current);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [textEditSession, textOptionsOpen, commitTextEdit]);

  const placeImagesAt = useCallback(
    async (files: File[], x: number, y: number) => {
      const engine = engineRef.current;
      if (!engine || files.length === 0) return;

      let added = false;
      for (const file of files) {
        try {
          const { src, width, height } = await prepareImageFileForScene(file);
          await engine.addImage(src, x, y, width, height);
          added = true;
        } catch {
          /* skip unreadable files */
        }
      }

      if (added) onImageAdded?.();
    },
    [engineRef, onImageAdded],
  );

  const openImagePicker = useCallback(
    (at?: { x: number; y: number }) => {
      pendingImagePlaceRef.current = at ?? null;
      fileInputRef.current?.click();
    },
    [],
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('image/'));
      e.target.value = '';
      if (files.length === 0) return;

      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (!engine || !canvas) return;

      let x: number;
      let y: number;
      if (pendingImagePlaceRef.current) {
        ({ x, y } = pendingImagePlaceRef.current);
      } else {
        const rect = canvas.getBoundingClientRect();
        const center = engine.getViewCenterWorld(rect.width, rect.height);
        x = center.x;
        y = center.y;
      }
      pendingImagePlaceRef.current = null;

      await placeImagesAt(files, x, y);
    },
    [engineRef, placeImagesAt],
  );

  useEffect(() => {
    if (!attachImageRef) return;
    attachImageRef.current = openImagePicker;
    return () => {
      attachImageRef.current = null;
    };
  }, [attachImageRef, openImagePicker]);

  const syncEraserCursor = useCallback(
    (visible: boolean) => {
      const el = eraserCursorRef.current;
      const engine = engineRef.current;
      const pt = lastScreenPointRef.current;

      if (!el || !isEraserMode) {
        if (el) el.style.display = 'none';
        return;
      }

      if (!visible || !pt || !engine) {
        el.style.display = 'none';
        return;
      }

      const diameter = TOOL_PRESETS.eraser.baseWidth * engine.getViewScale();
      el.style.display = 'block';
      el.style.left = `${pt.x}px`;
      el.style.top = `${pt.y}px`;
      el.style.width = `${diameter}px`;
      el.style.height = `${diameter}px`;
    },
    [engineRef, isEraserMode],
  );
  const syncEraserCursorRef = useRef(syncEraserCursor);
  syncEraserCursorRef.current = syncEraserCursor;

  const placeImageFiles = useCallback(
    async (files: File[], clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine || files.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      const { x, y } = engine.screenToWorld(screenX, screenY);
      await placeImagesAt(files, x, y);
    },
    [engineRef, placeImagesAt],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DrawingEngine(canvas);
    engineRef.current = engine;

    engine.setOnSelectionChange((ids) => {
      onSelectionChange(ids);
    });

    engine.setOnPathsChange(() => {
      onPathsChange?.();
    });

    engine.setOnHistoryChange((state) => {
      onHistoryChange?.(state);
    });

    engine.setOnZoomChange(() => {
      syncEraserCursorRef.current(true);
    });

    void engine.loadScene(initialPaths, initialImages, initialTexts);
    setEngineReady(true);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      engine.resize(parent.clientWidth, parent.clientHeight, dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      engine.setOnSelectionChange(null);
      engine.setOnPathsChange(null);
      engine.setOnZoomChange(null);
      engine.setOnHistoryChange(null);
      engineRef.current = null;
      setEngineReady(false);
    };
  }, [engineRef, onSelectionChange, onPathsChange, onHistoryChange, initialPaths, initialImages, initialTexts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blockNativeMenu = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };

    canvas.addEventListener('selectstart', blockNativeMenu);
    canvas.addEventListener('contextmenu', blockNativeMenu);
    canvas.addEventListener('gesturestart', blockNativeMenu);
    canvas.addEventListener('touchstart', blockNativeMenu, { passive: false });

    return () => {
      canvas.removeEventListener('selectstart', blockNativeMenu);
      canvas.removeEventListener('contextmenu', blockNativeMenu);
      canvas.removeEventListener('gesturestart', blockNativeMenu);
      canvas.removeEventListener('touchstart', blockNativeMenu);
    };
  }, [engineReady]);

  useEffect(() => {
    if (!isEraserMode) {
      syncEraserCursor(false);
    }
  }, [isEraserMode, syncEraserCursor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (engineRef.current?.deleteSelected()) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineRef]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const clipboard = e.clipboardData;
      if (!clipboard) return;

      const hasImage = [...clipboard.items].some((item) => item.type.startsWith('image/'));
      if (!hasImage) return;

      e.preventDefault();

      void extractClipboardImage(clipboard).then(async (file) => {
        const canvas = canvasRef.current;
        const engine = engineRef.current;
        if (!file || !canvas || !engine) return;
        const rect = canvas.getBoundingClientRect();
        const center = engine.getViewCenterWorld(rect.width, rect.height);
        await placeImagesAt([file], center.x, center.y);
      });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [engineRef, placeImagesAt]);

  const handleDragOver = (e: React.DragEvent) => {
    if (!extractImageFiles(e.dataTransfer).length) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    engineRef.current?.setDropHighlight(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    engineRef.current?.setDropHighlight(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    engineRef.current?.setDropHighlight(false);
    const files = extractImageFiles(e.dataTransfer);
    if (files.length === 0) return;
    void placeImageFiles(files, e.clientX, e.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textEditSession) return;

    const engine = engineRef.current;
    if (!engine) return;

    if (e.pointerType === 'pen') {
      activePenPointerCountRef.current += 1;
    }

    if (shouldIgnoreTouchForDraw(tool, e.pointerType, activePenPointerCountRef.current)) return;

    if (
      e.cancelable &&
      (isDrawTool(tool) || isHandMode || isEraserMode || isLassoMode || isSelectMode)
    ) {
      e.preventDefault();
    }

    const screen = toScreenPoint(e);
    const world = toWorldPoint(e, engine);
    const hit = engine.hitTestSceneObjectAt(world.x, world.y);
    const isDoubleClick = detectDoubleClick(screen);

    if (e.button === 0 && hit && isTextObject(hit) && isDoubleClick) {
      tryOpenTextForEdit(hit);
      return;
    }

    if (e.button === 2) {
      tryOpenContextMenuAt(e.clientX, e.clientY, world.x, world.y);
      return;
    }

    if (activePointerRef.current !== null) return;

    if (e.button === 0 && (isSelectMode || isLassoMode || isTextMode)) {
      const handle = engine.hitTestHandleAt(world.x, world.y);
      if (handle) {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerRef.current = e.pointerId;
        modeRef.current = 'handle';
        activeHandleRef.current = handle;
        engine.beginHandleDrag(handle, world.x, world.y);
        return;
      }
    }

    if (isTextMode && !hit) {
      openTextEditor(null, world.x, world.y);
      return;
    }

    if (e.button === 0 && hit) {
      if (isDrawTool(tool) && (isStylusPointer(e) || e.pointerType === 'touch')) {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerRef.current = e.pointerId;
        modeRef.current = 'draw';
        cancelLongPress();
        const drawTool = tool === 'eraser' ? 'eraser' : isDrawSettingsTool(tool) ? tool : 'pen';
        engine.beginStroke(world, getDrawOptions(), TOOL_PRESETS[drawTool]);
        return;
      }

      if ((isStylusPointer(e) || e.pointerType === 'touch') && isHandMode) {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerRef.current = e.pointerId;
        modeRef.current = 'pan';
        cancelLongPress();
        engine.beginPan(screen.x, screen.y);
        return;
      }

      if (isSelectMode || isLassoMode) {
        if (!engine.containsSelectedAt(world.x, world.y)) {
          engine.selectAt(world.x, world.y);
        }
      } else if (isTextMode && isTextObject(hit)) {
        engine.selectAt(world.x, world.y);
      }

      let pendingKind: PendingPointerKind = 'idle';
      if (isHandMode) {
        pendingKind = 'pan';
      } else if (isSelectMode) {
        pendingKind = 'select-move';
      } else if (isLassoMode) {
        pendingKind = engine.containsSelectedAt(world.x, world.y) ? 'select-move' : 'select-lasso';
      } else if (!isTextMode && !isImageMode) {
        pendingKind = 'draw';
      }

      beginContextPointer(e, world.x, world.y, pendingKind);
      return;
    }

    if (e.button !== 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;

    if (isHandMode) {
      modeRef.current = 'pan';
      engine.beginPan(screen.x, screen.y);
      return;
    }

    if (isImageMode) {
      openImagePicker({ x: world.x, y: world.y });
      return;
    }

    if (isSelectMode) {
      engine.deselect();
      modeRef.current = 'idle';
      return;
    }

    if (isLassoMode) {
      modeRef.current = 'select-lasso';
      engine.beginLasso(world.x, world.y);
      return;
    }

    modeRef.current = 'draw';
    const drawTool = tool === 'eraser' ? 'eraser' : isDrawSettingsTool(tool) ? tool : 'pen';
    const preset = TOOL_PRESETS[drawTool];
    engine.beginStroke(world, getDrawOptions(), preset);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (shouldIgnoreTouchForDraw(tool, e.pointerType, activePenPointerCountRef.current)) return;

    const screen = toScreenPoint(e);
    const world = toWorldPoint(e, engine);

    if (isEraserMode) {
      lastScreenPointRef.current = { x: screen.x, y: screen.y };
      syncEraserCursor(true);
    }

    if (activePointerRef.current === null) {
      if (!isEraserMode) {
        canvasRef.current!.style.cursor = engine.getCursorHint(
          world.x,
          world.y,
          getCursorTool(),
          modeRef.current === 'pan',
        );
      }
      return;
    }

    if (activePointerRef.current !== e.pointerId) return;

    if (modeRef.current === 'long-press-wait') {
      const start = longPressClientRef.current;
      const pending = pendingMoveWorldRef.current;
      const pendingScreen = pendingScreenRef.current;
      if (start && pending && !longPressTriggeredRef.current) {
        const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (dist > LONG_PRESS_MOVE_THRESHOLD) {
          cancelLongPress();
          const kind = pendingPointerKindRef.current;

          if (kind === 'select-move') {
            modeRef.current = 'select-move';
            engine.beginMove(pending.x, pending.y);
            engine.updateMove(world.x, world.y);
          } else if (kind === 'select-lasso') {
            modeRef.current = 'select-lasso';
            engine.beginLasso(pending.x, pending.y);
            engine.extendLasso(world.x, world.y);
          } else if (kind === 'pan' && pendingScreen) {
            modeRef.current = 'pan';
            engine.beginPan(pendingScreen.x, pendingScreen.y);
            engine.updatePan(screen.x, screen.y);
          } else if (kind === 'draw') {
            modeRef.current = 'draw';
            const drawTool = tool === 'eraser' ? 'eraser' : isDrawSettingsTool(tool) ? tool : 'pen';
            const preset = TOOL_PRESETS[drawTool];
            engine.beginStroke(
              {
                x: pending.x,
                y: pending.y,
                pressure: e.pressure,
                pointerType: e.pointerType,
              },
              getDrawOptions(),
              preset,
            );
            engine.extendStroke(world);
          }
        }
      }
      return;
    }

    if (modeRef.current === 'handle') {
      engine.updateHandleDrag(world.x, world.y);
      return;
    }

    if (modeRef.current === 'pan') {
      engine.updatePan(screen.x, screen.y);
      return;
    }

    if (modeRef.current === 'select-move') {
      engine.updateMove(world.x, world.y);
      return;
    }

    if (modeRef.current === 'select-lasso') {
      engine.extendLasso(world.x, world.y);
      return;
    }

    if (modeRef.current === 'draw') {
      engine.extendStroke(world);
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') {
      activePenPointerCountRef.current = Math.max(0, activePenPointerCountRef.current - 1);
    }

    if (activePointerRef.current !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const engine = engineRef.current;

    if (modeRef.current === 'long-press-wait') {
      cancelLongPress();
      longPressClientRef.current = null;
      pendingMoveWorldRef.current = null;
      pendingScreenRef.current = null;
      pendingPointerKindRef.current = 'idle';
      modeRef.current = 'idle';
      activePointerRef.current = null;
      return;
    }

    if (modeRef.current === 'handle') {
      engine?.endHandleDrag();
      activeHandleRef.current = null;
    } else if (modeRef.current === 'pan') {
      engine?.endPan();
    } else if (modeRef.current === 'select-move') {
      engine?.endMove();
    } else if (modeRef.current === 'select-lasso') {
      engine?.endLasso();
    } else if (modeRef.current === 'draw') {
      engine?.endStroke();
    }

    modeRef.current = 'idle';
    activePointerRef.current = null;
  };

  const handlePointerLeave = () => {
    lastScreenPointRef.current = null;
    syncEraserCursor(false);
    cancelLongPress();
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (textEditSession) return;

    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const world = engine.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    cancelLongPress();
    tryOpenContextMenuAt(e.clientX, e.clientY, world.x, world.y);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEraserMode) return;
    const screen = toScreenPoint(e);
    lastScreenPointRef.current = { x: screen.x, y: screen.y };
    syncEraserCursor(true);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (textEditSession) return;

    const engine = engineRef.current;
    if (!engine) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const world = engine.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = engine.hitTestSceneObjectAt(world.x, world.y);
    if (hit && isTextObject(hit)) {
      e.preventDefault();
      tryOpenTextForEdit(hit);
    }
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="canvas-file-input"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => void handleFileInputChange(e)}
      />
      <canvas
        ref={canvasRef}
        className={`drawing-canvas ${isSelectionTool ? 'select-mode' : ''} ${isHandMode ? 'hand-mode' : ''} ${isLassoMode ? 'lasso-mode' : ''} ${isEraserMode ? 'eraser-mode' : ''} ${isImageMode ? 'image-mode' : ''} ${isTextMode ? 'text-mode' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={handlePointerLeave}
        onPointerEnter={handlePointerEnter}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
        onDoubleClick={handleDoubleClick}
      />
      <div ref={eraserCursorRef} className="eraser-cursor" aria-hidden="true" />
      {textEditSession && (
        <TextEditorOverlay
          session={textEditSession}
          settings={textSettings}
          engineRef={engineRef}
          editorRef={textEditorRef}
          optionsOpen={textOptionsOpen}
          onDraftChange={(draft) => setTextEditSession((prev) => (prev ? { ...prev, draft } : prev))}
          onCommit={commitTextEdit}
          onCancel={cancelTextEdit}
        />
      )}
      {textOptionsOpen && textEditSession && onTextSettingsChange && onTextOptionsClose && (
        <TextOptionsPopover
          settings={textSettings}
          onChange={onTextSettingsChange}
          anchorRef={textEditorRef}
          placement="editor"
          open={textOptionsOpen}
          onClose={onTextOptionsClose}
        />
      )}
      {layerMenu && (
        <SceneLayerMenu
          x={layerMenu.x}
          y={layerMenu.y}
          engineRef={engineRef}
          onClose={() => setLayerMenu(null)}
          onChange={() => onPathsChange?.()}
        />
      )}
      <ZoomControls containerRef={containerRef} engineRef={engineRef} engineReady={engineReady} />
    </div>
  );
}
