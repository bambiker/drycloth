// The pages of the other languages (he/, de/, it/, es/) are made by scripts/build-lang.js; they must be up to date.
// Run with: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildPage, buildManifest, languages } = require('../scripts/build-lang.js');

const root = path.join(__dirname, '..');

for (const lang of Object.keys(languages)) {
  test(`${lang}/index.html and its manifest are up to date (run "npm run build" after changing index.html or lang.js)`, () => {
    assert.ok(fs.readFileSync(path.join(root, lang, 'index.html'), 'utf8') === buildPage(lang),
      `${lang}/index.html is not up to date, run: npm run build`);
    assert.ok(fs.readFileSync(path.join(root, lang, 'manifest.webmanifest'), 'utf8') === buildManifest(lang),
      `${lang}/manifest.webmanifest is not up to date, run: npm run build`);
  });

  test(`${lang}: every text in the page has a translation, and every translation is used`, () => {
    // buildPage throws if a data-i18n key has no text or a text is not used
    assert.doesNotThrow(() => buildPage(lang));
  });

  test(`${lang}: no English text is left in the page`, () => {
    const html = buildPage(lang);
    for (const english of ['Clothesline drying time calculator</h1>', 'Using forecast', 'Drying time:', 'Rules of thumb', 'Contact us',
                           'Will my washing dry today', 'How thick is my laundry', 'the weather forecast for your location',
                           'Drying indoors', 'What are you hanging', 'Questions and answers']) {
      assert.ok(!html.includes(english), `"${english}" is still in ${lang}/index.html`);
    }
  });
}
