const PREFIX = 'pdflibro:annotations:';

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function keyFor(source) {
  if (typeof source === 'string') {
    return `${PREFIX}url:${simpleHash(source)}`;
  }
  return `${PREFIX}${source.name}:${source.size}`;
}

/** @returns {Array<{id:string,pageNumber:number,x:number,y:number,type:'note'|'bookmark',text:string,createdAt:number}>} */
export function loadAnnotations(source) {
  try {
    const raw = localStorage.getItem(keyFor(source));
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function saveAnnotations(source, annotations) {
  try {
    localStorage.setItem(keyFor(source), JSON.stringify(annotations));
  } catch {
    // localStorage lleno o no disponible: ignorar
  }
}
