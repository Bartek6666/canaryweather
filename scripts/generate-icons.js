/**
 * Generate app icon PNGs from the master SVG (assets/sunly-icon.svg).
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');

// [source svg, output filename, size in px]
const targets = [
  ['sunly-icon.svg', 'icon.png', 1024],
  ['sunly-icon.svg', 'adaptive-icon.png', 1024],
  ['sunly-icon.svg', 'favicon.png', 48],
  ['sunly-splash.svg', 'splash.png', 1024],
];

(async () => {
  for (const [src, name, size] of targets) {
    const svg = fs.readFileSync(path.join(assets, src));
    await sharp(svg, { density: 512 })
      .resize(size, size)
      .png()
      .toFile(path.join(assets, name));
    console.log(`wrote assets/${name} (${size}x${size})`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
