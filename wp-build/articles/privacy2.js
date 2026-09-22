const fs = require('fs');
let h = fs.readFileSync('privacy-clean.html', 'utf8');
// decode the Cloudflare-obfuscated email so we can see what the old policy listed
const cf = (h.match(/email-protection#([0-9a-f]+)/) || [])[1];
let email = '';
if (cf) { const k = parseInt(cf.slice(0, 2), 16); for (let i = 2; i < cf.length; i += 2) email += String.fromCharCode(parseInt(cf.slice(i, i + 2), 16) ^ k); }
h = h.slice(0, h.indexOf('<!-- mfn_hook_content_after -->'));
h = h.replace(/<!--[\s\S]*?-->/g, '').replace(/<br>/g, '');
h = h.replace(/^\s*<h3>Privacy Policy<\/h3>\s*<h4>Privacy Policy<\/h4>\s*/, '');
// section titles are short h4 lines without a full stop; everything else is body copy
h = h.replace(/<h4>([\s\S]*?)<\/h4>/g, (m, inner) => {
  const txt = inner.replace(/<[^>]+>/g, '').trim();
  if (/^Last updated/i.test(txt)) return '<p><em>' + txt + '</em></p>';
  if (txt.length < 70 && !/[.:;]$/.test(txt) && !/^•/.test(txt)) return '<h3>' + txt + '</h3>';
  return '<p>' + inner.trim() + '</p>';
});
h = h.replace(/<h3><strong>([\s\S]*?)<\/strong><\/h3>/g, '<h3>$1</h3>');
// current contact details replace the 2020 ones
h = h.replace(/<p>• By email:[\s\S]*$/, '<ul><li>By email: <a href="mailto:info@premierfamilybusiness.com">info@premierfamilybusiness.com</a></li><li>By visiting our <a href="/get-in-touch/">Get in Touch</a> page</li><li>By phone: +63 32 252 3504 or 0917 316 9881</li></ul>');
h = h.replace(/\n\s*\n+/g, '\n').trim();
fs.writeFileSync('privacy-final.html', h);
console.log('old email:', email);
console.log('h3 count', (h.match(/<h3>/g) || []).length, '| p count', (h.match(/<p>/g) || []).length);
console.log(h.slice(0, 600)); console.log('...'); console.log(h.slice(-500));
