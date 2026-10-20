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
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
                '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
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
  for (const [url, expected] of [['/', '6 hours and 55 minutes'], ['/he/', '6 שעות ו-55 דקות']]) {
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
  // "at 25°C, 50% humidity and no wind, a 2 mm towel dries in about 7 hours" (also in llms.txt)
  assert.match(data[1].mainEntity[0].acceptedAnswer.text, /about 7 hours/);
  const hours = await page.evaluate(() => calc(25, 50, 0, 2));
  assert.equal(Math.round(hours), 7);
  assert.match(fs.readFileSync(path.join(root, 'llms.txt'), 'utf8'), /about 7 hours/);
  await page.close();
});

test('the Hebrew page has its own Hebrew structured data and share preview', async () => {
  const { page } = await open('/he/');
  const data = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)));
  assert.deepEqual(data.map(d => d['@type']), ['WebApplication', 'FAQPage']);
  assert.equal(data[0].url, 'https://bambiker.github.io/drycloth/he/');
  assert.equal(data[1].mainEntity.length, 6);
  assert.match(data[1].mainEntity[0].acceptedAnswer.text, /בערך ב-7 שעות/);
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
  assert.equal(await page.textContent('#result'), '6 hours and 55 minutes'); // towel, the default
  await page.click('label:has(input[name=fabric][value="1"])');
  await page.click('#btncalc');
  assert.equal(await page.textContent('#result'), '3 hours and 25 minutes'); // T-shirt
  assert.equal(await page.isVisible('#width'), false);
  await page.click('label:has(input[name=fabric][value=other])');
  assert.equal(await page.isVisible('#width'), true);
  await page.fill('#width', '1');
  await page.click('#btncalc');
  assert.equal(await page.textContent('#result'), '3 hours and 25 minutes');
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
  // hang tomorrow at 08:00: a towel at 25°C and 50% takes about 6.9 hours, dry around 14:54
  const tomorrow = await page.evaluate(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return localInputValue(d).slice(0, 10) + 'T08:00';
  });
  await page.fill('#hangtime', tomorrow);
  await page.fill('#temp', '25');
  await page.fill('#humid', '50');
  await page.click('#btncalc');
  assert.match(await page.textContent('#statusmsg'), /14:54/);
  // back to now
  await page.click('#hangnow');
  assert.equal(await page.evaluate(() => hangInput.dataset.chosen), '');
  assert.deepEqual(errors, []);
  await page.close();
});

// the width and height written in a PNG file
function pngSize(file) {
  const data = fs.readFileSync(file);
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
}

test('each page has an app manifest with icons of the right size', async () => {
  for (const [url, manifestFile, lang] of [['/', 'manifest.webmanifest', 'en'], ['/he/', 'he/manifest.webmanifest', 'he']]) {
    const { page, missing } = await open(url);
    const href = await page.evaluate(() => document.querySelector('link[rel=manifest]').href);
    assert.equal(href, base + '/' + manifestFile);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestFile), 'utf8'));
    assert.equal(manifest.lang, lang);
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
    for (const icon of manifest.icons) {
      const file = path.join(root, path.dirname(manifestFile), icon.src);
      assert.equal(pngSize(file), icon.sizes, icon.src);
    }
    // the iPhone icon
    const appleIcon = await page.evaluate(() => document.querySelector('link[rel=apple-touch-icon]').href);
    assert.equal((await page.request.get(appleIcon)).status(), 200);
    assert.equal(await page.getAttribute('meta[name=theme-color]', 'content'), '#3d8fd9');
    assert.deepEqual(missing, []);
    await page.close();
  }
});

test('the service worker covers both pages', async () => {
  for (const url of ['/', '/he/']) {
    const { page } = await open(url);
    const scope = await page.evaluate(() => navigator.serviceWorker.ready.then(registration => registration.scope));
    assert.equal(scope, base + '/');
    await page.close();
  }
});

