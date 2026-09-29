// Build for Hostinger:
//   1. public/app/seed-pages.json  (starting briefs + scores, generated from the shared rules)
//   2. public/app/playbook.md      (copied from seo/SEO-AEO-PLAYBOOK.md; served only to signed-in users)
//   3. dist/premier-visibility-hostinger.zip with --zip (upload and extract into the subdomain folder)
import { writeFileSync, copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PAGES, blank, evaluate, scoreOf } from "../public/js/rules.js";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const seed = PAGES.map((t) => { const b = blank(t); const s = scoreOf(evaluate(b)); return { id: t.id, name: t.name, url: t.url, type: t.type, brief: b, score: s.total, fails: s.fails }; });
writeFileSync(here("../public/app/seed-pages.json"), JSON.stringify(seed));
console.log(`seed-pages.json: ${seed.length} pages`);

const pb = here("../../seo/SEO-AEO-PLAYBOOK.md");
if (existsSync(pb)) { copyFileSync(pb, here("../public/app/playbook.md")); console.log("playbook.md copied"); }

if (process.argv.includes("--zip")) {
  const dist = here("../dist/"); mkdirSync(dist, { recursive: true });
  const zip = dist + "premier-visibility-hostinger.zip"; rmSync(zip, { force: true });
  execFileSync("zip", ["-rqX", zip, ".", "-x", "app/config.php", "*.DS_Store", "*.db", "*.db-*"], { cwd: here("../public/") });
  console.log("dist/premier-visibility-hostinger.zip written");
  const wp = dist + "premier-visibility-connector.zip"; rmSync(wp, { force: true });
  execFileSync("zip", ["-rqX", wp, "premier-visibility-connector"], { cwd: here("../wp-connector/") });
  console.log("dist/premier-visibility-connector.zip written");
}
