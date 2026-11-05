// Makes the pages of the other languages (he/index.html, de/index.html...) and their app manifests
// from index.html and the texts in lang.js.
// Run after changing index.html or lang.js:  npm run build
// (the tests fail if the pages are not up to date)
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const site = 'https://bambiker.github.io/drycloth/';

// what is not in lang.js: the Open Graph locale and the direction of the text
const languages = {
  he: { locale: 'he_IL', dir: 'rtl' },
  de: { locale: 'de_DE', dir: 'ltr' },
  it: { locale: 'it_IT', dir: 'ltr' },
  es: { locale: 'es_ES', dir: 'ltr' },
};

function loadTexts() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'lang.js'), 'utf8') +
    '\nthis.result = { translations: translations, attributes: translatedAttributes, faqs: faqs };', sandbox);
  return sandbox.result;
}

// replace exactly one occurrence, so a change in index.html can't be missed silently
function replaceOnce(html, from, to) {
  const count = html.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`build-lang: expected "${from.slice(0, 60)}" once in index.html, found it ${count} times`);
  }
  return html.replace(from, () => to);
}

function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildPage(lang) {
  const { translations, attributes, faqs } = loadTexts();
  const t = translations[lang];
  const faq = faqs[lang];
  const { locale, dir } = languages[lang];
  if (!t || !faq) {throw new Error(`build-lang: no texts for "${lang}" in lang.js`);}
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  html = replaceOnce(html, '<!DOCTYPE html>\n<html lang="en">',
    `<!DOCTYPE html>\n<!-- Made from index.html and lang.js by scripts/build-lang.js. Do not edit, run: npm run build -->\n<html lang="${lang}" dir="${dir}">`);

  // old links to the Hebrew page (?he) only need the redirect on the English page
  html = html.replace(/  <!-- redirect-to-hebrew -->[\s\S]*?<!-- \/redirect-to-hebrew -->\n/, '');
  html = replaceOnce(html, 'var pageLang = "en";', `var pageLang = "${lang}";`);

  // head
  html = replaceOnce(html, html.match(/<meta name="description" content=("[^"]*"|'[^']*')>/)[0],
    `<meta name="description" content="${escapeAttribute(t.description)}">`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(t.title)}</title>`);
  html = replaceOnce(html, `<link rel="canonical" href="${site}">`, `<link rel="canonical" href="${site}${lang}/">`);
  const meta = {
    'og:site_name': t.heading,
    'og:title': t.title,
    'og:description': t.description,
    'og:url': `${site}${lang}/`,
    'og:image': `${site}share-${lang}.png`,
    'og:image:alt': t.heading,
    'og:locale': locale,
    'og:locale:alternate': 'en_US',
  };
  for (const [property, content] of Object.entries(meta)) {
    html = html.replace(new RegExp(`(<meta property="${property}" content=")[^"]*(")`), (m, a, b) => a + escapeAttribute(content) + b);
  }

  // structured data in the language
  html = html.replace(/(<script type="application\/ld\+json">\n)([\s\S]*?)(\n  <\/script>)/g, (m, open, json, close) => {
    const data = JSON.parse(json);
    if (data['@type'] === 'WebApplication') {
      data.alternateName = data.name;
      data.name = t.heading;
      data.url = `${site}${lang}/`;
      data.description = t.description;
      data.image = [`${site}share-${lang}.png`].concat(data.image.slice(1));
    } else if (data['@type'] === 'FAQPage') {
      data.mainEntity = faq.map(([question, answer]) => ({
        '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } }));
    }
    return open + '  ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n  ') + close;
  });

  // the questions and answers shown on the page: the same as the structured data (the first one is the short answer)
  html = html.replace(/(<div class="body" data-faq-list>\n)[\s\S]*?(\n        <\/div>)/, (m, open, close) =>
    open + faq.slice(1).map(([question, answer]) =>
      `          <h3>${escapeText(question)}</h3>\n          <p>${escapeText(answer)}</p>`).join('\n') + close);

  // files are one folder up (each language has its own manifest.webmanifest)
  for (const file of ['drycloth.svg', 'calc.js', 'clothlineclock.jpg']) {
    html = html.replace(new RegExp(`(src|href)="${file.replace('.', '\\.')}"`, 'g'), `$1="../${file}"`);
  }
  html = html.replace(/href="icons\//g, 'href="../icons/');
  html = replaceOnce(html, 'navigator.serviceWorker.register("sw.js")', 'navigator.serviceWorker.register("../sw.js")');
  html = replaceOnce(html, '<meta name="apple-mobile-web-app-title" content="Drying time">',
    `<meta name="apple-mobile-web-app-title" content="${escapeAttribute(t.shortname)}">`);

  // the language links, from this folder
  html = html.replace(/<a class="lang" data-lang="(\w+)" href="[^"]*"( hreflang="\w+" lang="\w+")(?: aria-current="page")?>/g,
    (m, to, rest) => `<a class="lang" data-lang="${to}" href="${to === lang ? './' : to === 'en' ? '../' : `../${to}/`}"${rest}` +
      (to === lang ? ' aria-current="page">' : '>'));

  // texts: <tag ... data-i18n="key" ...>English</tag>
  const used = new Set();
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, english, close) => {
    if (!(key in t)) {throw new Error(`build-lang: no "${lang}" text for data-i18n="${key}"`);}
    used.add(key);
    return open + t[key] + close;
  });
  // attributes: data-i18n-href="key" etc.
  for (const attribute of attributes) {
    html = html.replace(new RegExp(`<[^>]*\\sdata-i18n-${attribute}="([^"]+)"[^>]*>`, 'g'), (tag, key) => {
      if (!(key in t)) {throw new Error(`build-lang: no "${lang}" text for data-i18n-${attribute}="${key}"`);}
      used.add(key);
      return tag.replace(new RegExp(`(\\s${attribute}=")[^"]*(")`), (m, a, b) => a + escapeAttribute(t[key]) + b);
    });
  }

  const unused = Object.keys(t).filter(key => !used.has(key) && !['title', 'description', 'shortname'].includes(key));
  if (unused.length) {throw new Error(`build-lang: "${lang}" texts not used in index.html: ${unused.join(', ')}`);}
  return html;
}

// the app manifest of a language: the English one, with the language's names and paths one folder up
function buildManifest(lang) {
  const t = loadTexts().translations[lang];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  Object.assign(manifest, { name: t.heading, short_name: t.shortname, description: t.subtitle, lang, dir: languages[lang].dir });
  manifest.icons = manifest.icons.map(icon => Object.assign({}, icon, { src: '../' + icon.src }));
  return JSON.stringify(manifest, null, 2) + '\n';
}

module.exports = { buildPage, buildManifest, languages };

if (require.main === module) {
  for (const lang of Object.keys(languages)) {
    fs.mkdirSync(path.join(root, lang), { recursive: true });
    fs.writeFileSync(path.join(root, lang, 'index.html'), buildPage(lang));
    fs.writeFileSync(path.join(root, lang, 'manifest.webmanifest'), buildManifest(lang));
    console.log(`${lang}/index.html and ${lang}/manifest.webmanifest updated`);
  }
}
