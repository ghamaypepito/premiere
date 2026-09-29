// Copies the SEO/AEO playbook into public/ so the app can show it. Vercel runs this as the build step.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const src = fileURLToPath(new URL("../../seo/SEO-AEO-PLAYBOOK.md", import.meta.url));
const dst = fileURLToPath(new URL("../public/playbook.md", import.meta.url));
if (existsSync(src)) { copyFileSync(src, dst); console.log("Copied playbook"); }
else if (existsSync(dst)) console.log("Playbook source not found; keeping public/playbook.md");
else throw new Error("SEO-AEO-PLAYBOOK.md not found");
