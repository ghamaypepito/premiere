const fs = require('fs');
let b = fs.readFileSync('premier-elementor-build.txt', 'utf8');
let sec = fs.readFileSync('new-pages-section.txt', 'utf8');
const priv = fs.readFileSync('articles/privacy-final.html', 'utf8');
sec = sec.replace('__PRIVACY_HTML__', () => JSON.stringify(priv));
const a = b.indexOf('/* ---------- EVENTS ---------- */'), c = b.indexOf('/* ---------- CONTACT ---------- */');
if (a < 0 || c < 0) throw new Error('markers missing');
b = b.slice(0, a) + sec + b.slice(c);
b = b.replace("[35,'Resources',resources],[36,'Get in Touch',contact]];",
  "[35,'Resources',resources],[36,'Get in Touch',contact],\n  [155,'Our Team',team],[156,'Jon Ramos',profileJon],[157,'Neil Arnold Montescarlos',profileNeil],[158,'Ma. Theresa B. Ramos',profileThresa],[159,'FAQs',faqs],[3,'Privacy Policy',privacy]];");
fs.writeFileSync('premier-elementor-build.txt', b);
new Function('return ' + b);
console.log('ok, bytes', b.length, '| pages:', (b.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
