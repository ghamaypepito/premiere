# Ticket format

Copy this, fill it in, paste it. Whatever tracker it lives in, these are the
fields the work actually needs.

```
TICKET  PFB-000
TITLE   One line, what changes

PAGES   27 Home, 30 Family Enterprise Planning
        (ids drive the publish — see the table in WORKFLOW.md)

CHANGE
        What should be different, in plain words. Quote the exact copy if
        the wording matters; paraphrase if we are meant to write it.

ASSETS  Any images, logos or files, and where they are.
        Say "none" rather than leaving it blank.

DONE    How we both know it worked. Usually one sentence.

NOTES   Anything else: a deadline, a page to copy the pattern from, a
        decision still open.
```

## The fields that earn their place

**PAGES.** The one that matters most. The publish is limited to the page ids
in the ticket, so naming them turns the ticket straight into the command:

```js
window.__onlyPages = [27, 30];
```

If the pages are not obvious, say what you want and leave it to us to work
out — just do not leave it unsaid, because then the safe default is to publish
nothing.

**DONE.** Keeps the ticket from reopening a week later over a difference of
expectation. "The hero reads X and the old line is gone" settles it.

**ASSETS.** Missing images are the most common reason a ticket stalls. The
build skips a logo whose file is not in the Media Library rather than failing,
so a ticket can look finished while quietly rendering nothing.

## What is not a ticket

Text tweaks, image swaps and small content edits the client makes in
WordPress. Those stay in WordPress and need no ticket — that is what their
access is for.

**The dividing line:** if it came as a ticket, it belongs in the build. If it
did not, it is content and lives in WordPress. No judgement call needed.

## What happens to a ticket

1. `npm run check` — if the ticket's pages show `live only` lines, the client
   has edited them; reconcile before touching anything.
2. Build the change, `npm run preview`, screenshot back if it is visual.
3. Publish with `__onlyPages` set to the ticket's ids.
4. `npm run check` again — those pages should now match. That is the ticket
   closed.

A ticket touching the factual record (office details, milestone dates,
credentials, job titles, quotes) needs the client to confirm the new fact
first. We can rewrite positioning freely; we cannot invent a fact.
