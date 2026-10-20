// Makes the Hebrew page, he/index.html, from index.html and the Hebrew texts in lang.js.
// Run after changing index.html or lang.js:  npm run build
// (the tests fail if he/index.html is not up to date)
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const site = 'https://bambiker.github.io/drycloth/';

function loadHebrew() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'lang.js'), 'utf8') +
    '\nthis.result = { t: translations.he, attributes: translatedAttributes, faq: faqHe };', sandbox);
  return sandbox.result;
}

// replace exactly one occurrence, so a change in index.html can't be missed silently
function replaceOnce(html, from, to) {
  const count = html.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`build-he: expected "${from.slice(0, 60)}" once in index.html, found it ${count} times`);
  }
  return html.replace(from, () => to);
}

function escapeAttribute(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildHebrewPage() {
  const { t, attributes, faq } = loadHebrew();
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  html = replaceOnce(html, '<!DOCTYPE html>\n<html lang="en">',
    '<!DOCTYPE html>\n<!-- Made from index.html and lang.js by scripts/build-he.js. Do not edit, run: npm run build -->\n<html lang="he" dir="rtl">');

  // this is already the Hebrew page
  html = html.replace(/  <!-- redirect-to-hebrew -->[\s\S]*?<!-- \/redirect-to-hebrew -->\n/, '');
  html = replaceOnce(html, 'var isHe = false;', 'var isHe = true; ');

  // head
  html = html.replace(/(<meta name="description" content=)'[^']*'/, (m, start) => `${start}"${escapeAttribute(t.description)}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${t.title}</title>`);
  html = replaceOnce(html, `<link rel="canonical" href="${site}">`, `<link rel="canonical" href="${site}he/">`);
  const meta = {
    'og:site_name': t.heading,
    'og:title': t.title,
    'og:description': t.description,
    'og:url': `${site}he/`,
    'og:image:alt': t.imagealt,
    'og:locale': 'he_IL',
    'og:locale:alternate': 'en_US',
  };
  for (const [property, content] of Object.entries(meta)) {
    html = html.replace(new RegExp(`(<meta property="${property}" content=")[^"]*(")`), (m, a, b) => a + escapeAttribute(content) + b);
  }

  // structured data in Hebrew
  html = html.replace(/(<script type="application\/ld\+json">\n)([\s\S]*?)(\n  <\/script>)/g, (m, open, json, close) => {
    const data = JSON.parse(json);
    if (data['@type'] === 'WebApplication') {
      data.alternateName = data.name;
      data.name = t.heading;
      data.url = `${site}he/`;
      data.description = t.description;
    } else if (data['@type'] === 'FAQPage') {
      data.mainEntity = faq.map(([question, answer]) => ({
        '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } }));
    }
    return open + '  ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n  ') + close;
  });

  // files are one folder up (he/ has its own manifest.webmanifest)
  for (const file of ['drycloth.svg', 'calc.js', 'clothlineclock.jpg']) {
    html = html.replace(new RegExp(`(src|href)="${file.replace('.', '\\.')}"`, 'g'), `$1="../${file}"`);
  }
  html = html.replace(/href="icons\//g, 'href="../icons/');
  html = replaceOnce(html, 'navigator.serviceWorker.register("sw.js")', 'navigator.serviceWorker.register("../sw.js")');
  html = replaceOnce(html, '<meta name="apple-mobile-web-app-title" content="Drying time">', '<meta name="apple-mobile-web-app-title" content="ייבוש כביסה">');

  // the link to the English page
  html = replaceOnce(html, '<a id="langswitch" class="lang" href="he/">עב</a>', '<a id="langswitch" class="lang" href="../">En</a>');

  // texts: <tag ... data-i18n="key" ...>English</tag>
  const used = new Set();
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, english, close) => {
    if (!(key in t)) {throw new Error(`build-he: no Hebrew text for data-i18n="${key}"`);}
    used.add(key);
    return open + t[key] + close;
  });
  // attributes: data-i18n-href="key" etc.
  for (const attribute of attributes) {
    html = html.replace(new RegExp(`<[^>]*\\sdata-i18n-${attribute}="([^"]+)"[^>]*>`, 'g'), (tag, key) => {
      if (!(key in t)) {throw new Error(`build-he: no Hebrew text for data-i18n-${attribute}="${key}"`);}
      used.add(key);
      return tag.replace(new RegExp(`(\\s${attribute}=")[^"]*(")`), (m, a, b) => a + escapeAttribute(t[key]) + b);
    });
  }

  const unused = Object.keys(t).filter(key => !used.has(key) && !['title', 'description'].includes(key));
  if (unused.length) {throw new Error(`build-he: Hebrew texts not used in index.html: ${unused.join(', ')}`);}
  return html;
}

module.exports = { buildHebrewPage };

if (require.main === module) {
  fs.mkdirSync(path.join(root, 'he'), { recursive: true });
  fs.writeFileSync(path.join(root, 'he', 'index.html'), buildHebrewPage());
  console.log('he/index.html updated');
}
