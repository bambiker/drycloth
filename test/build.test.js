// he/index.html is made by scripts/build-he.js; it must be up to date. Run with: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildHebrewPage } = require('../scripts/build-he.js');

test('he/index.html is up to date (run "npm run build" after changing index.html or lang.js)', () => {
  const committed = fs.readFileSync(path.join(__dirname, '..', 'he', 'index.html'), 'utf8');
  assert.ok(committed === buildHebrewPage(), 'he/index.html is not up to date, run: npm run build');
});

test('every text in the page has a Hebrew text, and every Hebrew text is used', () => {
  // buildHebrewPage throws if a data-i18n key has no Hebrew text or a Hebrew text is not used
  assert.doesNotThrow(() => buildHebrewPage());
});

test('no English text is left in the Hebrew page', () => {
  const html = buildHebrewPage();
  for (const english of ['Clothesline drying time calculator</h1>', 'Using forecast', 'Drying time:', 'Rules of thumb', 'Contact us']) {
    assert.ok(!html.includes(english), `"${english}" is still in he/index.html`);
  }
});
