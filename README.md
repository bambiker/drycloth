## Calculator for laundry drying duration on a clothesline  ##

An open source project for calculating laundry drying duration on a clothesline.
The project is important because it helps to organize time in a better way.
We would appreciate your help with this project.

https://bambiker.github.io/drycloth/

## מחשבון לחישוב זמן ייבוש הכביסה ##
https://bambiker.github.io/drycloth/he/

## Tests ##
There are automated tests (needs Node.js 20 or newer): `test/calc.test.js` for the calculation in `calc.js`,
and `test/page.test.js` that opens the page in a browser, in English and in Hebrew (`?he`):

    npm install
    npx playwright install chromium
    npm test

## Translations ##
`index.html` is written in English. The pages in the other languages (`he/`, `de/`, `it/`, `es/`) are made from it
and the texts in `lang.js`: every element with `data-i18n="key"` gets the text of that key, and `faqs` has the
questions and answers of each language. The calculation messages are in `calc.js`. After changing `index.html` or
`lang.js`, run:

    npm run build

Don't edit the language pages by hand; the tests fail if they are not up to date. Old links with `?he` go to `he/`.
To add a language: its texts in `lang.js` (`translations` and `faqs`), its messages and duration words in `calc.js`,
its locale in `scripts/build-lang.js`, a link in the language menu and an `hreflang` link in `index.html`, then
`npm run build` and `node scripts/make-share-image.js`.

## Google Analytics events ##
Besides the automatic page views, the page sends these events (every event also has `language`: `he` or `en`).
No location and no weather values are sent.

| Event | When | Parameters |
|---|---|---|
| `open_section` | a section is opened | `section`: `why`, `checkdry`, `rules`, `tips` |
| `use_forecast` | the forecast button | `result`: `ok`, `no_location`, `no_weather`, `not_supported` |
| `calculate` | a calculation (once, after a short pause) | `mode`: `forecast`/`manual`, `indoor`, `sun`, `fabric`, `dries` |
| `choose_fabric` | an item is chosen | `fabric`: `2`, `1`, `0.5`, `other` |
| `indoor` | the "drying indoors" switch | `on` |
| `hang_time` | the hanging time is changed | `hours_ahead` |
| `install` | the "Add to home screen" button | `platform`: `prompt`/`ios`, `outcome` |
| `units` | °C/°F is changed | `units`: `metric`/`imperial` |

The events show in Reports → Realtime right away, and in Reports → Engagement → Events after about a day.
To see a parameter (for example which section was opened), add it once in
Admin → Custom definitions → Create custom dimension (scope: Event, event parameter: e.g. `section`).
