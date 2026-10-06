import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { loadPdf } from '../lib/pdf.js';
import { loadProgress, saveProgress } from '../lib/progress.js';
import { loadAnnotations, saveAnnotations } from '../lib/annotations.js';
import Toolbar from './Toolbar.jsx';
import PageCanvas from './PageCanvas.jsx';
import ThumbnailSidebar from './ThumbnailSidebar.jsx';
import AnnotationsSidebar from './AnnotationsSidebar.jsx';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const PORTRAIT_MAX_WIDTH = 600; // px: single page view threshold
const RENDER_BEHIND = 6;
const RENDER_AHEAD = 8;

function getSourceName(source) {
  if (typeof source === 'string') {
    const driveMatch = source.match(/^\/api\/drive\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return `Google Drive PDF (${driveMatch[1].slice(0, 8)}…)`;
    }
    try {
      const url = new URL(source);
      const name = url.pathname.split('/').pop();
      return name || source;
    } catch {
      return source;
    }
  }
  return source.name;
}

function getLoadingLabel(source) {
  if (typeof source === 'string') {
    return 'Loading remote PDF…';
  }
  return `Loading «${source.name}»…`;
}

export default function Reader({ source, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(null);
  const [pageAspect, setPageAspect] = useState(Math.SQRT2); // height / width (~A4)
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState('screen'); // 'screen' | 'width'
  const [readingMode, setReadingMode] = useState('normal'); // 'normal' | 'sepia' | 'dark'
  const [showThumbs, setShowThumbs] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 });
  const [pdfTitle, setPdfTitle] = useState(null);

  // Notes and Bookmarks
  const [annotations, setAnnotations] = useState([]);
  const [placingMode, setPlacingMode] = useState(null); // null | 'note' | 'bookmark'
  const [transparentAnnotations, setTransparentAnnotations] = useState(false);

  // Editing signal from sidebar
  const [editSignal, setEditSignal] = useState(null); // { id, text, ts }

  const flipBookRef = useRef(null);
  const areaRef = useRef(null);
  const sourceName = getSourceName(source);
  const loadingLabel = getLoadingLabel(source);

  // Load PDF Document
  useEffect(() => {
    let cancelled = false;
    let doc = null;

    loadPdf(source)
      .then(async ({ pdf, fileName }) => {
        doc = pdf;
        const first = await pdf.getPage(1);
        if (cancelled) return;
        const vp = first.getViewport({ scale: 1 });
        setPageAspect(vp.height / vp.width);
        setPdf(pdf);
        setNumPages(pdf.numPages);

        if (fileName) {
          setPdfTitle(fileName);
        } else {
          try {
            const meta = await pdf.getMetadata();
            let title = meta?.info?.Title;
            if (!title && meta?.metadata) {
              title = meta.metadata.get('dc:title') || meta.metadata.get('xmp:Title');
            }
            if (title && typeof title === 'string' && title.trim()) {
              setPdfTitle(title.trim());
            }
          } catch (err) {
            console.warn('[Reader] could not read PDF metadata:', err?.message || err);
          }
        }

        // Restore saved reading progress
        const saved = loadProgress(source);
        if (saved && saved.page > 0 && saved.page < pdf.numPages) {
          setCurrentPage(Math.floor(saved.page));
        }

        // Restore saved annotations
        const savedAnnotations = loadAnnotations(source);
        if (savedAnnotations.length) {
          setAnnotations(savedAnnotations);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          let msg = 'Could not open the PDF. It may be corrupted, protected, or unreachable.';
          if (err && err.name === 'TypeError' && /failed to fetch|networkerror|cors|cross-origin/i.test(String(err))) {
            msg = 'Unable to load PDF due to CORS restrictions. If this is a Google Drive link, ensure the file is publicly shared.';
          } else if (err && err.message) {
            msg = err.message;
          }
          setError(msg);
        }
      });

    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [source]);

  // Measure book area
  useEffect(() => {
    if (!pdf) return undefined;
    const el = areaRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setAreaSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pdf]);

  // Single page layout on narrow screens
  const portrait = areaSize.w > 0 && areaSize.w < PORTRAIT_MAX_WIDTH;
  const padding = portrait ? 16 : 40;

  // Page dimensions
  const { pageW, pageH } = useMemo(() => {
    const pad = portrait ? 16 : 40;
    const w = Math.max(areaSize.w - pad, 100);
    const h = Math.max(areaSize.h - pad, 100);
    const cols = portrait ? 1 : 2;
    let cw;
    if (fitMode === 'screen') {
      cw = Math.min(w / cols, h / pageAspect);
    } else {
      cw = w / cols;
    }
    cw *= zoom;
    return { pageW: Math.round(cw), pageH: Math.round(cw * pageAspect) };
  }, [areaSize, pageAspect, zoom, fitMode, portrait]);

  const flipTo = useCallback((index) => {
    flipBookRef.current?.pageFlip()?.flip(index);
  }, []);

  const handleFlip = useCallback(
    (e) => {
      setCurrentPage(e.data);
      saveProgress(source, e.data, numPages);
    },
    [source, numPages]
  );

  const handlePrev = useCallback(
    () => flipBookRef.current?.pageFlip()?.flipPrev(),
    []
  );
  const handleNext = useCallback(
    () => flipBookRef.current?.pageFlip()?.flipNext(),
    []
  );

  // Keyboard navigation & Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setPlacingMode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, handlePrev]);

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))),
    []
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))),
    []
  );
  const zoomReset = useCallback(() => setZoom(1), []);

  // Annotations CRUD
  const addAnnotation = useCallback((ann) => {
    setAnnotations((prev) => {
      const next = [...prev, ann];
      saveAnnotations(source, next);
      return next;
    });
    setPlacingMode(null);
  }, [source]);

  const updateAnnotation = useCallback((id, patch) => {
    setAnnotations((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      saveAnnotations(source, next);
      return next;
    });
  }, [source]);

  const deleteAnnotation = useCallback((id) => {
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAnnotations(source, next);
      return next;
    });
  }, [source]);

  const togglePlacingNote = useCallback(() => {
    setPlacingMode((m) => (m === 'note' ? null : 'note'));
  }, []);

  const togglePlacingBookmark = useCallback(() => {
    setPlacingMode((m) => (m === 'bookmark' ? null : 'bookmark'));
  }, []);

  const toggleTransparent = useCallback(() => {
    setTransparentAnnotations((t) => !t);
  }, []);

  const requestEdit = useCallback((id, text) => {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    setEditSignal({ id, text: text || '', ts: Date.now() });
  }, [annotations]);

  const placingModeRef = useRef(placingMode);
  useEffect(() => { placingModeRef.current = placingMode; }, [placingMode]);

  const addAnnotationRef = useRef(addAnnotation);
  useEffect(() => { addAnnotationRef.current = addAnnotation; }, [addAnnotation]);

  const requestEditRef = useRef(requestEdit);
  useEffect(() => { requestEditRef.current = requestEdit; }, [requestEdit]);

  // Pointer listener for adding annotations on click
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (!placingModeRef.current) return;
      const pageEl = e.target.closest('.page');
      if (!pageEl) return;

      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();

      const pageNumber = parseInt(pageEl.dataset.pageNumber, 10);
      if (!pageNumber) return;

      const rect = pageEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      if (placingModeRef.current === 'note') {
        addAnnotationRef.current({
          id,
          pageNumber,
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          type: 'note',
          text: '',
          createdAt: Date.now(),
        });
        requestEditRef.current(id, '');
      } else if (placingModeRef.current === 'bookmark') {
        addAnnotationRef.current({
          id,
          pageNumber,
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          type: 'bookmark',
          text: '🔖',
          createdAt: Date.now(),
        });
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  if (error) {
    return (
      <div className="reader-status">
        <p>{error}</p>
        <button type="button" className="tb-btn" onClick={onClose}>
          ← Library
        </button>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="reader-status">
        <div className="spinner" aria-hidden="true" />
        <p>{loadingLabel}</p>
      </div>
    );
  }

  const dimsKey = `${pageW}x${pageH}-${portrait ? 'p' : 'l'}`;
  const rangeLo = Math.max(0, currentPage - RENDER_BEHIND);
  const rangeHi = Math.min(numPages - 1, currentPage + RENDER_AHEAD);
  const spreadW = portrait ? pageW : pageW * 2;

  return (
    <div className={`reader reading-theme-${readingMode}`}>
      <Toolbar
        fileName={pdfTitle || sourceName}
        page={currentPage}
        numPages={numPages}
        portrait={portrait}
        zoom={zoom}
        fitMode={fitMode}
        showThumbs={showThumbs}
        showAnnotations={showAnnotations}
        placingMode={placingMode}
        transparentAnnotations={transparentAnnotations}
        readingMode={readingMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onGoto={flipTo}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onFitChange={setFitMode}
        onToggleThumbs={() => setShowThumbs((s) => !s)}
        onToggleAnnotations={() => setShowAnnotations((s) => !s)}
        onToggleNote={togglePlacingNote}
        onToggleBookmark={togglePlacingBookmark}
        onToggleTransparent={toggleTransparent}
        onReadingModeChange={setReadingMode}
        onClose={onClose}
      />

      <div className="reader-body">
        {showThumbs && (
          <ThumbnailSidebar
            pdf={pdf}
            numPages={numPages}
            currentPage={currentPage}
            portrait={portrait}
            onSelect={flipTo}
          />
        )}

        <div className={`book-area${placingMode ? ' placing' : ''}`} ref={areaRef}>
          <div
            className="book-scroll"
            style={{
              width: spreadW + padding,
              height: pageH + padding,
            }}
          >
            <HTMLFlipBook
              key={dimsKey}
              ref={flipBookRef}
              width={pageW}
              height={pageH}
              size="fixed"
              usePortrait={portrait}
              showCover={!portrait}
              drawShadow
              maxShadowOpacity={0.45}
              flippingTime={600}
              startPage={currentPage}
              onFlip={handleFlip}
              mobileScrollSupport
              className="book"
            >
              {Array.from({ length: numPages }, (_, i) => (
                <PageCanvas
                  key={i}
                  pdf={pdf}
                  pageNumber={i + 1}
                  width={pageW}
                  height={pageH}
                  shouldRender={i >= rangeLo && i <= rangeHi}
                  annotations={annotations}
                  transparentAnnotations={transparentAnnotations}
                  placingMode={placingMode}
                  editSignal={editSignal}
                  readingMode={readingMode}
                  onAddAnnotation={addAnnotation}
                  onUpdateAnnotation={updateAnnotation}
                  onDeleteAnnotation={deleteAnnotation}
                />
              ))}
            </HTMLFlipBook>
          </div>
        </div>

        {showAnnotations && (
          <AnnotationsSidebar
            annotations={annotations}
            numPages={numPages}
            currentPage={currentPage}
            onSelect={flipTo}
            onDelete={deleteAnnotation}
            onRequestEdit={requestEdit}
          />
        )}
      </div>
    </div>
  );
}
