// Edge redirects for premierfamilybusiness.com, for old URLs that WordPress no longer serves.
// Only the paths in wrangler.toml's route reach this Worker; anything not listed here passes through untouched.
const REDIRECTS = {
  // Old services hub (linked from three articles) → the current What We Do page.
  "/how-we-help-families-in-business": "/what-we-do/",
  "/how-we-help-families-in-business/": "/what-we-do/",
};

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const to = REDIRECTS[url.pathname];
    if (to) return Response.redirect(url.origin + to + url.search, 301);
    return fetch(req);
  },
};
