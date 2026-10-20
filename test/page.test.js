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
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
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
  const missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) {missing.push(r.url());} });
  // no internet in the tests: analytics, fonts and share buttons are not needed
  await page.route(url => !url.href.startsWith(base), route => route.abort());
  await page.goto(base + url);
  return { page, errors, missing };
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
    assert.equal(l.title, 'How long does laundry take to dry? Clothesline drying time calculator');
    assert.equal(l.heading, 'Clothesline drying time calculator');
    assert.equal(await page.textContent('#langswitch'), 'עב');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('/he/ is in Hebrew, also without JavaScript (for search engines and AI crawlers)', async () => {
  const { page, errors, missing } = await open('/he/', 'he-IL');
  const l = await language(page);
  assert.equal(l.lang, 'he');
  assert.equal(l.dir, 'rtl');
  assert.equal(l.title, 'כמה זמן לוקח לכביסה להתייבש? מחשבון זמן ייבוש כביסה על חבל');
  assert.equal(l.heading, 'מחשבון לחישוב זמן ייבוש הכביסה');
  assert.equal(await page.textContent('#langswitch'), 'En');
  assert.equal(await page.textContent('#temp-unit'), 'צלזיוס');
  assert.equal(await page.textContent('[data-i18n="contact"]'), 'צור קשר');
  assert.equal(await page.getAttribute('[data-i18n="contact"]', 'href'), 'https://forms.gle/FJx3CNFUcExcG9Fn9');
  assert.equal(await page.getAttribute('.a2a_kit', 'data-a2a-url'), 'https://bambiker.github.io/drycloth/he/');
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, [], 'files the Hebrew page could not load');
  await page.close();

  // the HTML itself is Hebrew, before any JavaScript runs
  const raw = fs.readFileSync(path.join(root, 'he', 'index.html'), 'utf8');
  assert.match(raw, /<html lang="he" dir="rtl">/);
  assert.match(raw, /<h1 data-i18n="heading">מחשבון לחישוב זמן ייבוש הכביסה<\/h1>/);
  assert.doesNotMatch(raw, /Clothesline drying time calculator<\/h1>/);
});

// links people already shared keep working
for (const [url, expected] of [['/?he', '/he/'], ['/index.html?he', '/he/'], ['/?he&fbclid=abc', '/he/?fbclid=abc'],
                               ['/index.html?utm_source=x&he', '/he/?utm_source=x']]) {
  test(`${url} goes to the Hebrew page`, async () => {
    const { page, errors } = await open(url, 'he-IL');
    await page.waitForURL(base + expected);
    assert.equal((await language(page)).lang, 'he');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('the language links lead to the other language', async () => {
  const { page } = await open('/');
  await page.click('#langswitch');
  await page.waitForURL(base + '/he/');
  assert.equal((await language(page)).lang, 'he');
  await page.click('#langswitch');
  await page.waitForURL(base + '/');
  assert.equal((await language(page)).lang, 'en');
  await page.close();
});

test('the calculator works in both languages', async () => {
  for (const [url, expected] of [['/', '3 hours and 25 minutes'], ['/he/', '3 שעות ו-25 דקות']]) {
    const { page, errors } = await open(url);
    await page.fill('#temp', '25');
    await page.fill('#humid', '50');
    await page.click('#btncalc');
    assert.equal(await page.textContent('#result'), expected);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('canonical address by language', async () => {
  for (const [url, canonical] of [['/', 'https://bambiker.github.io/drycloth/'], ['/index.html', 'https://bambiker.github.io/drycloth/'],
                                   ['/he/', 'https://bambiker.github.io/drycloth/he/']]) {
    const { page } = await open(url);
    assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), canonical);
    assert.equal(await page.locator('link[rel=canonical]').count(), 1);
    assert.equal(await page.getAttribute('link[hreflang=he]', 'href'), 'https://bambiker.github.io/drycloth/he/');
    await page.close();
  }
});

test('structured data (JSON-LD) is valid and its example matches the calculator', async () => {
  const { page } = await open('/');
  const data = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)));
  assert.deepEqual(data.map(d => d['@type']), ['WebApplication', 'FAQPage']);
  assert.ok(data[1].mainEntity.length > 0);
  for (const q of data[1].mainEntity) {
    assert.equal(q['@type'], 'Question');
    assert.ok(q.name && q.acceptedAnswer.text);
  }
  // "at 25°C, 50% humidity and no wind, a 2 mm towel dries in about 3.5 hours" (also in llms.txt)
  assert.match(data[1].mainEntity[0].acceptedAnswer.text, /about 3\.5 hours/);
  const hours = await page.evaluate(() => calc(25, 50, 0, 2 / 2));
  assert.equal(Math.round(hours * 2) / 2, 3.5);
  assert.match(fs.readFileSync(path.join(root, 'llms.txt'), 'utf8'), /about 3\.5 hours/);
  await page.close();
});

test('the Hebrew page has its own Hebrew structured data and share preview', async () => {
  const { page } = await open('/he/');
  const data = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)));
  assert.deepEqual(data.map(d => d['@type']), ['WebApplication', 'FAQPage']);
  assert.equal(data[0].url, 'https://bambiker.github.io/drycloth/he/');
  assert.equal(data[1].mainEntity.length, 6);
  assert.match(data[1].mainEntity[0].acceptedAnswer.text, /בערך ב-3\.5 שעות/);
  assert.equal(await page.getAttribute('meta[property="og:url"]', 'content'), 'https://bambiker.github.io/drycloth/he/');
  assert.equal(await page.getAttribute('meta[property="og:locale"]', 'content'), 'he_IL');
  await page.close();
});

