import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LibraryScreen from './components/UploadScreen.jsx';
import Reader from './components/Reader.jsx';
import BottomNav from './components/BottomNav.jsx';
import { addBook, deleteBook, listBooks, readBook } from './lib/library.js';

export default function App() {
  const [source, setSource] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('library');
  const [showAddModal, setShowAddModal] = useState(false);
  const inputRef = useRef(null);

  const refreshBooks = useCallback(async () => {
    try {
      setBooks(await listBooks());
      setLibraryError('');
    } catch {
      setLibraryError('Your library could not be opened on this device.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshBooks(); }, [refreshBooks]);

  const handleClose = useCallback(() => {
    setSource(null);
    refreshBooks();
  }, [refreshBooks]);

  const handleImport = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLibraryError('Choose a PDF file to add it to your library.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setLibraryError('This file is larger than the 100 MB import limit.');
      return;
    }
    try {
      await addBook(file);
      setLibraryError('');
      await refreshBooks();
      setShowAddModal(false);
      // AUTOMATICALLY OPEN THE LOADED BOOK OR COMIC IMMEDIATELY!
      setSource(file);
    } catch {
      setLibraryError('This PDF could not be saved. Check available device storage and try again.');
    }
  }, [refreshBooks]);

  const handleOpen = useCallback(async (book) => {
    try {
      const file = await readBook(book.id);
      if (!file) throw new Error('Missing PDF');
      setSource(file);
    } catch {
      setLibraryError('This PDF could not be read from local storage.');
    }
  }, []);

  const handleDelete = useCallback(async (book) => {
    try {
      await deleteBook(book.id);
      await refreshBooks();
    } catch {
      setLibraryError('This PDF could not be removed from local storage.');
    }
  }, [refreshBooks]);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = books.filter((book) => book.title.toLowerCase().includes(normalizedQuery));
    return view === 'recent'
      ? filtered.filter((book) => book.openedAt).sort((a, b) => b.openedAt - a.openedAt)
      : filtered;
  }, [books, query, view]);

  return (
    <div className="app-container">
      {source ? (
        <Reader source={source} onClose={handleClose} />
      ) : (
        <LibraryScreen
          books={visibleBooks}
          totalBooks={books.length}
          loading={loading}
          query={query}
          view={view}
          error={libraryError}
          inputRef={inputRef}
          showAddModal={showAddModal}
          setShowAddModal={setShowAddModal}
          onQueryChange={setQuery}
          onViewChange={setView}
          onImport={handleImport}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      )}

      {/* CONSTANT ALWAYS-VISIBLE PINNED BOTTOM NAVIGATION BAR */}
      <BottomNav
        view={view}
        hasActiveReader={Boolean(source)}
        onSelectLibrary={() => {
          setSource(null);
          setView('library');
        }}
        onSelectRecent={() => {
          setSource(null);
          setView('recent');
        }}
        onSelectReader={() => {
          // Keep active reader visible
        }}
        onOpenAddModal={() => {
          if (source) {
            setSource(null);
          }
          setShowAddModal(true);
        }}
      />

      <input
        ref={inputRef}
        className="library-file-input"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          handleImport(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
