// Tests of index.html in a real browser (Chromium via Playwright). Run with: npm test
// The links people already shared must keep working: the page is in English,
// and with ?he (also with more parameters, e.g. ?he&fbclid=...) it is in Hebrew.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
let server, base, browser;

before(async () => {
  server = http.createServer((req, res) => {
    let file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (file.endsWith('/')) {file += 'index.html';}
    const full = path.join(root, file);
    if (!full.startsWith(root) || !fs.existsSync(full)) {res.writeHead(404); res.end(); return;}
    res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(url, locale = 'en-GB') {
  const page = await browser.newPage({ locale });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // no internet in the tests: analytics, fonts and share buttons are not needed
  await page.route(url => !url.href.startsWith(base), route => route.abort());
  await page.goto(base + url);
  return { page, errors };
}

async function language(page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    title: document.title,
    heading: document.querySelector('h1').textContent,
  }));
}

for (const url of ['/', '/index.html']) {
  test(`${url} is in English`, async () => {
    const { page, errors } = await open(url);
    const l = await language(page);
    assert.equal(l.lang, 'en');
    assert.equal(l.dir, '');
    assert.equal(l.title, 'Clothesline drying time calculator');
    assert.equal(l.heading, 'Clothesline drying time calculator');
    assert.equal(await page.textContent('#langswitch'), 'עב');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

for (const url of ['/?he', '/index.html?he', '/?he&fbclid=abc', '/index.html?utm_source=x&he']) {
  test(`${url} is in Hebrew`, async () => {
    const { page, errors } = await open(url, 'he-IL');
    const l = await language(page);
    assert.equal(l.lang, 'he');
    assert.equal(l.dir, 'rtl');
    assert.equal(l.title, 'מחשבון זמן ייבוש כביסה על חבל');
    assert.equal(l.heading, 'מחשבון לחישוב זמן ייבוש הכביסה');
    assert.equal(await page.textContent('#langswitch'), 'En');
    assert.equal(await page.textContent('#temp-unit'), 'צלזיוס');
    assert.equal(await page.getAttribute('input[data-i18n-value]', 'value'), 'צור קשר');
    assert.equal(await page.getAttribute('.a2a_kit', 'data-a2a-url'), 'https://bambiker.github.io/drycloth?he');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('the language links lead to the other language', async () => {
  const { page } = await open('/');
  await page.click('#langswitch');
  await page.waitForURL(base + '/index.html?he');
  assert.equal((await language(page)).lang, 'he');
  await page.click('#langswitch');
  await page.waitForURL(base + '/index.html');
  assert.equal((await language(page)).lang, 'en');
  await page.close();
});

test('the calculator works in both languages', async () => {
  for (const [url, expected] of [['/', '3 hours and 25 minutes'], ['/?he', '3 שעות ו-25 דקות']]) {
    const { page, errors } = await open(url);
    await page.fill('#temp', '25');
    await page.fill('#humid', '50');
    await page.click('#btncalc');
    assert.equal(await page.textContent('#result'), expected);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('every Hebrew text has a place in the page and every place has a Hebrew text', async () => {
  const { page } = await open('/');
  const keys = await page.evaluate(() => {
    const used = new Set();
    document.querySelectorAll('*').forEach(element => {
      for (const attribute of element.attributes) {
        if (attribute.name === 'data-i18n' || attribute.name.startsWith('data-i18n-')) {used.add(attribute.value);}
      }
    });
    return { used: [...used].sort(), he: Object.keys(translations.he).sort() };
  });
  const head = ['title', 'description']; // used by translatePage itself
  assert.deepEqual(keys.used.filter(k => !keys.he.includes(k)), [], 'keys in the page without Hebrew text');
  assert.deepEqual(keys.he.filter(k => !keys.used.includes(k) && !head.includes(k)), [], 'Hebrew texts not used in the page');
  await page.close();
});
