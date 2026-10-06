export default function BottomNav({
  view,
  hasActiveReader,
  onSelectLibrary,
  onSelectRecent,
  onSelectReader,
  onOpenAddModal,
}) {
  return (
    <nav className="constant-bottom-nav" aria-label="Primary navigation">
      <button
        className={`bottom-nav-btn ${!hasActiveReader && view === 'library' ? 'selected' : ''}`}
        type="button"
        onClick={onSelectLibrary}
        title="My Library"
      >
        <span className="nav-icon" aria-hidden="true">📚</span>
        <span className="nav-label">Library</span>
      </button>

      <button
        className={`bottom-nav-btn ${!hasActiveReader && view === 'recent' ? 'selected' : ''}`}
        type="button"
        onClick={onSelectRecent}
        title="Recently Opened"
      >
        <span className="nav-icon" aria-hidden="true">⏱️</span>
        <span className="nav-label">Recent</span>
      </button>

      {hasActiveReader && (
        <button
          className="bottom-nav-btn selected"
          type="button"
          onClick={onSelectReader}
          title="Active Reader"
        >
          <span className="nav-icon" aria-hidden="true">📖</span>
          <span className="nav-label">Reader</span>
        </button>
      )}

      <button
        className="bottom-nav-btn"
        type="button"
        onClick={onOpenAddModal}
        title="Add PDF File"
      >
        <span className="nav-icon" aria-hidden="true">➕</span>
        <span className="nav-label">Add PDF</span>
      </button>
    </nav>
  );
}
