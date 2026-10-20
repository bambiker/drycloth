// Makes the app icons in icons/ from drycloth.svg (white logo on the sky colours of the page).
// Run once after changing the logo: node scripts/make-icons.js
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const logo = fs.readFileSync(path.join(root, 'drycloth.svg'), 'utf8');
const icons = [
  // file, size, part of the icon the logo fills (maskable icons are cut to a circle, so a smaller logo)
  ['icon-192.png', 192, 0.62],
  ['icon-512.png', 512, 0.62],
  ['icon-maskable-512.png', 512, 0.5],
  ['apple-touch-icon.png', 180, 0.62],
];

(async () => {
  fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
  const browser = await chromium.launch();
  for (const [file, size, part] of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0">
      <div style="width:${size}px;height:${size}px;display:grid;place-items:center;
                  background:linear-gradient(180deg,#3d8fd9,#9fd0f5)">
        <div style="width:${size * part}px;height:${size * part}px;filter:brightness(0) invert(1)">
          ${logo.replace('<svg ', '<svg style="width:100%;height:100%" viewBox="0 0 96 96" ')}
        </div>
      </div></body></html>`);
    await page.screenshot({ path: path.join(root, 'icons', file) });
    await page.close();
    console.log('icons/' + file);
  }
  await browser.close();
})();
