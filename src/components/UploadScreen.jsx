import { useState, useRef, useEffect } from 'react';
import { loadProgress } from '../lib/progress.js';
import { resolvePdfUrl } from '../lib/pdf.js';
import { createSampleBook, createSampleComic } from '../lib/samplePdf.js';

const coverThemes = ['cover-fern', 'cover-coral', 'cover-blue', 'cover-ochre', 'cover-ink'];

function coverTheme(title) {
  return coverThemes[title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % coverThemes.length];
}

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function BookCard({ book, viewMode, onOpen, onDelete }) {
  const progress = loadProgress({ name: book.fileName, size: book.size });
  const percent = progress?.numPages
    ? Math.min(100, Math.round(((progress.page + 1) / progress.numPages) * 100))
    : 0;

  const isCompleted = percent >= 95;
  const inProgress = percent > 0 && percent < 95;

  if (viewMode === 'list') {
    return (
      <article className="shelf-book-list">
        <button
          className={`book-cover-mini ${coverTheme(book.title)}`}
          onClick={() => onOpen(book)}
          type="button"
          title={`Open ${book.title}`}
        >
          <span>PV</span>
        </button>
        <div className="book-list-info">
          <button className="book-list-title" type="button" onClick={() => onOpen(book)}>
            {book.title}
          </button>
          <p className="book-list-meta">
            PDF · {formatSize(book.size)}
            {progress?.numPages ? ` · Page ${progress.page + 1} of ${progress.numPages}` : ''}
          </p>
        </div>
        <div className="book-list-progress">
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
          <span className="percent-text">{percent ? `${percent}%` : 'Unread'}</span>
        </div>
        <button
          className="book-more"
          type="button"
          aria-label={`Remove ${book.title}`}
          title="Remove from library"
          onClick={() => onDelete(book)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 7h15M9 7V4.8h6V7m2.5 0-.8 12H7.3L6.5 7m3.5 3v5m4-5v5" />
          </svg>
        </button>
      </article>
    );
  }

  return (
    <article className="shelf-book">
      <button className={`book-cover ${coverTheme(book.title)}`} onClick={() => onOpen(book)} type="button">
        <span className="cover-spine" />
        <span className="cover-mark" aria-hidden="true">PV</span>
        {isCompleted && <span className="cover-badge completed">Completed</span>}
        {inProgress && <span className="cover-badge reading">In Progress</span>}
        <span className="cover-title">{book.title}</span>
        <span className="cover-rule" aria-hidden="true" />
        <span className="cover-type">DIGITAL EDITION</span>
      </button>
      <div className="book-details">
        <div className="book-heading">
          <button className="book-title" type="button" onClick={() => onOpen(book)} title={book.title}>
            {book.title}
          </button>
          <button
            className="book-more"
            type="button"
            aria-label={`Remove ${book.title}`}
            title="Remove from library"
            onClick={() => onDelete(book)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 7h15M9 7V4.8h6V7m2.5 0-.8 12H7.3L6.5 7m3.5 3v5m4-5v5" />
            </svg>
          </button>
        </div>
        <p className="book-meta">PDF · {formatSize(book.size)}</p>
        <div className="book-progress-row">
          <span>{percent ? `${percent}% read` : 'Not started'}</span>
          {progress?.numPages && <span>Page {progress.page + 1} of {progress.numPages}</span>}
        </div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
      </div>
    </article>
  );
}

export default function LibraryScreen({
  books,
  totalBooks,
  loading,
  query,
  view,
  error,
  inputRef,
  showAddModal: externalShowAddModal,
  setShowAddModal: externalSetShowAddModal,
  onQueryChange,
  onViewChange,
  onImport,
  onOpen,
  onDelete,
}) {
  const [internalShowAddModal, setInternalShowAddModal] = useState(false);
  const showAddModal = externalShowAddModal !== undefined ? externalShowAddModal : internalShowAddModal;
  const setShowAddModal = externalSetShowAddModal || setInternalShowAddModal;

  const [addTab, setAddTab] = useState('file'); // 'file' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [sortBy, setSortBy] = useState('added'); // 'added' | 'title' | 'progress'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'reading' | 'completed'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const modalRef = useRef(null);

  const recentBook = books.find((book) => book.openedAt);

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    if (showAddModal) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showAddModal, setShowAddModal]);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    setUrlLoading(true);
    setModalError('');
    try {
      const resolved = resolvePdfUrl(url);
      const res = await fetch(resolved);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Could not fetch PDF.`);
      const blob = await res.blob();

      let filename = url.split('/').pop().split('?')[0] || 'Remote Book.pdf';
      if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

      const file = new File([blob], filename, { type: 'application/pdf' });
      if (onImport) await onImport(file);
      setShowAddModal(false);
      setUrlInput('');
    } catch (err) {
      setModalError(err.message || 'Failed to load PDF from URL.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleAddSampleBook = async () => {
    setUrlLoading(true);
    setModalError('');
    try {
      const sampleFile = await createSampleBook();
      if (onImport) await onImport(sampleFile);
      setShowAddModal(false);
    } catch (err) {
      setModalError('Could not generate sample book: ' + err.message);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleAddSampleComic = async () => {
    setUrlLoading(true);
    setModalError('');
    try {
      const comicFile = await createSampleComic();
      if (onImport) await onImport(comicFile);
      setShowAddModal(false);
    } catch (err) {
      setModalError('Could not generate sample comic: ' + err.message);
    } finally {
      setUrlLoading(false);
    }
  };

  // Filter & Sort books
  const filteredAndSortedBooks = books
    .filter((book) => {
      if (filterStatus === 'all') return true;
      const progress = loadProgress({ name: book.fileName, size: book.size });
      const percent = progress?.numPages
        ? Math.min(100, Math.round(((progress.page + 1) / progress.numPages) * 100))
        : 0;
      if (filterStatus === 'reading') return percent > 0 && percent < 95;
      if (filterStatus === 'completed') return percent >= 95;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'progress') {
        const progA = loadProgress({ name: a.fileName, size: a.size });
        const progB = loadProgress({ name: b.fileName, size: b.size });
        const pctA = progA?.numPages ? progA.page / progA.numPages : 0;
        const pctB = progB?.numPages ? progB.page / progB.numPages : 0;
        return pctB - pctA;
      }
      return (b.addedAt || 0) - (a.addedAt || 0);
    });

  return (
    <main className="library-app">
      <header className="library-topbar">
        <a className="brand" href="#library" onClick={(e) => { e.preventDefault(); onViewChange('library'); }}>
          <img src="/icons/icon.svg" className="brand-logo-img" alt="PAGE.verse Logo" />
          <span className="brand-text">PAGE<span className="brand-accent">.verse</span></span>
        </a>
        <div className="topbar-actions">
          <label className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.4" />
              <path d="m16 16 4.2 4.2" />
            </svg>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search library..."
              aria-label="Search your library"
            />
            <kbd>/</kbd>
          </label>

          <button className="add-book-button" type="button" onClick={() => setShowAddModal(true)}>
            <span className="plus-icon" aria-hidden="true">＋</span>
            <span className="add-btn-text">Add Title</span>
          </button>
        </div>
      </header>

      <div className="library-layout">
        <aside className="library-rail" aria-label="Library navigation">
          <span className="rail-label">YOUR LIBRARY</span>
          <button
            className={`rail-link ${view === 'library' ? 'selected' : ''}`}
            type="button"
            onClick={() => onViewChange('library')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H14v16h4.5a1.5 1.5 0 0 0 1.5-1.5z" />
            </svg>
            <span>My Library</span>
            <b>{totalBooks}</b>
          </button>

          <button
            className={`rail-link ${view === 'recent' ? 'selected' : ''}`}
            type="button"
            onClick={() => onViewChange('recent')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7v5l3.5 2" />
            </svg>
            <span>Recently Opened</span>
          </button>

          <div className="rail-divider" />

          <div className="rail-filters">
            <span className="rail-label">STATUS</span>
            <button
              className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
              type="button"
            >
              All Titles
            </button>
            <button
              className={`filter-chip ${filterStatus === 'reading' ? 'active' : ''}`}
              onClick={() => setFilterStatus('reading')}
              type="button"
            >
              In Progress
            </button>
            <button
              className={`filter-chip ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('completed')}
              type="button"
            >
              Completed
            </button>
          </div>

          <div className="rail-divider" />
          <div className="local-note">
            <span className="local-indicator" />Stored on Device
          </div>
        </aside>

        <section className="library-content">
          <div className="library-heading-row">
            <div>
              <p className="eyebrow">DIGITAL READER & COMICS</p>
              <h1>{view === 'recent' ? 'Recently Opened' : 'Reading Room'}</h1>
              <p className="library-subtitle">Interactive PDF books & digital comics with page-flip animation.</p>
            </div>
            <div className="collection-count">
              <strong>{totalBooks.toString().padStart(2, '0')}</strong>
              <span>TITLES<br />SAVED</span>
            </div>
          </div>

          {recentBook && view === 'library' && (
            <button className="continue-reading" type="button" onClick={() => onOpen(recentBook)}>
              <span className="continue-icon" aria-hidden="true">📖</span>
              <span>
                <small>CONTINUE READING</small>
                <strong>{recentBook.title}</strong>
                <em>Tap to resume reading page-turning view</em>
              </span>
              <span className="continue-arrow" aria-hidden="true">➔</span>
            </button>
          )}

          <div className="shelf-toolbar">
            <div className="shelf-toolbar-left">
              <h2>{view === 'recent' ? 'Recently Opened' : 'All Titles'}</h2>
              <span>{visibleCountLabel(filteredAndSortedBooks.length)}</span>
            </div>

            <div className="shelf-controls">
              <div className="sort-group">
                <label htmlFor="sort-select">Sort:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="shelf-select"
                >
                  <option value="added">Recently Added</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="progress">Reading Progress</option>
                </select>
              </div>

              <div className="view-toggle">
                <button
                  className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  type="button"
                  title="Grid View"
                >
                  ▦
                </button>
                <button
                  className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  type="button"
                  title="List View"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {error && <p className="library-error" role="alert">{error}</p>}

          {loading ? (
            <div className="shelf-loading">
              <span className="loading-dot" />Opening library…
            </div>
          ) : filteredAndSortedBooks.length ? (
            <div className={viewMode === 'list' ? 'book-list-container' : 'book-grid'}>
              {filteredAndSortedBooks.map((book) => (
                <BookCard key={book.id} book={book} viewMode={viewMode} onOpen={onOpen} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <div className="empty-shelf">
              <div className="empty-illustration" aria-hidden="true">
                <img src="/icons/icon.svg" className="empty-logo-img" alt="" />
              </div>
              <p className="eyebrow">YOUR SHELF IS READY</p>
              <h2>{query ? 'No matching titles found' : 'Add your first book or comic'}</h2>
              <p>
                {query
                  ? 'Try adjusting your search terms or filter settings.'
                  : 'Import a PDF book or digital comic to open and read it instantly.'}
              </p>
              {!query && (
                <div className="empty-actions">
                  <button className="add-book-button" type="button" onClick={() => setShowAddModal(true)}>
                    <span className="plus-icon" aria-hidden="true">＋</span> Add PDF File
                  </button>
                  <button className="sample-book-button" type="button" onClick={handleAddSampleBook}>
                    ✨ Try Sample Book
                  </button>
                  <button className="sample-book-button" type="button" onClick={handleAddSampleComic}>
                    🎨 Try Sample Comic
                  </button>
                </div>
              )}
            </div>
          )}

          <footer className="library-footer">
            <span>PAGE.verse · DIGITAL READER</span>
            <span>{totalBooks ? `${totalBooks} ${totalBooks === 1 ? 'title' : 'titles'} stored locally` : 'Horizontal page-turn viewer'}</span>
          </footer>
        </section>
      </div>

      {/* Add PDF / Comic Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-card"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <h2 id="modal-title">Load Book or Comic</h2>
              <button className="close-btn" type="button" onClick={() => setShowAddModal(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`tab-btn ${addTab === 'file' ? 'active' : ''}`}
                onClick={() => setAddTab('file')}
                type="button"
              >
                📁 Local PDF File
              </button>
              <button
                className={`tab-btn ${addTab === 'url' ? 'active' : ''}`}
                onClick={() => setAddTab('url')}
                type="button"
              >
                🔗 Web URL / Drive
              </button>
            </div>

            <div className="modal-body">
              {modalError && <div className="modal-error">{modalError}</div>}

              {addTab === 'file' ? (
                <div
                  className={`modal-dropzone ${dragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      if (onImport) onImport(file);
                      setShowAddModal(false);
                    }
                  }}
                  onClick={() => inputRef.current?.click()}
                >
                  <svg className="drop-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                  </svg>
                  <p><strong>Click to choose file</strong> or drop PDF book/comic here</p>
                  <span className="drop-hint">Opens immediately after loading</span>
                </div>
              ) : (
                <form className="url-form" onSubmit={handleUrlSubmit}>
                  <label htmlFor="url-input" className="url-label">
                    Paste public PDF or Google Drive link:
                  </label>
                  <div className="url-input-row">
                    <input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com/document.pdf"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      required
                    />
                    <button className="add-book-button" type="submit" disabled={urlLoading}>
                      {urlLoading ? 'Loading...' : 'Load & Open'}
                    </button>
                  </div>
                  <p className="url-hint">
                    Ensures the PDF opens in reader immediately after fetching.
                  </p>
                </form>
              )}

              <div className="modal-footer-sample">
                <span>Want to test immediately?</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button className="sample-link-btn" type="button" onClick={handleAddSampleBook} disabled={urlLoading}>
                    ✨ "The Art of Reading" Book
                  </button>
                  <button className="sample-link-btn" type="button" onClick={handleAddSampleComic} disabled={urlLoading}>
                    🎨 "Chronicles of Verse" Comic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function visibleCountLabel(count) {
  return `${count} ${count === 1 ? 'title' : 'titles'}`;
}
