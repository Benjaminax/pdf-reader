import { useEffect, useRef, useState } from 'react';

const THUMB_WIDTH = 140;

function Thumbnail({ pdf, pageNumber, active, onSelect }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Render perezoso: solo cuando la miniatura se acerca al viewport del panel
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !pdf) return undefined;
    let cancelled = false;

    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return null;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
        const canvas = canvasRef.current;
        if (!canvas) return null;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        return page.render({ canvasContext: canvas.getContext('2d'), viewport })
          .promise;
      })
      .catch(() => {
        /* miniatura no crítica */
      });

    return () => {
      cancelled = true;
    };
  }, [visible, pdf, pageNumber]);

  return (
    <button
      ref={wrapRef}
      type="button"
      className={`thumb ${active ? 'active' : ''}`}
      onClick={() => onSelect(pageNumber - 1)}
      title={`Go to page ${pageNumber}`}
    >
      <span className="thumb-img">
        {visible ? <canvas ref={canvasRef} /> : <span className="thumb-skeleton" />}
      </span>
      <span className="thumb-num">{pageNumber}</span>
    </button>
  );
}

export default function ThumbnailSidebar({
  pdf,
  numPages,
  currentPage,
  portrait,
  onSelect,
}) {
  // Resalta la página actual y su pareja en la doble página
  const isActive = (index) => {
    if (portrait) return index === currentPage;
    if (index === currentPage) return true;
    if (currentPage === 0) return false;
    const pair = currentPage % 2 === 1 ? currentPage + 1 : currentPage - 1;
    return index === pair;
  };

  return (
    <aside className="thumbs-panel" aria-label="Miniaturas">
      {Array.from({ length: numPages }, (_, i) => (
        <Thumbnail
          key={i}
          pdf={pdf}
          pageNumber={i + 1}
          active={isActive(i)}
          onSelect={onSelect}
        />
      ))}
    </aside>
  );
}
