# Working alongside the client

The client edits the live site during office hours, Philippine time, and their
changes are small: text, content, the occasional image. No new pages, no
restructuring.

That single fact decides the workflow, because it means **WordPress is now the
source of truth for content, and the build is the source of truth for
structure.** Those are different things and they must not fight.

## Who owns what

| | Owner | Lives in |
|---|---|---|
| Copy tweaks, image swaps, small content edits | **The client** | WordPress |
| New pages, new sections, layout, design, anything repeated across pages | **Us** | the build script |

A change the client can make in Elementor in two minutes should be made there,
not routed through us. Pulling it into the build only to publish it back adds a
round trip and a chance to destroy something.

## The rule that prevents the accident

**Never republish all seventeen pages again.** There is no reason to, and it is
the only way their work gets destroyed.

Before pasting the build, set the pages you actually changed:

```js
window.__onlyPages = [27];     // then paste premier-elementor-build.txt
```

Every other page is skipped untouched. One edited page means one page at risk
instead of seventeen.

| id | page | id | page |
|---|---|---|---|
| 3 | Privacy Policy | 35 | Resources |
| 27 | Home | 36 | Get in Touch |
| 28 | Who We Are | 155 | Our Team |
| 29 | What We Do | 156 | Jon Ramos |
| 30 | Family Enterprise Planning | 157 | Neil Arnold Montesclaros |
| 31 | Organizational Systems Effectiveness | 158 | Ma. Theresa B. Ramos |
| 32 | Key Process Management Consulting | 159 | FAQs |
| 33 | Building Effective Governance | 337 | Legacy in Action |
| 34 | Events | | |

`premier-theme-parts.txt` only writes templates 606 and 609. It never touches a
page, so it is always safe to run whole.

## The loop, for an ordinary change

1. **`npm run check`** — twenty seconds, no export. Any `live only` line is the
   client's work that is not in the build.
2. **If the page you are about to change is clean**, change it, preview, publish
   that one page id. Done.
3. **If it has drifted**, ask for an export, `npm run pull <export.xml>`,
   `npm run compare`, port their edit into the build, then publish that page.
4. **`npm run check`** again. The page you touched should now match.

Step 1 is the whole discipline. Everything else follows from what it says.

## Timing

Publish outside Philippine office hours where you can. A save that lands while
someone has the page open in Elementor means their next save overwrites yours,
or yours overwrote theirs and nobody notices for a week. Early morning or
evening PHT costs nothing and removes the collision entirely.

## Reconciling, about once a week

Even with the rule above, the build drifts behind on pages nobody has needed to
touch. Once a week, or before any larger piece of work:

```
ask for an export → npm run pull → npm run compare → port anything live has
```

This keeps the build a true mirror, so that when a structural change does come
along it can be published without first untangling a month of small edits.

## What to tell the client

Two things, and they are not restrictive:

- **Text and images: go ahead, any time.** That is what the access is for.
- **A new page or section: tell us first.** Not for permission — so we build it
  in the script, where it is version-controlled and reproducible, rather than it
  existing only in WordPress where the next structural publish could flatten it.

## What would change this

If publishing ever becomes automated (see `wp-build/AUTH-TEST.md`), none of the
above relaxes. A faster publish makes the drift check more important, not less,
because the window between checking and overwriting gets shorter.
