const fs = require('fs');
const a = require('./articles-clean.json');
for (const x of a) {
  // drop the duplicated article title heading (the post title carries it)
  const i = x.body.indexOf('<h2>');
  if (i >= 0 && i < 200) {
    const j = x.body.indexOf('</h2>', i);
    const h = x.body.slice(i + 4, j).replace(/<[^>]+>/g, '').trim();
    if (h.slice(0, 20) === x.title.slice(0, 20)) x.body = (x.body.slice(0, i) + x.body.slice(j + 5)).trim();
  }
  // keep the photo credit, styled as a caption
  x.body = x.body.replace('<p>Professor Toshio Goto. Source IMD Business School</p>', '<p><em>Photo: Professor Toshio Goto. Source: IMD Business School.</em></p>');
  if (/christian-stewart/.test(x.slug)) x.title = 'Christian Stewart\u2019s The Value of Family Meetings During the Pandemic';
}
fs.writeFileSync('articles-clean.json', JSON.stringify(a));
for (const x of a) console.log(x.title.slice(0, 48), '| starts:', x.body.slice(0, 80).replace(/\n/g, ' '));
