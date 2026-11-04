// Makes the share and search images (1200x630) from the clothesline drawing in the header of index.html:
// share-en.png with the English title and share-he.png with the Hebrew title (from lang.js).
// Run after changing the drawing or the titles: node scripts/make-share-image.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scene = html.match(/<svg class="scene"[\s\S]*?<\/svg>/)[0].replace('class="scene"', 'class="scene" width="1200" height="165"');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'lang.js'), 'utf8') + '\nthis.he = translations.he;', sandbox);

const images = [
  ['share-en.png', 'ltr', 'Clothesline drying time calculator', 'When will the laundry be dry? From the weather forecast for your location.'],
  ['share-he.png', 'rtl', sandbox.he.heading, sandbox.he.subtitle],
];

(async () => {
  const browser = await chromium.launch();
  for (const [file, dir, title, subtitle] of images) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(`<!DOCTYPE html><html dir="${dir}"><head>
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; width: 1200px; height: 630px; overflow: hidden; font-family: 'Rubik', system-ui, sans-serif;
               background: linear-gradient(180deg, #3d8fd9, #9fd0f5); color: #fff; text-align: center; position: relative; }
        h1 { font-size: 76px; font-weight: 700; line-height: 1.1; margin: 0 auto; padding-top: 90px; max-width: 1000px;
             text-shadow: 0 3px 18px rgba(10, 30, 80, 0.25); }
        p { font-size: 34px; font-weight: 500; margin: 26px auto 0; max-width: 980px; opacity: 0.95; }
        .scene { position: absolute; left: 0; bottom: 34px; }
      </style></head><body><h1>${title}</h1><p>${subtitle}</p>${scene}</body></html>`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: path.join(root, file) });
    await page.close();
    console.log(file);
  }
  await browser.close();
})();
