import { useEffect, useLayoutEffect, useState } from 'react';

// Mapa global para evitar procesar la misma señal más de una vez
const processedSignals = new Map();

/**
 * Overlay interactivo sobre cada página del PDF.
 * Muestra notas y marcadores posicionados libremente,
 * permite editar/borra existentes.
 *
 * En modo normal las anotaciones son elementos sueltos position:absolute
 * dentro del .page padre (no hay un contenedor bloqueante).
 */
export default function PageAnnotations({
  pageNumber,
  annotations,
  transparent,
  editSignal,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftText, setDraftText] = useState('');

  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);

  // Activar edición cuando viene una solicitud global (desde panel lateral)
  useLayoutEffect(() => {
    if (!editSignal) return;
    const lastTs = processedSignals.get(editSignal.id);
    if (lastTs && lastTs >= editSignal.ts) return;
    const target = pageAnnotations.find((a) => a.id === editSignal.id);
    if (target) {
      processedSignals.set(editSignal.id, editSignal.ts);
      setEditingId(editSignal.id);
      setDraftText(editSignal.text || '');
    }
  }, [editSignal, pageAnnotations]);

  // Listener nativo en fase de captura sobre el documento para interceptar
  // clicks en anotaciones y evitar que react-pageflip cambie de página.
  useEffect(() => {
    const handleDown = (e) => {
      const annEl = e.target.closest('.annotation');
      if (!annEl) return;
      const id = annEl.dataset.annId;
      const ann = pageAnnotations.find((a) => a.id === id);
      if (!ann) return;
      e.stopPropagation();
      e.preventDefault();
      if (ann.type === 'note') {
        setEditingId(ann.id);
        setDraftText(ann.text || '');
      }
    };
    document.addEventListener('pointerdown', handleDown, true);
    document.addEventListener('mousedown', handleDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleDown, true);
      document.removeEventListener('mousedown', handleDown, true);
    };
  }, [pageAnnotations]);

  const commitEdit = () => {
    if (editingId) {
      onUpdate(editingId, { text: draftText.trim() });
    }
    setEditingId(null);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <>
      {pageAnnotations.map((ann) => {
        const left = ann.x * 100;
        const top = ann.y * 100;
        const isEditing = editingId === ann.id;

        return (
          <div
            key={ann.id}
            data-ann-id={ann.id}
            className={`annotation annotation-${ann.type}${isEditing ? ' editing' : ''}${transparent ? ' transparent' : ''}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            title={ann.type === 'bookmark' ? 'Bookmark' : ann.text || 'Note'}
          >
            {ann.type === 'bookmark' ? (
              <span className="annotation-icon">🔖</span>
            ) : isEditing ? (
              <input
                className="annotation-input"
                autoFocus
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={handleKey}
                onBlur={commitEdit}
                placeholder="Write your note..."
              />
            ) : (
              <span className="annotation-text">{ann.text || '…'}</span>
            )}

            {!isEditing && (
              <button
                className="annotation-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(ann.id);
                }}
                title="Delete annotation"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
