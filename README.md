# classiccottrell.github.io

The portfolio of Matthew A. Cottrell, product designer. Version 2, art
direction “Ink & Rule”: Bristol board, India ink and two blue pencils.

The previous site is kept intact on the [`v1-classic`](https://github.com/Classiccottrell/classiccottrell.github.io/tree/v1-classic) branch.

## How it works

Every page is generated from the JSON files in `data/` by a small Node build
(`scripts/build.mjs`) and committed. GitHub Pages and Netlify serve the repo
exactly as it is, with no build step on the host. There is no framework and no
bundler, and every page reads with JavaScript turned off. `assets/js/site.js`
only adds the optional layer: the pencil cursor, take it apart, hot takes,
the brief's work order, Pencils (redline) mode and Run the checks.

```
data/                 the content: edit these, then npm run build
  site.json           name, headline, availability, navigation, links, bio, url
  work.json           case studies: title block fields, plate, callouts, sections
  takes.json          hot takes with receipts (set "retired" to retire one in public)
  rules.json          the rules, R-01 onward
  writing.json        essays (they live on Substack)
  drawings.json       drawings, with credits and alt text
  hire.json           Work with me: offers, brief options, next steps, quotes
assets/
  css/site.css        the whole stylesheet, tokens first
  js/site.js          the optional layer
  js/terry-symbols.js Terry Time's footer, running live on its case study (only that page loads it)
  fonts/              Familjen Grotesk, Newsreader, Red Hat Mono (OFL)
  img/                images the site serves (made by npm run images)
  cards/              share cards, 1200 × 630 (made by npm run cards)
  linefield/          the baked linefield piece in the ink band (made by the build)
  vendor/axe.min.js   axe-core for Run the checks (copied by the build)
source/               originals: drawings, screenshots, covers, the portrait, Terry, linefield
scripts/              build, images, cards, contact sheet, contrast check, local server
tests/                Playwright: axe on every page, no-JS, redirects, interactions, budgets
```

Generated output: `index.html`, `404.html`, `work/`, `takes/`, `work-with-me/`,
`writing/`, `drawings/`, `about/`, `colophon/`, `sitemap.xml`, `robots.txt`, and
the stubs `projects.html` and `art.html` that forward old links (including
`projects.html#forma`-style hashes) to their new homes. Don't edit them by
hand; edit `data/` or `scripts/lib/` and rebuild.

A page and a folder can never share a name: Netlify serves `writing.html` for
both `/writing` and `/writing/`, which hides `writing/index.html`. So there is
no `writing.html` stub. Netlify 301s that old address, the 404 page forwards it
on GitHub Pages, and the build fails if a collision like that comes back.

## Commands

```bash
npm install
npm run build            # write every page from data/
npm run build:check      # fail if anything committed is out of date
npm run check:contrast   # every text colour pair in both polarities, at least 4.5:1
npm run images           # re-make assets/img from source/ (after adding a drawing, say)
npm run cards            # re-make the share cards (after changing titles or takes)
npm run contact-sheet    # every page at 390, 768 and 1440 px, light and dark, into contact-sheet/
npm run serve            # http://127.0.0.1:4173
npm test                 # build check, contrast check, then the Playwright suite
```

`npm run cards`, `npm run contact-sheet` and `npm test` use Playwright's
Chromium (`npx playwright install chromium` once). To use a Chromium that's
already installed, set `PW_CHROMIUM=/path/to/chrome`.

## Common edits

- **Availability:** `data/site.json` → `availability` (`mark` is `live`, `prog`,
  `priv` or `ship`). It's stamped into the masthead, the footer and Work with me.
- **A new case study:** add an entry to `data/work.json`, put its screenshot in
  `source/work/`, add it to `scripts/images.mjs`, then `npm run images && npm run build && npm run cards`.
  A plate much wider than it is tall crops badly into the share card; give the
  entry a `cardImage` (Terry Time's is in `source/work/`) and the card uses that.
  With no public `links`, the title block says "Private repository" unless
  `linksNote` says something truer (Creative services: the sites retired).
- **Inline marks:** text in `data/` can use `` `code` ``, `*emphasis*` and
  `[a link](/work/forma/)` to another page on this site. The build fails if a
  link doesn't land on a page it writes.
- **Retire a take:** set `"retired": { "date": "2027-01-15", "reason": "…" }` in
  `data/takes.json`. It moves to a Retired list on /takes/ and its page goes away.
- **The inked self-portrait:** replace `source/self/ink.png` (black ink on a
  transparent background, 900 × 1075), run `npm run images`; the pencil layer is
  generated from it. Then update `portrait` in `data/site.json`.
- **A drawing's year or medium:** `drawn` and `medium` in `data/drawings.json`
  appear in its credits as soon as they're set.

## Hosting

- **Netlify** (`netlify.toml`): publishes the folder as-is, 301s the old
  `.html` addresses, and caches `assets/` for a year (every asset URL carries a
  content hash). The brief on /work-with-me/ is a Netlify form: in the Netlify
  dashboard, turn on **Forms → form detection**, then add an email notification
  for the `brief` form.
- **GitHub Pages:** serves the same files (`.nojekyll` switches Jekyll off).
  Static hosts can't receive forms, so on this copy the brief offers to copy
  the work order and send it on LinkedIn instead.
- **The address:** `url` in `data/site.json` sets canonical links, share cards
  and the sitemap. Point it at classiccottrell.ca once that serves this site,
  then `npm run build`.

## Credits

Fonts under the SIL Open Font License (`assets/fonts/OFL-*.txt`). axe-core
under the Mozilla Public License 2.0. Grain Field is from
[linefield](https://github.com/Classiccottrell/linefield) (MIT). Terry drew himself.
