// Smoke test: levanta `vite preview`, abre la app en Edge headless,
// sube un PDF generado al vuelo y verifica el lector.
// Uso: node scripts/smoke-test.mjs
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const EDGE =
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const tmpPdf = fileURLToPath(new URL('./test-sample.pdf', import.meta.url));

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 8; i++) {
    const page = doc.addPage([420, 594]);
    page.drawText(`Página ${i}`, {
      x: 140,
      y: 300,
      size: 36,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  writeFileSync(tmpPdf, await doc.save());
}

async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      /* aún no arranca */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('El servidor de preview no arrancó');
}

const viteBin = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url)
);
const preview = spawn(
  process.execPath,
  [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore' }
);

const errors = [];
let page = null;

try {
  await makePdf();
  await waitServer();

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  await page.goto(BASE, { waitUntil: 'networkidle0' });

  // 1. Pantalla de subida
  await page.waitForSelector('.dropzone', { timeout: 5000 });
  console.log('OK: pantalla de subida visible');

  // 2. Subir el PDF
  const input = await page.$('input[type="file"]');
  await input.uploadFile(tmpPdf);

  // 3. El lector carga con páginas renderizadas en canvas
  await page.waitForSelector('.book-area canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('.book-area canvas');
      return c && c.width > 100;
    },
    { timeout: 15000 }
  );
  console.log('OK: flipbook renderizado con canvas');

  // Indicador de página "1 / 8"
  await page.waitForFunction(
    () => document.body.innerText.includes('/ 8'),
    { timeout: 5000 }
  );
  console.log('OK: contador de páginas correcto (8)');

  // 4. Pasar página con el botón siguiente
  const pageInput = await page.$('.goto-form input');
  const before = await pageInput.evaluate((el) => el.value);
  await page.click('.toolbar-nav [title^="Next page"]');
  await new Promise((r) => setTimeout(r, 1200));
  const after = await pageInput.evaluate((el) => el.value);
  if (before === after) {
    fail(`el botón siguiente no cambió de página (${before} -> ${after})`);
  } else {
    console.log(`OK: botón siguiente cambió de página (${before} -> ${after})`);
  }

  // 5. Ir a página concreta (5): en vista doble abre la doble página 4–5
  await pageInput.evaluate((el) => (el.value = ''));
  await pageInput.type('5');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 1200));
  const spread = await page.evaluate(
    () => document.querySelector('.spread-label')?.textContent ?? ''
  );
  if (!spread.includes('4–5')) {
    fail(`ir a página 5 no abrió la doble página 4–5 (indicador: "${spread}")`);
  } else {
    console.log(`OK: ir a página 5 abrió la doble página (${spread})`);
  }

  // 6. Zoom in
  const zoomBtn = () =>
    page.evaluate(
      () => document.querySelector('.tb-zoom')?.textContent?.trim()
    );
  const z0 = await zoomBtn();
  await page.click('.toolbar-group:last-child .tb-btn:last-of-type'); // botón +
  await new Promise((r) => setTimeout(r, 800));
  const z1 = await zoomBtn();
  if (z0 === z1) fail(`el zoom no cambió (${z0} -> ${z1})`);
  else console.log(`OK: zoom cambió (${z0} -> ${z1})`);

  // 7. Progreso guardado en localStorage
  const saved = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith('pdflibro:progress:')
    );
    return keys.length ? localStorage.getItem(keys[0]) : null;
  });
  if (!saved) fail('no se guardó el progreso en localStorage');
  else console.log(`OK: progreso guardado (${saved})`);

  // 8. Miniaturas
  await page.click('.toolbar-group:first-child .tb-btn:nth-child(2)');
  await page.waitForSelector('.thumbs-panel .thumb', { timeout: 5000 });
  const thumbs = await page.$$eval('.thumbs-panel .thumb', (els) => els.length);
  if (thumbs !== 8) fail(`miniaturas esperadas 8, encontradas ${thumbs}`);
  else console.log('OK: panel de miniaturas con 8 páginas');

  // 9. Errores de consola/página
  const relevant = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('DevTools')
  );
  if (relevant.length) {
    fail(`errores en la página:\n  ${relevant.join('\n  ')}`);
  } else {
    console.log('OK: sin errores de consola');
  }

  await browser.close();
} catch (err) {
  fail(err.message);
  if (errors.length) console.error('Errores de página:\n  ' + errors.join('\n  '));
  try {
    const dom = await page
      ?.evaluate(() => ({
        bookArea: !!document.querySelector('.book-area'),
        bookScroll: !!document.querySelector('.book-scroll'),
        pages: document.querySelectorAll('.page').length,
        canvases: document.querySelectorAll('.book-area canvas').length,
        stf: !!document.querySelector('.stf__parent'),
        bookHtml: document.querySelector('.book-area')?.innerHTML?.slice(0, 300),
      }))
      .catch(() => null);
    if (dom) console.error('DOM actual:', JSON.stringify(dom, null, 2));
  } catch {
    /* ignorar */
  }
} finally {
  preview.kill();
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
