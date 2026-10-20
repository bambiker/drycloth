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
`index.html` is written in English. The Hebrew page, `he/index.html`, is made from it and the Hebrew texts
in `lang.js`: every element with `data-i18n="key"` gets the Hebrew text of that key. After changing
`index.html` or `lang.js`, run:

    npm run build

Don't edit `he/index.html` by hand; the tests fail if it is not up to date. Old links with `?he` go to `he/`.
The calculation messages are in `calc.js`.

The tests also run on GitHub for every pull request.