test('the install button appears when the browser can install the site', async () => {
  const { page, errors } = await open('/');
  assert.equal(await page.isVisible('#install'), false);
  // what Chrome and Edge send when the site can be installed
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    event.prompt = () => { window.prompted = true; };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  assert.equal(await page.isVisible('#install'), true);
  await page.click('#install');
  assert.equal(await page.evaluate(() => window.prompted), true);
  assert.equal(await page.isVisible('#install'), false);
  assert.deepEqual(errors, []);
  await page.close();
});

test('on iPhone the install button shows how to add the site from Safari', async () => {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.route(url => !url.href.startsWith(base), route => route.abort());
  await page.goto(base + '/he/');
  assert.equal((await page.textContent('#install')).trim(), 'הוספה למסך הבית');
  assert.equal(await page.isVisible('#installhint'), false);
  await page.click('#install');
  assert.equal(await page.isVisible('#installhint'), true);
  assert.match(await page.textContent('#installhint'), /הוסף למסך הבית/);
  await context.close();
});

test('after the forecast the page goes to the hanging time, and a different item is calculated right away', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem', geolocation: { latitude: 32, longitude: 35 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(url => !url.href.startsWith(base) && !url.href.includes('open-meteo'), route => route.abort());
  const n = 168;
  await page.route(/open-meteo/, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ hourly: {
    temperature_2m: Array(n).fill(25), relative_humidity_2m: Array(n).fill(50), precipitation: Array(n).fill(0),
    precipitation_probability: Array(n).fill(0), wind_speed_10m: Array(n).fill(0), shortwave_radiation: Array(n).fill(0) } }) }));
  await page.goto(base + '/he/');
  await page.click('#find-me');
  await page.waitForFunction(() => document.getElementById('result').textContent === '6 שעות ו-55 דקות');
  // the hanging time is at the top of the screen, and the item choice and the whole result are on the screen too
  await page.waitForFunction(() => Math.abs(document.querySelector('.field.hang').getBoundingClientRect().top - 12) < 20);
  assert.ok(await page.evaluate(() => document.querySelector('.fabric').getBoundingClientRect().bottom <= window.innerHeight));
  assert.ok(await page.evaluate(() => document.querySelector('.result').getBoundingClientRect().bottom <= window.innerHeight));
  assert.notEqual(await page.evaluate(() => document.activeElement.id), 'hangtime');
  // a T-shirt, without pressing "calculate"
  await page.click('label:has(input[name=fabric][value="1"])');
  assert.equal(await page.textContent('#result'), '3 שעות ו-25 דקות');
  assert.deepEqual(errors, []);
  await context.close();
});

test('choosing an item before typing the weather does not show an error', async () => {
  const { page, errors } = await open('/');
  await page.click('label:has(input[name=fabric][value="1"])');
  assert.equal(await page.textContent('#statusmsg'), '');
  await page.fill('#temp', '25');
  await page.fill('#humid', '50');
  await page.click('label:has(input[name=fabric][value="0.5"])');
  assert.notEqual(await page.textContent('#result'), 'Please enter the data and press "calculate"');
  assert.deepEqual(errors, []);
  await page.close();
});

test('drying indoors without the forecast: no wind, and the wind comes back when it is turned off', async () => {
  const { page, errors } = await open('/');
  await page.fill('#temp', '25');
  await page.fill('#humid', '50');
  await page.fill('#wind', '10');
  await page.click('label:has(#indoor)');
  assert.equal(await page.inputValue('#wind'), '0');
  assert.equal(await page.isDisabled('#sun'), true);
  assert.equal(await page.textContent('#result'), '6 hours and 55 minutes'); // 25°C, 50%, no wind, towel
  assert.match(await page.textContent('#statusmsg'), /check heating/);
  // a fan, calculated right away
  await page.fill('#wind', '5');
  assert.equal(await page.evaluate(() => document.getElementById('result').textContent), await page.evaluate(() => formatDuration(calc(25, 50, 5, 2))));
  await page.click('label:has(#indoor)');
  assert.equal(await page.inputValue('#wind'), '10');
  assert.equal(await page.isDisabled('#sun'), false);
  assert.deepEqual(errors, []);
  await page.close();
});

