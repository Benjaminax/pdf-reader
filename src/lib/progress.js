const PREFIX = 'pdflibro:progress:';

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function keyFor(source) {
  if (typeof source === 'string') {
    // URL: se identifica por un hash de la URL
    return `${PREFIX}url:${simpleHash(source)}`;
  }
  // File: nombre + tamaño
  return `${PREFIX}${source.name}:${source.size}`;
}

/** Devuelve { page, updatedAt } o null. `page` es índice base 0. */
export function loadProgress(file) {
  try {
    const raw = localStorage.getItem(keyFor(file));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.page !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveProgress(file, page, numPages) {
  try {
    localStorage.setItem(
      keyFor(file),
      JSON.stringify({ page, numPages, updatedAt: Date.now() })
    );
  } catch {
    // localStorage lleno o no disponible: ignorar
  }
}
