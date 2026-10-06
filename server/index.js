import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transform } from 'node:stream';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './db.js';
import readerApi from './routes/readerApi.js';

dotenv.config();

// Initialize MongoDB Database Connection
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use('/api/reader', readerApi);

const PORT = process.env.PORT || 2077;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configurar trust proxy cuando la app corre detrás de un reverse proxy.
// Valores válidos: 'true', un número (cantidad de proxies) o una lista CSV.
// Ejemplo: TRUST_PROXY=1  (Docker/nginx de un solo salto)
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY) {
  if (TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
  } else if (/^\d+$/.test(TRUST_PROXY)) {
    app.set('trust proxy', Number(TRUST_PROXY));
  } else {
    app.set('trust proxy', TRUST_PROXY.split(',').map((s) => s.trim()));
  }
}

const PROXY_TIMEOUT_MS = 30_000;
const MAX_PROXY_SIZE = 50 * 1024 * 1024; // 50 MB
const GOOGLE_DRIVE_FILE_ID_RE = /^[a-zA-Z0-9_-]+$/;

const ALLOWED_PROXY_DOMAINS = (process.env.ALLOWED_PROXY_DOMAINS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Rangos privados que nunca debe contactar el proxy.
const PRIVATE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  '0.0.0.0',
  '[::]',
]);

function isPrivateIp(ip) {
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) -> revalidar como IPv4
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPrivateIp(mapped[1]);

  // IPv4 privadas / reservadas (incluye 0.0.0.0/8 y CGNAT 100.64.0.0/10)
  if (
    /^(0\.|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.)/.test(
      ip
    )
  ) {
    return true;
  }
  // IPv6 loopback/unspecified/link-local/unique-local
  if (/^(::1$|::$|fc00:|fd00:|fe80:)/i.test(ip)) {
    return true;
  }
  return false;
}

/**
 * Custom DNS lookup usado por http(s).request: resuelve el hostname y
 * rechaza la conexión si CUALQUIER dirección resuelta es privada/reservada.
 * Esto evita DNS rebinding (un dominio público que resuelve a una IP interna),
 * ya que la IP validada aquí es la misma que se usa para conectar.
 */
function safeDnsLookup(hostname, optionsOrCallback, maybeCallback) {
  const hasOptions = typeof optionsOrCallback !== 'function';
  const options = hasOptions ? optionsOrCallback || {} : {};
  const callback = hasOptions ? maybeCallback : optionsOrCallback;

  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    for (const { address } of addresses) {
      if (isPrivateIp(address)) {
        return callback(new Error('DNS resolved to a disallowed private address'));
      }
    }
    if (options.all) {
      return callback(null, addresses);
    }
    const chosen = addresses[0];
    return callback(null, chosen.address, chosen.family);
  });
}

const MAX_PROXY_REDIRECTS = 5;

function requestOnce(urlObj, { signal, headers }) {
  return new Promise((resolve, reject) => {
    const lib = urlObj.protocol === 'https:' ? https : http;
    const req = lib.request(
      urlObj,
      {
        method: 'GET',
        lookup: safeDnsLookup,
        headers,
        signal,
      },
      resolve
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * fetch() con guardas SSRF: revalida CADA salto de redirección contra
 * isAllowedProxyUrl (fetch's redirect:'follow' seguiría redirecciones sin
 * revalidar, permitiendo que un servidor externo redirija a recursos
 * internos) y resuelve DNS de forma segura en cada salto.
 */
async function guardedFetch(initialUrl, { signal, headers = {} } = {}) {
  let currentUrl = initialUrl;
  for (let i = 0; i <= MAX_PROXY_REDIRECTS; i++) {
    if (!isAllowedProxyUrl(currentUrl)) {
      const err = new Error('Invalid or disallowed URL');
      err.code = 'DISALLOWED_URL';
      throw err;
    }
    const urlObj = new URL(currentUrl);
    const upstreamRes = await requestOnce(urlObj, { signal, headers });
    if (
      upstreamRes.statusCode >= 300 &&
      upstreamRes.statusCode < 400 &&
      upstreamRes.headers.location
    ) {
      upstreamRes.resume();
      currentUrl = new URL(upstreamRes.headers.location, urlObj).toString();
      continue;
    }
    return upstreamRes;
  }
  const err = new Error('Too many redirects');
  err.code = 'TOO_MANY_REDIRECTS';
  throw err;
}

function isAllowedProxyUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (PRIVATE_HOSTS.has(hostname) || PRIVATE_HOSTS.has(parsed.host)) {
    return false;
  }

  if (isPrivateIp(hostname)) {
    return false;
  }

  if (ALLOWED_PROXY_DOMAINS.length > 0) {
    const allowed = ALLOWED_PROXY_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!allowed) return false;
  }

  return true;
}

function safeErrorResponse(res, status, message) {
  res.status(status).json({ error: message });
}

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "blob:", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // el worker de pdf.js puede necesitar ajustes
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Rate limiting más estricto para el proxy
const proxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many proxy requests, please try again later.' },
});

/**
 * Proxy restringido: reenvía URLs públicas al cliente.
 * Útil para evitar CORS en el navegador, pero bloquea acceso a recursos
 * privados y fuerza la descarga como attachment para evitar XSS.
 */
