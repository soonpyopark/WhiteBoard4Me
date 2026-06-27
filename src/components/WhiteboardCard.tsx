import { useEffect, useRef, useState } from 'react';
import { formatEditedDate } from '../api/whiteboards';
import type { WhiteboardSummary } from '../types/whiteboard';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { RenameDialog } from './RenameDialog';
import { ThumbnailPreview } from './ThumbnailPreview';

interface WhiteboardCardProps {
  board: WhiteboardSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onCopy: (id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (id: string) => void;
  onDragLeave?: () => void;
  onDrop?: (id: string) => void;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function WhiteboardCard({
  board,
  onOpen,
  onDelete,
  onRename,
  onCopy,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: WhiteboardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const openRename = () => {
    setMenuOpen(false);
    setRenameOpen(true);
  };

  const openCopy = () => {
    setMenuOpen(false);
    onCopy(board.id);
  };

  const openDelete = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };

  const confirmRename = (title: string) => {
    setRenameOpen(false);
    if (title !== board.title) {
      onRename(board.id, title);
    }
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    onDelete(board.id);
  };

  return (
    <>
      <article
        className={`whiteboard-card${isDragging ? ' whiteboard-card--dragging' : ''}${isDragOver ? ' whiteboard-card--drag-over' : ''}`}
        draggable={Boolean(onDragStart)}
        onDragStart={(e) => {
          if (!onDragStart) return;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', board.id);
          onDragStart(board.id);
        }}
        onDragEnd={() => onDragEnd?.()}
        onDragOver={(e) => {
          if (!onDragOver) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOver(board.id);
        }}
        onDragLeave={() => onDragLeave?.()}
        onDrop={(e) => {
          if (!onDrop) return;
          e.preventDefault();
          onDrop(board.id);
        }}
      >
        <button
          type="button"
          className="card-preview-btn"
          draggable={false}
          onClick={() => onOpen(board.id)}
          aria-label={`${board.title} 열기`}
        >
          <div className="card-preview">
            <ThumbnailPreview
              thumbnail={board.thumbnail}
              alt={`${board.title} 미리보기`}
            />
          </div>
        </button>

        <div className="card-meta">
          <button
            type="button"
            className="card-title-btn"
            draggable={false}
            onClick={() => onOpen(board.id)}
            title={board.title}
          >
            <span className="card-title">{board.title}</span>
            <span className="card-date">{formatEditedDate(board.updatedAt)}</span>
          </button>

          <div className="card-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="card-menu-btn"
              draggable={false}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="더 보기"
              aria-expanded={menuOpen}
            >
              ···
            </button>
            {menuOpen && (
              <div className="card-menu">
                <button type="button" className="card-menu-item" onClick={openRename}>
                  <span className="card-menu-icon">
                    <PencilIcon />
                  </span>
                  이름 바꾸기
                </button>
                <button type="button" className="card-menu-item" onClick={openCopy}>
                  <span className="card-menu-icon">
                    <CopyIcon />
                  </span>
                  복사
                </button>
                <button type="button" className="card-menu-item danger" onClick={openDelete}>
                  <span className="card-menu-icon">
                    <TrashIcon />
                  </span>
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </article>

      <RenameDialog
        open={renameOpen}
        initialTitle={board.title}
        onConfirm={confirmRename}
        onCancel={() => setRenameOpen(false)}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
