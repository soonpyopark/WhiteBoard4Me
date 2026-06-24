interface DeleteConfirmDialogProps {
  open: boolean;
  title?: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  open,
  title = '이 화이트보드 삭제',
  body = '삭제하면 영구적으로 제거됩니다. 이 작업은 실행 취소할 수 없습니다.',
  confirmLabel = '삭제',
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-dialog-title" className="modal-title">
          {title}
        </h2>
        <p className="modal-body">{body}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
