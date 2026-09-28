# Pulling Elementor data back out of WordPress

The build script is a generator: it writes Elementor's JSON into WordPress. That
is one-way. Anyone editing a page in Elementor changes WordPress only, and the
next build overwrites them.

These two scripts close that loop.

## Why not the REST API

Elementor stores its document in `_elementor_data`. The leading underscore makes
it protected meta, which WordPress excludes from REST even for an authenticated
request, so an application password does not help. WP-CLI reads it straight from
the database. It also avoids the CDN in front of this site, which strips the
`Authorization` header.

## 1. Pull, on the server

```bash
ssh <user>@<host>
cd ~/domains/<domain>/public_html
bash pull-elementor.sh
```

Writes `pfb-export/` — one JSON file per Elementor page and Theme Builder
template, plus a manifest with titles and modification times — and tars it.

Download `pfb-export.tar.gz` and unpack its contents into `wp-build/sync/pulled/`.

**Commit that directory.** It is the backup: the actual Elementor source for
every page, in git, diffable between pulls.

## 2. Compare, locally

```bash
node wp-build/sync/compare.js
```

Reports, per page, whether WordPress matches what the build would publish:

```
CHANGED  27  Home   (last modified 2026-09-27T07:36:39)
   build:   widget:heading | Uniting families in business, across generations.
   live :   widget:heading | Helping families thrive, generation after generation.

16 unchanged, 1 changed in WordPress, 2 not from the build
```

Element ids are random on every generate and Elementor adds keys on save, so a
deep comparison would flag every page. Each tree is reduced to a content
fingerprint instead — element types and the text they carry, in order — which
catches copy edits, added or removed sections and reordering, and ignores the
rest.

## 3. Reconcile

A changed page means someone edited it in Elementor. Republishing overwrites
that edit, so port it into the build script first, or decide the page is now
owned by WordPress and stop republishing it.

Capture is automatic. Reconciliation is a judgement call and always will be —
the build is hand-written code that generates the JSON, and going backwards from
a visual edit to a change in that code is reading, not transforming.

## Run it before every build

Two minutes, and it is the difference between knowing you are about to overwrite
someone's work and finding out afterwards.
