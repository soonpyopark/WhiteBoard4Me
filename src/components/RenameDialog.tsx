import { useEffect, useRef, useState } from 'react';

interface RenameDialogProps {
  open: boolean;
  initialTitle: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  open,
  initialTitle,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialTitle);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, initialTitle]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value.trim() || '제목 없음');
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rename-dialog-title" className="modal-title">
          이름 바꾸기
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="modal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="화이트보드 제목"
          />
          <div className="modal-actions">
            <button type="submit" className="modal-btn modal-btn--primary">
              저장
            </button>
            <button
              type="button"
              className="modal-btn modal-btn--secondary"
              onClick={onCancel}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