test('share preview (Open Graph) points to files that exist', async () => {
  const { page } = await open('/');
  const image = await page.getAttribute('meta[property="og:image"]', 'content');
  const local = image.replace('https://bambiker.github.io/drycloth/', '/');
  assert.equal((await page.request.get(base + local)).status(), 200);
  assert.ok(await page.getAttribute('meta[property="og:title"]', 'content'));
  assert.ok(await page.getAttribute('meta[property="og:description"]', 'content'));
  await page.close();
});

test('sitemap.xml is valid and lists both languages', async () => {
  const { page } = await open('/');
  const urls = await page.evaluate(async () => {
    const xml = new DOMParser().parseFromString(await (await fetch('sitemap.xml')).text(), 'application/xml');
    if (xml.querySelector('parsererror')) {return null;}
    return [...xml.getElementsByTagName('loc')].map(l => l.textContent);
  });
  assert.deepEqual(urls, ['https://bambiker.github.io/drycloth/', 'https://bambiker.github.io/drycloth/he/']);
  await page.close();
});

test('in Israel the default is Celsius, also when the browser is in English (US)', async () => {
  const page = await browser.newPage({ locale: 'en-US', timezoneId: 'Asia/Jerusalem' });
  await page.route(url => !url.href.startsWith(base), route => route.abort());
  for (const url of ['/', '/he/']) {
    await page.goto(base + url);
    assert.equal(await page.isChecked('input[value=metric]'), true);
    assert.equal(await page.textContent('#wind-unit'), url === '/' ? 'km/h' : 'קמ"ש');
  }
  await page.close();
});

test('the units the user chose are remembered on the next visit', async () => {
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Asia/Jerusalem' });
  const page = await context.newPage();
  await page.route(url => !url.href.startsWith(base), route => route.abort());
  await page.goto(base + '/');
  await page.click('label:has(input[value=imperial])');
  await page.reload();
  assert.equal(await page.isChecked('input[value=imperial]'), true);
  assert.equal(await page.textContent('#temp-unit'), '°F');
  await context.close();
});

test('choosing what is hung instead of the thickness', async () => {
  const { page, errors } = await open('/');
  await page.fill('#temp', '25');
  await page.fill('#humid', '50');
  await page.click('#btncalc');
  assert.equal(await page.textContent('#result'), '3 hours and 25 minutes'); // towel, the default
  await page.click('label:has(input[name=fabric][value="1"])');
  await page.click('#btncalc');
  assert.equal(await page.textContent('#result'), '1 hour and 45 minutes'); // T-shirt
  assert.equal(await page.isVisible('#width'), false);
  await page.click('label:has(input[name=fabric][value=other])');
  assert.equal(await page.isVisible('#width'), true);
  await page.fill('#width', '1');
  await page.click('#btncalc');
  assert.equal(await page.textContent('#result'), '1 hour and 45 minutes');
  assert.deepEqual(errors, []);
  await page.close();

  const he = await open('/he/');
  assert.equal(await he.page.textContent('[data-i18n="fabric1"]'), 'חולצה קצרה');
  assert.equal(await he.page.textContent('[data-i18n="mm2"]'), '2 מ"מ');
  await he.page.close();
});

test('the hanging time is now by default and can be changed', async () => {
  const { page, errors } = await open('/');
  const now = await page.evaluate(() => [hangInput.value, localInputValue(new Date())]);
  assert.equal(now[0], now[1]);
  // hang tomorrow at 08:00: a towel at 25°C and 50% takes about 3.5 hours, dry around 11:27
  const tomorrow = await page.evaluate(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return localInputValue(d).slice(0, 10) + 'T08:00';
  });
  await page.fill('#hangtime', tomorrow);
  await page.fill('#temp', '25');
  await page.fill('#humid', '50');
  await page.click('#btncalc');
  assert.match(await page.textContent('#statusmsg'), /11:27/);
  // back to now
  await page.click('#hangnow');
  assert.equal(await page.evaluate(() => hangInput.dataset.chosen), '');
  assert.deepEqual(errors, []);
  await page.close();
});
