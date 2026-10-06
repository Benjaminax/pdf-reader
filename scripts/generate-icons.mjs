// Genera los iconos PNG de la PWA a partir de public/icons/icon.svg
// Uso: npm run icons
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const svgPath = fileURLToPath(
  new URL('../public/icons/icon.svg', import.meta.url)
);
const svg = readFileSync(svgPath);

const out = (name) =>
  fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url));

await sharp(svg, { density: 384 }).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg, { density: 384 }).resize(512, 512).png().toFile(out('icon-512.png'));

// Maskable: icono al ~80% centrado sobre el fondo (zona segura)
const inner = await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#0f1115' },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(out('maskable-512.png'));

console.log('Iconos generados en public/icons/');
