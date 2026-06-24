import { useState } from 'react';
import { EditorView } from './components/EditorView';
import { GalleryView } from './components/GalleryView';
import { MadeByCredit } from './components/MadeByCredit';
import './App.css';
import './Gallery.css';

type View =
  | { mode: 'gallery' }
  | { mode: 'editor'; id: string };

function App() {
  const [view, setView] = useState<View>({ mode: 'gallery' });

  const goAppHome = () => setView({ mode: 'gallery' });

  return (
    <div className="app-shell">
      {view.mode === 'editor' ? (
        <EditorView
          whiteboardId={view.id}
          onBack={() => setView({ mode: 'gallery' })}
        />
      ) : (
        <GalleryView
          onOpen={(id) => setView({ mode: 'editor', id })}
          onCreate={(id) => setView({ mode: 'editor', id })}
          onAppHome={goAppHome}
        />
      )}
      {view.mode === 'gallery' && <MadeByCredit />}
    </div>
  );
}

export default App;
