import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWhiteboard, renameWhiteboard, saveWhiteboard } from '../api/whiteboards';
import { DrawingCanvas } from './DrawingCanvas';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { MadeByCredit } from './MadeByCredit';
import { Toolbar } from './Toolbar';
import type { TextOptionsPopoverPlacement } from './TextOptionsPopover';
import { getCanvasHint } from '../canvasHint';
import type { DrawingEngine } from '../engine/drawingEngine';
import { generateThumbnail, downloadSceneAsPng } from '../engine/thumbnailRenderer';
import { runWhenIdle } from '../utils/idle';
import {
  DEFAULT_DRAW_TOOL_SETTINGS,
  drawSettingsToOptions,
  isDrawSettingsTool,
  settingsFromPath,
  type DrawSettingsTool,
  type DrawToolSettings,
} from '../drawToolSettings';
import { DEFAULT_ERASER_SETTINGS, type EraserSettings } from '../eraserSettings';
import { DEFAULT_TEXT_TOOL_SETTINGS, settingsFromText, type TextToolSettings } from '../textToolSettings';
import type { ImageObject, PathObject, TextObject, Tool } from '../engine/types';
import { isTextObject } from '../engine/types';
import type { WhiteboardDocument } from '../types/whiteboard';

interface EditorViewProps {
  whiteboardId: string;
  onBack: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 2500;
const THUMBNAIL_INTERVAL_MS = 30_000;

export function EditorView({ whiteboardId, onBack }: EditorViewProps) {
  const [tool, setTool] = useState<Tool>('pencil');
  const [drawSettingsByTool, setDrawSettingsByTool] = useState<
    Record<DrawSettingsTool, DrawToolSettings>
  >(() => ({ ...DEFAULT_DRAW_TOOL_SETTINGS }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('제목 없음');
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [initialPaths, setInitialPaths] = useState<PathObject[]>([]);
  const [initialImages, setInitialImages] = useState<ImageObject[]>([]);
  const [initialTexts, setInitialTexts] = useState<TextObject[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [drawOptionsOpen, setDrawOptionsOpen] = useState(false);
  const [eraserSettings, setEraserSettings] = useState<EraserSettings>(() => ({
    ...DEFAULT_ERASER_SETTINGS,
  }));
  const [textSettings, setTextSettings] = useState<TextToolSettings>(() => ({
    ...DEFAULT_TEXT_TOOL_SETTINGS,
  }));
  const [textOptionsPlacement, setTextOptionsPlacement] =
    useState<TextOptionsPopoverPlacement>('toolbar');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const engineRef = useRef<DrawingEngine | null>(null);
  const attachImageRef = useRef<((at?: { x: number; y: number }) => void) | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<WhiteboardDocument | null>(null);
  const saveGenerationRef = useRef(0);
  const isDirtyRef = useRef(false);
  const lastThumbnailAtRef = useRef(0);
  const persistRef = useRef<(options?: { forceThumbnail?: boolean }) => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const doc = await fetchWhiteboard(whiteboardId);
        if (cancelled) return;
        docRef.current = doc;
        setTitle(doc.title);
        setInitialPaths(doc.paths);
        setInitialImages(doc.images ?? []);
        setInitialTexts(doc.texts ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '불러오기 실패');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [whiteboardId]);

  const persist = useCallback(async (options?: { forceThumbnail?: boolean }) => {
    const engine = engineRef.current;
    if (!engine || !isDirtyRef.current) return;

    const generation = ++saveGenerationRef.current;
    setSaveStatus('saving');

    await new Promise<void>((resolve) => {
      runWhenIdle(resolve);
    });

    if (generation !== saveGenerationRef.current) return;

    const paths = engine.getPathsSnapshot();
    const images = engine.getImagesSnapshot();
    const texts = engine.getTextsSnapshot();

    let thumbnail = docRef.current?.thumbnail;
    const shouldRefreshThumbnail =
      options?.forceThumbnail ||
      Date.now() - lastThumbnailAtRef.current >= THUMBNAIL_INTERVAL_MS;

    if (shouldRefreshThumbnail) {
      thumbnail = generateThumbnail(paths, images, 320, 200, texts);
      lastThumbnailAtRef.current = Date.now();
    }

    if (generation !== saveGenerationRef.current) return;

    try {
      const doc = await saveWhiteboard(whiteboardId, { title, paths, images, texts, thumbnail });
      if (generation !== saveGenerationRef.current) return;
      docRef.current = doc;
      isDirtyRef.current = false;
      setSaveStatus('saved');
    } catch {
      if (generation === saveGenerationRef.current) {
        setSaveStatus('error');
      }
    }
  }, [whiteboardId, title]);

  persistRef.current = persist;

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persistRef.current();
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const handlePathsChange = useCallback(() => {
    isDirtyRef.current = true;
    scheduleSave();
  }, [scheduleSave]);

  const drawSettings = isDrawSettingsTool(tool)
    ? drawSettingsByTool[tool]
    : drawSettingsByTool.pen;

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    if (ids.length === 1 && engineRef.current) {
      const selected = engineRef.current.getSelectedObject();
      if (selected && isTextObject(selected)) {
        setTextSettings(settingsFromText(selected));
        return;
      }

      const path = engineRef.current.getSelectedPath();
      if (path && path.tool !== 'eraser' && isDrawSettingsTool(path.tool)) {
        const drawTool = path.tool;
        const fromPath = settingsFromPath(path);
        setDrawSettingsByTool((prev) => ({
          ...prev,
          [drawTool]: { ...prev[drawTool], ...fromPath },
        }));
      }
    }
  }, []);

  const handleTextEditStart = useCallback((existing: TextObject | null) => {
    if (existing) {
      setTextSettings(settingsFromText(existing));
      setTool('text');
      setDrawOptionsOpen(true);
      setTextOptionsPlacement('editor');
      return;
    }
    setDrawOptionsOpen(false);
    setTextOptionsPlacement('toolbar');
  }, []);

  const handleTextEditEnd = useCallback(() => {
    setDrawOptionsOpen(false);
    setTextOptionsPlacement('toolbar');
  }, []);

  const handleTextAdded = useCallback(() => {
    setTool('select');
    setDrawOptionsOpen(false);
  }, []);

  const handleImageAdded = useCallback(() => {
    setTool('select');
    setDrawOptionsOpen(false);
  }, []);

  const handleToolChange = (newTool: Tool) => {
    if (isDrawSettingsTool(newTool)) {
      if (newTool === tool && drawOptionsOpen) {
        setDrawOptionsOpen(false);
        return;
      }
      setTool(newTool);
      setDrawOptionsOpen(true);
      return;
    }

    if (newTool === 'eraser') {
      if (newTool === tool && drawOptionsOpen) {
        setDrawOptionsOpen(false);
        return;
      }
      setTool(newTool);
      setDrawOptionsOpen(true);
      return;
    }

    if (newTool === 'image') {
      setTool('image');
      setDrawOptionsOpen(false);
      return;
    }

    if (newTool === 'text') {
      if (newTool === tool && drawOptionsOpen) {
        setDrawOptionsOpen(false);
        return;
      }
      setTool('text');
      setDrawOptionsOpen(true);
      setTextOptionsPlacement('toolbar');
      return;
    }

    setTool(newTool);
    setDrawOptionsOpen(false);
  };

  const applyDrawSettingsToSelection = (settings: DrawToolSettings, activeTool: Tool) => {
    if (selectedIds.length !== 1 || !isDrawSettingsTool(activeTool)) return;
    const opts = drawSettingsToOptions(activeTool, settings);
    engineRef.current?.updateSelectedPathStyle({
      color: opts.color,
      opacity: opts.opacity,
      baseWidth: opts.baseWidth,
      minWidth: opts.minWidth,
      maxWidth: opts.maxWidth,
      lineEnd: opts.lineEnd,
    });
  };

  const handleEraserSettingsChange = (patch: Partial<EraserSettings>) => {
    setEraserSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleTextSettingsChange = (patch: Partial<TextToolSettings>) => {
    const nextSettings = { ...textSettings, ...patch };
    setTextSettings(nextSettings);
    engineRef.current?.updateSelectedTextStyle(nextSettings);
  };

  const handleDrawSettingsChange = (patch: Partial<DrawToolSettings>) => {
    if (!isDrawSettingsTool(tool)) return;

    const nextSettings = { ...drawSettingsByTool[tool], ...patch };
    setDrawSettingsByTool((prev) => ({
      ...prev,
      [tool]: nextSettings,
    }));
    applyDrawSettingsToSelection(nextSettings, tool);
  };

  const handleDelete = () => {
    engineRef.current?.deleteSelected();
  };

  const handleClear = () => {
    engineRef.current?.clear();
    setSelectedIds([]);
    setClearConfirmOpen(false);
  };

  const handleClearRequest = () => {
    setClearConfirmOpen(true);
  };

  const handleExportImage = () => {
    const engine = engineRef.current;
    if (!engine) return;
    downloadSceneAsPng(
      engine.getPathsSnapshot(),
      engine.getImagesSnapshot(),
      title,
      engine.getTextsSnapshot(),
    );
  };

  const handleUndo = useCallback(async () => {
    await engineRef.current?.undo();
  }, []);

  const handleRedo = useCallback(async () => {
    await engineRef.current?.redo();
  }, []);

  const handleHistoryChange = useCallback((state: { canUndo: boolean; canRedo: boolean }) => {
    setCanUndo(state.canUndo);
    setCanRedo(state.canRedo);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void handleUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        void handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  const startEditTitle = () => {
    setDraftTitle(title);
    setEditingTitle(true);
  };

  const cancelEditTitle = () => {
    setEditingTitle(false);
    setDraftTitle(title);
  };

  const commitTitle = async () => {
    const next = draftTitle.trim() || '제목 없음';
    setEditingTitle(false);
    if (next === title) return;

    const prevTitle = title;
    setTitle(next);
    setSaveStatus('saving');
    try {
      const doc = await renameWhiteboard(whiteboardId, next);
      docRef.current = doc;
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
      setTitle(prevTitle);
    }
  };

  const handleBack = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistRef.current({ forceThumbnail: true });
    onBack();
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="editor-loading">
        <p>화이트보드를 불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-loading">
        <p>{error}</p>
        <button type="button" onClick={onBack}>
          갤러리로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="app editor">
      <Toolbar
        title={title}
        editingTitle={editingTitle}
        draftTitle={draftTitle}
        titleInputRef={titleInputRef}
        saveStatus={saveStatus}
        tool={tool}
        drawSettings={drawSettings}
        eraserSettings={eraserSettings}
        textSettings={textSettings}
        drawOptionsOpen={drawOptionsOpen}
        textOptionsPlacement={textOptionsPlacement}
        hasSelection={selectedIds.length > 0}
        canUndo={canUndo}
        canRedo={canRedo}
        onBack={() => void handleBack()}
        onStartEditTitle={startEditTitle}
        onDraftTitleChange={setDraftTitle}
        onCommitTitle={() => void commitTitle()}
        onCancelEditTitle={cancelEditTitle}
        onExportImage={handleExportImage}
        onAttachImage={() => attachImageRef.current?.()}
        onToolChange={handleToolChange}
        onDrawSettingsChange={handleDrawSettingsChange}
        onEraserSettingsChange={handleEraserSettingsChange}
        onTextSettingsChange={handleTextSettingsChange}
        onDrawOptionsClose={() => setDrawOptionsOpen(false)}
        onUndo={() => void handleUndo()}
        onRedo={() => void handleRedo()}
        onDelete={handleDelete}
        onClear={handleClearRequest}
      />

      <DeleteConfirmDialog
        open={clearConfirmOpen}
        title="전체 지우기"
        body="모든 그림과 이미지가 삭제됩니다. 되돌리기로 복구할 수 있습니다."
        confirmLabel="지우기"
        onConfirm={handleClear}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <main className="workspace">
        <DrawingCanvas
          key={whiteboardId}
          tool={tool}
          drawSettings={drawSettings}
          eraserSettings={eraserSettings}
          engineRef={engineRef}
          initialPaths={initialPaths}
          initialImages={initialImages}
          initialTexts={initialTexts}
          textSettings={textSettings}
          textOptionsOpen={tool === 'text' && drawOptionsOpen && textOptionsPlacement === 'editor'}
          onTextSettingsChange={handleTextSettingsChange}
          onTextOptionsClose={() => setDrawOptionsOpen(false)}
          onSelectionChange={handleSelectionChange}
          onPathsChange={handlePathsChange}
          onHistoryChange={handleHistoryChange}
          attachImageRef={attachImageRef}
          onImageAdded={handleImageAdded}
          onTextAdded={handleTextAdded}
          onTextEditStart={handleTextEditStart}
          onTextEditEnd={handleTextEditEnd}
        />
      </main>

      <MadeByCredit hint={getCanvasHint(tool)} />
    </div>
  );
}
