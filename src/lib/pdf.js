import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100 MB
const PDF_MAGIC = /%PDF-1\.[0-9]|%PDF-2\.[0-9]/;
const ALLOWED_PDF_TYPES = new Set([
  'application/pdf',
  'application/octet-stream',
  'binary/octet-stream',
]);

/**
 * Detecta si una URL pertenece a Google Drive.
 */
export function isGoogleDriveUrl(url) {
  return /drive\.google\.com/.test(url);
}

/**
 * Extrae el FILE_ID de una URL de Google Drive.
 */
export function extractGoogleDriveFileId(url) {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  return null;
}

/**
 * Resuelve una URL de entrada a la ruta que usará el frontend.
 * Para Google Drive devuelve la ruta del proxy local.
 */
export function resolvePdfUrl(url) {
  const id = extractGoogleDriveFileId(url);
  if (id) {
    return `/api/drive/${id}`;
  }
  return url;
}

function assertSize(size, label) {
  if (size && size > MAX_PDF_SIZE) {
    throw new Error(
      `${label} is too large. Maximum allowed size is ${Math.round(
        MAX_PDF_SIZE / 1024 / 1024
      )} MB.`
    );
  }
}

function isValidPdfHeader(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer, 0, 1024);
  // PDFs empiezan con "%PDF-x.y" en los primeros bytes.
  const header = new TextDecoder().decode(bytes.slice(0, 8));
  return PDF_MAGIC.test(header);
}

async function fetchViaProxy(url) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Proxy error ${res.status}: ${text || res.statusText}`);
  }
  return res;
}

/**
 * Extrae el nombre de archivo desde el header Content-Disposition.
 * Se sanitiza para evitar caracteres de control y path traversal.
 */
function extractFileName(headers) {
  const cd = headers.get('content-disposition');
  if (!cd) return null;
  // Soporta: filename="name.pdf" o filename*=UTF-8''name.pdf
  const match = cd.match(/filename\*?=\s*(?:UTF-\d+['"]*)?([^;\n]*)/i);
  if (!match) return null;
  let name = match[1].replace(/['"]/g, '').trim();
  try {
    name = decodeURIComponent(name);
  } catch {
    // ignorar si no es URL-encoded
  }
  // Eliminar path traversal y caracteres de control.
  name = name.replace(/[\x00-\x1f\x7f]/g, '').replace(/\\|\//g, '_');
  return name || null;
}

function isPdfContentType(headers) {
  const ct = headers.get('content-type') || '';
  const normalized = ct.split(';')[0].trim().toLowerCase();
  return ALLOWED_PDF_TYPES.has(normalized) || normalized.endsWith('/pdf');
}

/**
 * Carga un PDF desde un File del navegador o desde una URL pública.
 * Devuelve { pdf, fileName } donde fileName viene del header Content-Disposition
 * o del nombre del archivo local.
 * Las URLs de Google Drive siempre pasan por el proxy local.
 * Las URLs genéricas intentan directo primero y recurren al proxy si falla CORS.
 * Si el PDF está protegido con contraseña, la pide mediante un prompt.
 */
export async function loadPdf(source) {
  let data;
  let fileName = null;

  if (typeof source === 'string') {
    let response;

    if (isGoogleDriveUrl(source)) {
      // Google Drive: usar nuestro proxy local directamente
      try {
        response = await fetch(source);
      } catch (err) {
        throw new Error(
          'Unable to load the Google Drive file. Make sure it is publicly shared and the server is running.'
        );
      }
    } else {
      // URL genérica: intentar directo, si falla usar proxy local
      try {
        response = await fetch(source);
      } catch {
        try {
          response = await fetchViaProxy(source);
        } catch (proxyErr) {
          throw new Error(
            `Unable to load PDF. The server may not allow cross-origin requests. ${proxyErr.message}`
          );
        }
      }
    }

    if (!response.ok) {
      throw new Error(
        `Failed to load PDF (${response.status}). Make sure the file is publicly accessible.`
      );
    }

    const contentLength = response.headers.get('content-length');
    assertSize(contentLength ? Number(contentLength) : null, 'Remote file');

    if (!isPdfContentType(response.headers)) {
      console.warn(
        '[loadPdf] unexpected content-type:',
        response.headers.get('content-type')
      );
    }

    fileName = extractFileName(response.headers);
    data = await response.arrayBuffer();
  } else {
    fileName = source.name;
    assertSize(source.size, 'Local file');
    data = await source.arrayBuffer();
  }

  if (!isValidPdfHeader(data)) {
    throw new Error(
      'The file does not look like a valid PDF. Please check the file or URL.'
    );
  }

  if (data.byteLength > MAX_PDF_SIZE) {
    throw new Error(
      `PDF is too large. Maximum allowed size is ${Math.round(
        MAX_PDF_SIZE / 1024 / 1024
      )} MB.`
    );
  }

  // isEvalSupported: false mitiga CVE-2024-4367 y bloquea eval() dentro del worker.
  const task = pdfjs.getDocument({ data, isEvalSupported: false });

  task.onPassword = (updatePassword, reason) => {
    const message =
      reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD
        ? 'Wrong password. Try again:'
        : 'This PDF is protected. Enter the password:';
    const pw = window.prompt(message);
    if (pw === null) {
      task.destroy();
      return;
    }
    updatePassword(pw);
  };

  const pdf = await task.promise;
  return { pdf, fileName };
}