app.get('/api/proxy', proxyLimiter, async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return safeErrorResponse(res, 400, 'Missing url parameter');
  }

  if (!isAllowedProxyUrl(url)) {
    return safeErrorResponse(res, 400, 'Invalid or disallowed URL');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstreamRes = await guardedFetch(url, {
      signal: controller.signal,
      headers: {
        // Evitar que el upstream reciba cookies/autenticación del servidor.
        Accept: 'application/pdf,application/octet-stream,*/*',
      },
    });

    clearTimeout(timeout);

    if (upstreamRes.statusCode < 200 || upstreamRes.statusCode >= 300) {
      upstreamRes.resume();
      return safeErrorResponse(
        res,
        upstreamRes.statusCode || 502,
        `Upstream returned ${upstreamRes.statusCode}`
      );
    }

    const upstreamCd = upstreamRes.headers['content-disposition'];

    // Forzamos octet-stream + attachment para que el navegador no ejecute
    // contenido HTML/JS en el origin de la aplicación.
    res.setHeader('Content-Type', 'application/octet-stream');
    const fileName = upstreamCd
      ? String(upstreamCd).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 256)
      : 'download';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    const contentLength = upstreamRes.headers['content-length'];
    if (contentLength) {
      const len = Number(contentLength);
      if (len > MAX_PROXY_SIZE) {
        upstreamRes.resume();
        return safeErrorResponse(res, 413, 'File too large');
      }
    }

    let downloaded = 0;
    const sizeLimiter = new Transform({
      transform(chunk, _encoding, callback) {
        downloaded += chunk.length;
        if (downloaded > MAX_PROXY_SIZE) {
          callback(new Error('Proxy response exceeded maximum size'));
          return;
        }
        callback(null, chunk);
      },
    });

    sizeLimiter.on('error', () => {
      if (!res.headersSent) {
        safeErrorResponse(res, 413, 'File too large');
      } else {
        res.destroy();
      }
    });

    upstreamRes.pipe(sizeLimiter).pipe(res);
  } catch (err) {
    clearTimeout(timeout);
    console.error('[proxy] error:', err.message);
    if (err.name === 'AbortError') {
      return safeErrorResponse(res, 504, 'Upstream request timed out');
    }
    if (err.code === 'DISALLOWED_URL' || err.code === 'TOO_MANY_REDIRECTS') {
      return safeErrorResponse(res, 400, 'Invalid or disallowed URL');
    }
    return safeErrorResponse(res, 500, 'Proxy request failed');
  }
});

/**
 * Proxy específico de Google Drive.
 * Convierte un fileId a la URL de descarga directa de Drive
 * y la reenvía por streaming.
 */
app.get('/api/drive/:fileId', proxyLimiter, async (req, res) => {
  const { fileId } = req.params;
  if (!fileId || !GOOGLE_DRIVE_FILE_ID_RE.test(fileId)) {
    return safeErrorResponse(res, 400, 'Missing or invalid fileId');
  }

  const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstreamRes = await guardedFetch(driveUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/pdf,application/octet-stream,*/*',
      },
    });

    clearTimeout(timeout);

    if (upstreamRes.statusCode < 200 || upstreamRes.statusCode >= 300) {
      upstreamRes.resume();
      return safeErrorResponse(
        res,
        upstreamRes.statusCode || 502,
        `Google Drive returned ${upstreamRes.statusCode}. Make sure the file is publicly shared.`
      );
    }

    const contentLength = upstreamRes.headers['content-length'];
    if (contentLength) {
      const len = Number(contentLength);
      if (len > MAX_PROXY_SIZE) {
        upstreamRes.resume();
        return safeErrorResponse(res, 413, 'File too large');
      }
    }

    const upstreamCd = upstreamRes.headers['content-disposition'];
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      upstreamCd
        ? String(upstreamCd).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 256)
        : 'attachment'
    );

    let downloaded = 0;
    const sizeLimiter = new Transform({
      transform(chunk, _encoding, callback) {
        downloaded += chunk.length;
        if (downloaded > MAX_PROXY_SIZE) {
          callback(new Error('Drive response exceeded maximum size'));
          return;
        }
        callback(null, chunk);
      },
    });

    sizeLimiter.on('error', () => {
      if (!res.headersSent) {
        safeErrorResponse(res, 413, 'File too large');
      } else {
        res.destroy();
      }
    });

    upstreamRes.pipe(sizeLimiter).pipe(res);
  } catch (err) {
    clearTimeout(timeout);
    console.error('[drive] error:', err.message);
    if (err.name === 'AbortError') {
      return safeErrorResponse(res, 504, 'Google Drive request timed out');
    }
    if (err.code === 'DISALLOWED_URL' || err.code === 'TOO_MANY_REDIRECTS') {
      return safeErrorResponse(res, 400, 'Invalid or disallowed URL');
    }
    return safeErrorResponse(res, 500, 'Drive request failed');
  }
});

/* ---------- SPA estática en producción ---------- */

if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(
    `[server] running in ${NODE_ENV} mode on http://localhost:${PORT}`
  );
});