test('drying indoors takes the 24 hour average from the forecast once, then heating and a fan can be checked', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem', geolocation: { latitude: 32, longitude: 35 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(url => !url.href.startsWith(base) && !url.href.includes('open-meteo'), route => route.abort());
  const n = 168;
  await page.route(/open-meteo/, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ hourly: {
    temperature_2m: Array.from({ length: n }, (v, i) => (i % 2 ? 30 : 20)),        // average 25
    relative_humidity_2m: Array.from({ length: n }, (v, i) => (i % 2 ? 40 : 60)),  // average 50
    precipitation: Array(n).fill(0), precipitation_probability: Array(n).fill(0),
    wind_speed_10m: Array(n).fill(30), shortwave_radiation: Array(n).fill(500) } }) }));
  await page.goto(base + '/he/');
  // turning it on loads the forecast and fills its average once
  await page.click('label:has(#indoor)');
  await page.waitForFunction(() => document.getElementById('result').textContent === '6 שעות ו-55 דקות');
  assert.equal(await page.inputValue('#temp'), '25');
  assert.equal(await page.inputValue('#humid'), '50');
  assert.equal(await page.inputValue('#wind'), '0');
  assert.equal(await page.isChecked('#useforecast'), false);
  assert.match(await page.textContent('#statusmsg'), /ממוצע הטמפרטורה והלחות ב-24 השעות/);
  // heating: warmer, dries faster, right away
  await page.fill('#temp', '28');
  const heated = await page.textContent('#result');
  assert.equal(heated, await page.evaluate(() => formatDuration(calc(28, 50, 0, 2))));
  // and a fan
  await page.fill('#wind', '5');
  assert.equal(await page.textContent('#result'), await page.evaluate(() => formatDuration(calc(28, 50, 5, 2))));
  assert.equal(await page.inputValue('#temp'), '28'); // the forecast does not change the fields
  // turned off: back to the forecast, with its wind
  await page.click('label:has(#indoor)');
  assert.equal(await page.isChecked('#useforecast'), true);
  assert.notEqual(await page.inputValue('#wind'), '5');
  assert.deepEqual(errors, []);
  await context.close();
});

test('in the header drawing every clothespin is on the clothesline, and the clothes are whole', async () => {
  for (const width of [390, 768, 1100, 1600]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.route(url => !url.href.startsWith(base), route => route.abort());
    await page.goto(base + '/');
    const pegs = await page.evaluate(() => {
      const rope = document.querySelector('.scene path');
      const matrix = rope.getScreenCTM();
      const points = [];
      for (let l = 0; l <= rope.getTotalLength(); l += 1) {
        const p = rope.getPointAtLength(l);
        points.push({ x: matrix.a * p.x + matrix.c * p.y + matrix.e, y: matrix.b * p.x + matrix.d * p.y + matrix.f });
      }
      return [...document.querySelectorAll('.scene rect[fill="#8d6e63"]')].map(peg => {
        const box = peg.getBoundingClientRect();
        const middle = box.left + box.width / 2;
        const ropeY = points.reduce((a, b) => (Math.abs(b.x - middle) < Math.abs(a.x - middle) ? b : a)).y;
        return { top: box.top, bottom: box.bottom, ropeY };
      });
    });
    assert.ok(pegs.length >= 9);
    // the clothes are not cut at the top or the bottom of the drawing
    const cut = await page.evaluate(() => {
      const scene = document.querySelector('.scene').getBoundingClientRect();
      return [...document.querySelectorAll('.scene g')].map(item => item.getBoundingClientRect())
        .filter(box => box.top < scene.top - 0.5 || box.bottom > scene.bottom + 0.5).length;
    });
    assert.equal(cut, 0, `clothes cut at width ${width}`);
    for (const peg of pegs) {
      assert.ok(peg.top < peg.ropeY && peg.ropeY < peg.bottom, `a clothespin at ${peg.top}-${peg.bottom} is not on the rope at ${peg.ropeY} (width ${width})`);
    }
    await page.close();
  }
});

