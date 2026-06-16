/**
 * Generates PNG icon files from public/icon.svg using sharp.
 * Run once after changing the SVG: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

const sizes = [
  { size: 512,  filename: 'icon-512.png'          },
  { size: 192,  filename: 'icon-192.png'           },
  { size: 180,  filename: 'apple-touch-icon.png'   },
  { size: 32,   filename: 'favicon-32x32.png'      },
];

for (const { size, filename } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, filename));
  console.log(`✓  ${filename}  (${size}×${size})`);
}

console.log('\nAll icons generated.');
