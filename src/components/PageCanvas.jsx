import { forwardRef, useEffect, useRef } from 'react';
import PageAnnotations from './PageAnnotations.jsx';

/**
 * Individual book page component. Lazily renders PDF page onto canvas.
 */
const PageCanvas = forwardRef(function PageCanvas(
  {
    pdf,
    pageNumber,
    width,
    height,
    shouldRender,
    annotations,
    transparentAnnotations,
    placingMode,
    editSignal,
    readingMode,
    onAddAnnotation,
    onUpdateAnnotation,
    onDeleteAnnotation,
  },
  ref
) {
  const canvasRef = useRef(null);
  const taskRef = useRef(null);

  useEffect(() => {
    if (!shouldRender || !pdf) return undefined;

    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return null;
        const base = page.getViewport({ scale: 1 });
        const scale = (width * dpr) / base.width;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const task = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
        });
        taskRef.current = task;
        return task.promise;
      })
      .catch((err) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      });

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
      taskRef.current = null;
    };
  }, [pdf, pageNumber, width, height, shouldRender]);

  return (
    <div
      ref={ref}
      className={`page mode-${readingMode || 'normal'}`}
      style={{ width, height }}
      data-page-number={pageNumber}
    >
      {shouldRender ? (
        <>
          <canvas ref={canvasRef} className={`page-canvas mode-${readingMode || 'normal'}`} />
          <PageAnnotations
            pageNumber={pageNumber}
            width={width}
            height={height}
            annotations={annotations}
            transparent={transparentAnnotations}
            placingMode={placingMode}
            editSignal={editSignal}
            onAdd={onAddAnnotation}
            onUpdate={onUpdateAnnotation}
            onDelete={onDeleteAnnotation}
          />
        </>
      ) : (
        <div className="page-placeholder">
          <span>{pageNumber}</span>
        </div>
      )}
    </div>
  );
});

export default PageCanvas;