// the Google Analytics events the page sent (gtag puts them in window.dataLayer)
async function analyticsEvents(page) {
  return page.evaluate(() => window.dataLayer
    .map(entry => Array.from(entry))
    .filter(entry => entry[0] === 'event')
    .map(entry => ({ name: entry[1], ...entry[2] })));
}

test('Google Analytics events for sections, fabric, units, indoors and calculating', async () => {
  const { page, errors } = await open('/he/');
  await page.click('details[data-section="tips"] summary');
  await page.click('details[data-section="checkdry"] summary');
  await page.click('label:has(input[name=fabric][value="1"])');
  await page.click('label:has(input[name=units][value=imperial])');
  await page.click('label:has(input[name=units][value=metric])');
  await page.fill('#temp', '25');
  await page.fill('#humid', '50');
  await page.click('label:has(#indoor)');
  await page.click('#btncalc');
  await page.click('#hangnow');
  // calculating is sent once, after a short pause
  await page.waitForFunction(() => window.dataLayer.some(entry => entry[0] === 'event' && entry[1] === 'calculate'), null, { timeout: 4000 });
  const events = await analyticsEvents(page);
  const has = (name, params) => events.some(e => e.name === name && Object.entries(params).every(([k, v]) => e[k] === v));
  assert.ok(has('open_section', { section: 'tips', language: 'he' }));
  assert.ok(has('open_section', { section: 'checkdry' }));
  assert.ok(has('choose_fabric', { fabric: '1' }));
  assert.ok(has('units', { units: 'imperial' }));
  assert.ok(has('indoor', { on: true }));
  assert.ok(has('hang_time', { hours_ahead: 0 }));
  assert.ok(has('calculate', { mode: 'manual', indoor: true, fabric: '1', dries: true }));
  assert.equal(events.filter(e => e.name === 'calculate').length, 1);
  // closing a section is not an event
  await page.click('details[data-section="tips"] summary');
  assert.equal((await analyticsEvents(page)).filter(e => e.name === 'open_section' && e.section === 'tips').length, 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('Google Analytics events for the forecast button and installing', async () => {
  // no location
  const denied = await browser.newPage();
  await denied.route(url => !url.href.startsWith(base), route => route.abort());
  await denied.goto(base + '/');
  await denied.click('#find-me');
  await denied.waitForFunction(() => window.dataLayer.some(entry => entry[1] === 'use_forecast'));
  assert.equal((await analyticsEvents(denied)).find(e => e.name === 'use_forecast').result, 'no_location');
  // the install prompt
  await denied.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    event.prompt = () => {};
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await denied.click('#install');
  const install = (await analyticsEvents(denied)).find(e => e.name === 'install');
  assert.equal(install.platform, 'prompt');
  assert.equal(install.outcome, 'accepted');
  await denied.close();

  // the forecast loaded
  const context = await browser.newContext({ geolocation: { latitude: 32, longitude: 35 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  await page.route(url => !url.href.startsWith(base) && !url.href.includes('open-meteo'), route => route.abort());
  const n = 168;
  await page.route(/open-meteo/, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ hourly: {
    temperature_2m: Array(n).fill(25), relative_humidity_2m: Array(n).fill(50), precipitation: Array(n).fill(0),
    precipitation_probability: Array(n).fill(0), wind_speed_10m: Array(n).fill(0), shortwave_radiation: Array(n).fill(0) } }) }));
  await page.goto(base + '/');
  await page.click('#find-me');
  await page.waitForFunction(() => window.dataLayer.some(entry => entry[1] === 'calculate'), null, { timeout: 4000 });
  const events = await analyticsEvents(page);
  assert.equal(events.find(e => e.name === 'use_forecast').result, 'ok');
  assert.equal(events.find(e => e.name === 'calculate').mode, 'forecast');
  await context.close();
});
