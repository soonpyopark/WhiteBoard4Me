import { useCallback, useEffect, useState } from 'react';
import {
  createWhiteboard,
  deleteWhiteboard,
  fetchWhiteboards,
  renameWhiteboard,
} from '../api/whiteboards';
import type { WhiteboardSummary } from '../types/whiteboard';
import { WhiteboardCard } from './WhiteboardCard';
import { HomeButton } from './HomeButton';

interface GalleryViewProps {
  onOpen: (id: string) => void;
  onCreate: (id: string) => void;
  onAppHome?: () => void;
}

export function GalleryView({ onOpen, onCreate, onAppHome }: GalleryViewProps) {
  const [boards, setBoards] = useState<WhiteboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await fetchWhiteboards();
      setBoards(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const doc = await createWhiteboard();
      onCreate(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWhiteboard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  };

  const handleRename = async (id: string, title: string) => {
    try {
      const doc = await renameWhiteboard(id, title);
      setBoards((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, title: doc.title, updatedAt: doc.updatedAt } : b,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '이름 변경에 실패했습니다');
    }
  };

  const handleAppHome = () => {
    onAppHome?.();
    window.scrollTo(0, 0);
    document.querySelector('.gallery-main')?.scrollTo(0, 0);
    void load();
  };

  return (
    <div className="gallery">
      <header className="gallery-header">
        <div className="gallery-header-left">
          <HomeButton onAppHome={handleAppHome} />
          <h1 className="gallery-title">My-local-whiteboard v1.0</h1>
        </div>
        <div className="gallery-header-actions">
          <button type="button" className="header-icon-btn" title="설정" aria-label="설정">
            ⚙
          </button>
          <button type="button" className="header-avatar" title="프로필" aria-label="프로필">
            U
          </button>
        </div>
      </header>

      <main className="gallery-main">
        {error && (
          <div className="gallery-error" role="alert">
            {error}
            <button type="button" onClick={load}>
              다시 시도
            </button>
          </div>
        )}

        {loading ? (
          <p className="gallery-loading">불러오는 중…</p>
        ) : (
          <div className="gallery-grid">
            <button
              type="button"
              className="new-whiteboard-card"
              onClick={handleCreate}
              disabled={creating}
            >
              <span className="new-card-icon">+</span>
              <span className="new-card-label">
                {creating ? '생성 중…' : '새 화이트보드'}
              </span>
            </button>

            {boards.map((board) => (
              <WhiteboardCard
                key={board.id}
                board={board}
                onOpen={onOpen}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
