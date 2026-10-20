// Tests for calc.js. Run with: npm test
// calc.js is a browser script, so it is loaded into a sandbox with a fake browser environment.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'calc.js'), 'utf8');

function load({ languages = ['en-GB'], timeZone = 'Europe/London', he = false, saved = null } = {}) {
  const sandbox = {
    isHe: he,
    localStorage: { getItem: () => saved, setItem: () => {} },
    navigator: { languages, language: languages[0] },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) },
    Date,
    Math,
    Number,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox;
}

// a constant 7 day forecast, starting at hour 0
function forecast(c, { temp = 25, humid = 50, wind10 = 0, precip = 0, prob = 0, radiation = 0, hours = 168 } = {}) {
  c.weekt2 = Array(hours).fill(temp);
  c.weekrh2 = Array(hours).fill(humid);
  c.weekwind10 = Array(hours).fill(wind10);
  c.weekprecipitation = Array(hours).fill(precip);
  c.weekprob = Array(hours).fill(prob);
  c.weekradiation = Array(hours).fill(radiation);
  c.forecastStartHour = 0;
}

const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not close to ${expected}`);

test('dryingRate is faster with heat and wind, and zero at 100% humidity', () => {
  const c = load();
  close(c.dryingRate(25, 50, 0), 0.29, 0.005);
  assert.ok(c.dryingRate(30, 50, 0) > c.dryingRate(20, 50, 0));
  assert.ok(c.dryingRate(25, 50, 10) > c.dryingRate(25, 50, 0));
  assert.ok(c.dryingRate(25, 30, 0) > c.dryingRate(25, 70, 0));
  assert.equal(c.dryingRate(25, 100, 0), 0);
});

test('calc returns hours, proportional to the thickness', () => {
  const c = load();
  close(c.calc(25, 50, 0, 1), 3.45, 0.01);
  close(c.calc(25, 50, 0, 2), 2 * c.calc(25, 50, 0, 1), 1e-9);
});

test('calc returns Infinity when the laundry will not dry', () => {
  const c = load();
  assert.equal(c.calc(25, 100, 0, 1), Infinity);
});

test('forecastcalc with constant weather matches calc', () => {
  const c = load();
  forecast(c, { temp: 25, humid: 50, wind10: 10 });
  const result = c.forecastcalc(1, false);
  close(result.hours, c.calc(25, 50, 5, 1), 1e-9); // wind at 1.5 meters is half of the 10 meters wind
  assert.equal(result.rain, false);
  assert.equal(result.rainStart, null);
  assert.equal(result.windy, false);
});

test('forecastcalc starts at the current hour', () => {
  const c = load();
  forecast(c, { humid: 100 });
  c.weekrh2.fill(50, 5); // drying weather only from hour 5
  c.forecastStartHour = 5;
  close(c.forecastcalc(1, false).hours, c.calc(25, 50, 0, 1), 1e-9);
});

test('forecastcalc uses the weather of each hour', () => {
  const c = load();
  forecast(c, { humid: 100 }); // nothing dries in the first 3 hours
  c.weekrh2.fill(50, 3);
  close(c.forecastcalc(1, false).hours, 3 + c.calc(25, 50, 0, 1), 1e-9);
});

test('forecastcalc returns Infinity when it will not dry within the forecast', () => {
  const c = load();
  forecast(c, { humid: 100 });
  assert.equal(c.forecastcalc(1, false).hours, Infinity);
});

test('forecastcalc warns about rain only while drying, with its start time', () => {
  const c = load();
  forecast(c);
  c.weekprecipitation[2] = 1;
  const result = c.forecastcalc(1, false);
  assert.equal(result.rain, true);
  // precipitation is the sum of the preceding hour, so the rain starts at hour 1 (or now, if that has passed)
  const hour1 = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) + 3600 * 1000;
  assert.ok(Math.abs(result.rainStart.getTime() - Math.max(hour1, Date.now())) < 5000);

  forecast(c);
  c.weekprecipitation[10] = 5; // after the laundry is dry
  assert.equal(c.forecastcalc(1, false).rain, false);
});

test('forecastcalc reports the highest chance of rain while drying', () => {
  const c = load();
  forecast(c, { prob: 10 });
  c.weekprob[1] = 40;
  c.weekprob[50] = 90; // after the laundry is dry
  assert.equal(c.forecastcalc(1, false).maxProb, 40);
});

test('forecastcalc warns about wind above 12 km/h', () => {
  const c = load();
  forecast(c, { wind10: 12 });
  assert.equal(c.forecastcalc(1, false).windy, false);
  forecast(c, { wind10: 13 });
  assert.equal(c.forecastcalc(1, false).windy, true);
});

test('forecastcalc starts when the laundry is hung', () => {
  const c = load();
  forecast(c, { humid: 100 });
  c.weekrh2.fill(50, 5); // drying weather only from hour 5
  close(c.forecastcalc(1, false, c.forecastTime(5)).hours, c.calc(25, 50, 0, 1), 1e-9);
  // hung at 2:30, nothing dries until 5:00
  close(c.forecastcalc(1, false, c.forecastTime(2.5)).hours, 2.5 + c.calc(25, 50, 0, 1), 1e-9);
});

test('forecastcalc counts only the part of the first hour after hanging', () => {
  const c = load();
  forecast(c);
  close(c.forecastcalc(1, false, c.forecastTime(3.25)).hours, c.calc(25, 50, 0, 1), 1e-9);
  // a thin item that dries in less than the rest of the first hour
  close(c.forecastcalc(0.05, false, c.forecastTime(3.5)).hours, c.calc(25, 50, 0, 0.05), 1e-9);
});

test('forecastcalc says when the hanging time is after the forecast', () => {
  const c = load();
  forecast(c);
  const result = c.forecastcalc(1, false, c.forecastTime(200));
  assert.equal(result.outOfRange, true);
  assert.equal(result.hours, Infinity);
});

test('rain that started before hanging is reported from the hanging time', () => {
  const c = load();
  forecast(c);
  c.weekprecipitation.fill(1, 9, 13);
  const start = c.forecastTime(10);
  const result = c.forecastcalc(1, false, start);
  assert.equal(result.rain, true);
  assert.equal(result.rainStart.getTime(), start.getTime());
});

test('direct sunlight is optional and shortens drying', () => {
  const c = load();
  forecast(c, { radiation: 600 });
  const shade = c.forecastcalc(1, false).hours;
  const sun = c.forecastcalc(1, true).hours;
  close(shade, c.calc(25, 50, 0, 1), 1e-9);
  assert.ok(sun < shade);
  close(sun, 1 / (c.dryingRate(25, 50, 0) + c.sunRate(600)), 1e-9);
  assert.equal(c.sunRate(0), 0);
  assert.equal(c.sunRate(null), 0);
});

test('formatDuration in English', () => {
  const c = load();
  assert.equal(c.formatDuration(3.42), '3 hours and 25 minutes');
  assert.equal(c.formatDuration(1), '1 hour');
  assert.equal(c.formatDuration(0.5), '30 minutes');
  assert.equal(c.formatDuration(0.01), '5 minutes');
  assert.equal(c.formatDuration(1.999), '2 hours');
});

test('formatDuration in Hebrew', () => {
  const c = load({ he: true });
  assert.equal(c.formatDuration(3.42), '3 שעות ו-25 דקות');
  assert.equal(c.formatDuration(1.75), 'שעה ו-45 דקות');
  assert.equal(c.formatDuration(2), 'שעתיים');
  assert.equal(c.formatDuration(0.25), '15 דקות');
});

test('msg replaces the parameters in the right language', () => {
  assert.equal(load().msg('rainprob', 40), 'Highest chance of rain while drying: 40%.');
  assert.equal(load({ he: true }).msg('rainprob', 40), 'הסיכוי הגבוה ביותר לגשם בזמן הייבוש: 40%.');
});

test('default units by where the user is', () => {
  // the time zone decides, not the browser language (many browsers in Israel are in English (US))
  assert.equal(load({ languages: ['en-US'], timeZone: 'Asia/Jerusalem' }).units, 'metric');
  assert.equal(load({ languages: ['he-IL'], timeZone: 'Asia/Jerusalem' }).units, 'metric');
  assert.equal(load({ languages: ['en-US'], timeZone: 'America/New_York' }).units, 'imperial');
  assert.equal(load({ languages: ['he-IL'], timeZone: 'America/Los_Angeles' }).units, 'imperial');
  assert.equal(load({ languages: ['en'], timeZone: 'America/Chicago' }).units, 'imperial');
  assert.equal(load({ languages: ['en'], timeZone: 'America/Indiana/Indianapolis' }).units, 'imperial');
  assert.equal(load({ languages: ['es'], timeZone: 'America/Puerto_Rico' }).units, 'imperial');
  assert.equal(load({ languages: ['en-US'], timeZone: 'America/Toronto' }).units, 'metric');
  assert.equal(load({ languages: ['en-US'], timeZone: 'Europe/London' }).units, 'metric');
  // no real time zone: by the country in the browser language
  assert.equal(load({ languages: ['en-US'], timeZone: 'UTC' }).units, 'imperial');
  assert.equal(load({ languages: ['en', 'en-US'], timeZone: 'Etc/UTC' }).units, 'imperial');
  assert.equal(load({ languages: ['he-IL'], timeZone: 'UTC' }).units, 'metric');
  assert.equal(load({ languages: ['en'], timeZone: '' }).units, 'metric');
});

test('the units the user chose are remembered', () => {
  assert.equal(load({ languages: ['en-US'], timeZone: 'America/New_York', saved: 'metric' }).units, 'metric');
  assert.equal(load({ languages: ['he-IL'], timeZone: 'Asia/Jerusalem', saved: 'imperial' }).units, 'imperial');
  assert.equal(load({ languages: ['he-IL'], timeZone: 'Asia/Jerusalem', saved: 'nonsense' }).units, 'metric');
});

test('unit conversions', () => {
  const c = load({ languages: ['en-US'], timeZone: 'America/New_York' });
  close(c.toCelsius(212), 100, 1e-9);
  close(c.fromCelsius(-40), -40, 1e-9);
  close(c.toKmh(10), 16.09344, 1e-9);
  close(c.fromKmh(c.toKmh(7)), 7, 1e-9);
  const m = load({ languages: ['he-IL'], timeZone: 'Asia/Jerusalem' });
  assert.equal(m.toCelsius('25'), 25);
  assert.equal(m.toKmh('10'), 10);
});
