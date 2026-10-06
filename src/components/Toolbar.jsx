import { useEffect, useState } from 'react';

export default function Toolbar({
  fileName,
  page,
  numPages,
  portrait,
  zoom,
  fitMode,
  showThumbs,
  showAnnotations,
  placingMode,
  transparentAnnotations,
  readingMode,
  onPrev,
  onNext,
  onGoto,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitChange,
  onToggleThumbs,
  onToggleAnnotations,
  onToggleNote,
  onToggleBookmark,
  onToggleTransparent,
  onReadingModeChange,
  onClose,
}) {
  const [value, setValue] = useState(String(page + 1));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  // Spread label
  let spreadLabel = null;
  if (!portrait && numPages > 0) {
    if (page === 0) {
      spreadLabel = 'Page 1';
    } else {
      const left = page % 2 === 1 ? page : page - 1;
      const right = Math.min(left + 1, numPages - 1);
      spreadLabel = left === right ? `Page ${left + 1}` : `Pages ${left + 1}–${right + 1}`;
    }
  }

  useEffect(() => {
    setValue(String(page + 1));
  }, [page]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const submitGoto = (e) => {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (Number.isInteger(n) && n >= 1 && n <= numPages) {
      onGoto(n - 1);
    } else {
      setValue(String(page + 1));
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-primary">
        <div className="toolbar-group toolbar-left">
          <button
            type="button"
            className="tb-btn back-btn"
            onClick={onClose}
            title="Return to library"
          >
            <span className="tb-btn-label-desktop">← Library</span>
            <span className="tb-btn-label-mobile">←</span>
          </button>
          <button
            type="button"
            className={`tb-btn ${showThumbs ? 'active' : ''}`}
            onClick={onToggleThumbs}
            title="Page thumbnails"
            aria-pressed={showThumbs}
          >
            <span className="tb-btn-label-desktop">▦ Pages</span>
            <span className="tb-btn-label-mobile">▦</span>
          </button>
          <button
            type="button"
            className={`tb-btn ${showAnnotations ? 'active' : ''}`}
            onClick={onToggleAnnotations}
            title="Notes & Bookmarks"
            aria-pressed={showAnnotations}
          >
            <span className="tb-btn-label-desktop">🗒 Notes</span>
            <span className="tb-btn-label-mobile">🗒</span>
          </button>
          <span className="toolbar-title" title={fileName}>
            {fileName}
          </span>
        </div>

        <div className="toolbar-group toolbar-nav">
          <button type="button" className="tb-btn nav-arrow" onClick={onPrev} title="Previous page">
            ◀
          </button>
          <form className="goto-form" onSubmit={submitGoto}>
            <input
              type="number"
              min={1}
              max={numPages}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setValue(String(page + 1))}
              aria-label="Go to page"
            />
            <span className="goto-total">/ {numPages}</span>
          </form>
          <button type="button" className="tb-btn nav-arrow" onClick={onNext} title="Next page">
            ▶
          </button>
          {spreadLabel && <span className="spread-label">{spreadLabel}</span>}
        </div>

        <div className="toolbar-group toolbar-desktop-actions">
          <div className="toolbar-annotations">
            <button
              type="button"
              className={`tb-btn ${placingMode === 'note' ? 'active' : ''}`}
              onClick={onToggleNote}
              title={placingMode === 'note' ? 'Cancel note' : 'Add note'}
              aria-pressed={placingMode === 'note'}
            >
              📝 {placingMode === 'note' ? 'Cancel' : 'Note'}
            </button>
            <button
              type="button"
              className={`tb-btn ${placingMode === 'bookmark' ? 'active' : ''}`}
              onClick={onToggleBookmark}
              title={placingMode === 'bookmark' ? 'Cancel bookmark' : 'Add bookmark'}
              aria-pressed={placingMode === 'bookmark'}
            >
              🔖 {placingMode === 'bookmark' ? 'Cancel' : 'Bookmark'}
            </button>
          </div>

          <select
            className="tb-select reading-mode-select"
            value={readingMode}
            onChange={(e) => onReadingModeChange(e.target.value)}
            title="Reading theme"
            aria-label="Reading theme"
          >
            <option value="normal">☀️ Light</option>
            <option value="sepia">📜 Sepia</option>
            <option value="dark">🌙 Night</option>
          </select>

          <div className="zoom-controls">
            <button type="button" className="tb-btn" onClick={onZoomOut} title="Zoom out">
              −
            </button>
            <button
              type="button"
              className="tb-btn tb-zoom"
              onClick={onZoomReset}
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="tb-btn" onClick={onZoomIn} title="Zoom in">
              +
            </button>
          </div>

          <button
            type="button"
            className={`tb-btn fs-btn ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? '⤓' : '⤢'}
          </button>
        </div>

        <button
          type="button"
          className="mobile-tools-toggle"
          onClick={() => setMobileToolsOpen((v) => !v)}
          title="More tools"
        >
          ⚙ Tools
        </button>
      </div>

      {mobileToolsOpen && (
        <div className="toolbar-mobile-drawer">
          <div className="mobile-drawer-row">
            <span>Theme:</span>
            <select
              className="tb-select"
              value={readingMode}
              onChange={(e) => onReadingModeChange(e.target.value)}
            >
              <option value="normal">☀️ Light</option>
              <option value="sepia">📜 Sepia</option>
              <option value="dark">🌙 Night</option>
            </select>
          </div>

          <div className="mobile-drawer-row">
            <span>Annotate:</span>
            <button
              type="button"
              className={`tb-btn ${placingMode === 'note' ? 'active' : ''}`}
              onClick={onToggleNote}
            >
              📝 Note
            </button>
            <button
              type="button"
              className={`tb-btn ${placingMode === 'bookmark' ? 'active' : ''}`}
              onClick={onToggleBookmark}
            >
              🔖 Bookmark
            </button>
          </div>

          <div className="mobile-drawer-row">
            <span>Zoom:</span>
            <button type="button" className="tb-btn" onClick={onZoomOut}>−</button>
            <button type="button" className="tb-btn" onClick={onZoomReset}>{Math.round(zoom * 100)}%</button>
            <button type="button" className="tb-btn" onClick={onZoomIn}>+</button>
          </div>
        </div>
      )}
    </header>
  );
}
