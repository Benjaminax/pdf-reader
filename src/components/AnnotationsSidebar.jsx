import { useMemo } from 'react';

export default function AnnotationsSidebar({
  annotations,
  numPages,
  currentPage,
  onSelect,
  onDelete,
  onRequestEdit,
}) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (let i = 1; i <= numPages; i++) map.set(i, []);
    for (const ann of annotations) {
      const list = map.get(ann.pageNumber) || [];
      list.push(ann);
      map.set(ann.pageNumber, list);
    }
    const result = [];
    for (let i = 1; i <= numPages; i++) {
      const list = map.get(i);
      if (list && list.length) {
        result.push({ pageNumber: i, items: list });
      }
    }
    return result;
  }, [annotations, numPages]);

  const total = annotations.length;

  const handleClick = (ann) => {
    onSelect(ann.pageNumber - 1);
    if (ann.type === 'note') {
      onRequestEdit?.(ann.id, ann.text);
    }
  };

  return (
    <div className="annotations-panel">
      <div className="annotations-header">
        <span>Notes</span>
        <span className="annotations-count">{total}</span>
      </div>

      {grouped.length === 0 ? (
        <div className="annotations-empty">
          There are no annotations yet.
          <br />
          Use 📝 Note or 🔖 Bookmark to add them.
        </div>
      ) : (
        <div className="annotations-list">
          {grouped.map(({ pageNumber, items }) => (
            <div key={pageNumber} className="annotations-group">
              <div className="annotations-group-title">
                Page {pageNumber}
                {currentPage + 1 === pageNumber && (
                  <span className="annotations-current"> (current)</span>
                )}
              </div>
              {items.map((ann) => (
                <button
                  key={ann.id}
                  className={`annotation-row annotation-row-${ann.type}`}
                  onClick={() => handleClick(ann)}
                  title={`Go to page ${pageNumber}${ann.type === 'note' ? ' and edit' : ''}`}
                >
                  <span className="annotation-row-icon">
                    {ann.type === 'bookmark' ? '🔖' : '📝'}
                  </span>
                  <span className="annotation-row-text">
                    {ann.type === 'bookmark'
                      ? 'Bookmark'
                      : ann.text || 'Note without text'}
                  </span>
                  <span
                    className="annotation-row-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(ann.id);
                    }}
                    title="Delete annotation"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
