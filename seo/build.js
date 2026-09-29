// Builds premier-seo-brief.html from brief.src.html + SEO-AEO-PLAYBOOK.md.
// Run from the repo root or this folder: node seo/build.js
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, "brief.src.html"), "utf8");
const md = fs.readFileSync(path.join(dir, "SEO-AEO-PLAYBOOK.md"), "utf8");
if (/<\/script/i.test(md)) throw new Error("Playbook must not contain </script>");

const out = src.replace("<!--PLAYBOOK-->", () => md);
fs.writeFileSync(path.join(dir, "premier-seo-brief.html"), out);
console.log("Wrote seo/premier-seo-brief.html (" + out.length + " bytes)");
