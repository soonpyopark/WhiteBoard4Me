import type { RefObject } from 'react';

interface ToolbarProps {
  title: string;
  editingTitle: boolean;
  draftTitle: string;
  titleInputRef: RefObject<HTMLInputElement | null>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  hasSelection: boolean;
  onBack: () => void;
  onStartEditTitle: () => void;
  onDraftTitleChange: (value: string) => void;
  onCommitTitle: () => void;
  onCancelEditTitle: () => void;
  onExportImage: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function Toolbar({
  title,
  editingTitle,
  draftTitle,
  titleInputRef,
  saveStatus,
  hasSelection,
  onBack,
  onStartEditTitle,
  onDraftTitleChange,
  onCommitTitle,
  onCancelEditTitle,
  onExportImage,
  onDelete,
  onClear,
}: ToolbarProps) {
  return (
    <header className="editor-toolbar">
      <div className="editor-toolbar__leading">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 갤러리
        </button>
        <div className="editor-toolbar__title">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="editor-doc-title-input"
              value={draftTitle}
              onChange={(e) => onDraftTitleChange(e.target.value)}
              onBlur={onCommitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitTitle();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEditTitle();
                }
              }}
              aria-label="화이트보드 제목"
            />
          ) : (
            <button
              type="button"
              className="editor-doc-title"
              onClick={onStartEditTitle}
              title={title}
            >
              {title}
            </button>
          )}
        </div>
      </div>

      <div className="editor-toolbar__actions">
        <div className="editor-toolbar__actions-leading">
          <span className={`save-status save-status--${saveStatus}`} aria-live="polite">
            {saveStatus === 'saving' && '저장 중…'}
            {saveStatus === 'saved' && '저장됨'}
            {saveStatus === 'error' && '저장 실패'}
          </span>
          <button
            type="button"
            className="action-btn delete-btn"
            onClick={onDelete}
            disabled={!hasSelection}
            title="선택 삭제 (Delete)"
          >
            🗑 삭제
          </button>
        </div>
        <div className="editor-toolbar__actions-trailing">
          <button
            type="button"
            className="action-btn action-btn--wide clear-btn"
            onClick={onClear}
            title="전체 지우기"
          >
            전체 지우기
          </button>
          <button
            type="button"
            className="action-btn action-btn--wide export-btn"
            onClick={onExportImage}
            title="화이트보드를 PNG 이미지로 저장"
          >
            이미지로 저장
          </button>
        </div>
      </div>
    </header>
  );
}
