# classiccottrell.github.io

The portfolio of Matthew A. Cottrell, product designer. Version 2, art
direction “Ink & Rule”: Bristol board, India ink, two blue pencils and one signal-yellow field.

The previous site is kept intact on the [`v1-classic`](https://github.com/Classiccottrell/classiccottrell.github.io/tree/v1-classic) branch.

## How it works

Every page is generated from the JSON files in `data/` by a small Node build
(`scripts/build.mjs`) and committed. GitHub Pages and Netlify serve the repo
exactly as it is, with no build step on the host. There is no framework and no
bundler, and every page reads with JavaScript turned off. `assets/js/site.js`
only adds the optional layer: the portrait's ink and signature, take it apart (on the home page,
where page scroll and the slider are one control, and on the Terry guide, whose layers follow the step being read), prompt copy buttons, hot takes,
the brief's work order, Pencils (redline) mode and Run the checks.

```
data/                 the content: edit these, then npm run build
  site.json           name, headline, description, availability, navigation, links, bio, url
  work.json           case studies: title block fields, plate, callouts, sections
  guide.json          the Terry build-your-own guide: steps, prompts, known mistakes, Substack sources
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
  linefield/          the baked linefield pieces in the ink band, one per hot take (made by the build)
  vendor/axe.min.js   axe-core for Run the checks (copied by the build)
source/               originals: drawings, screenshots, covers, the portrait, Terry, linefield
scripts/              build, images, cards, contact sheet, contrast check, local server
tests/                Playwright: axe on every page, no-JS, redirects, interactions, budgets
```

Generated output: `index.html`, `404.html`, `work/` (including the guide at
`work/terry-home-lab/guide/`, drawn by `scripts/lib/guide.mjs` and `lab.mjs`), `takes/`, `work-with-me/`,
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
npm run check:contrast   # every colour pair in both polarities (4.5:1; the focus ring on signal 3:1)
npm run images           # re-make assets/img from source/ (after adding a drawing, say)
npm run cards            # re-make the share cards (after changing titles or takes)
npm run contact-sheet    # every page at 390, 768 and 1440 px, light and dark, into contact-sheet/
npm run serve            # http://127.0.0.1:4173 (PORT=4174 for another port; npm test honours it too)
npm test                 # build check, contrast check, then the Playwright suite
```

`npm run cards`, `npm run contact-sheet` and `npm test` use Playwright's
Chromium (`npx playwright install chromium` once). To use a Chromium that's
already installed, set `PW_CHROMIUM=/path/to/chrome`.

## Common edits

- **The headline:** `data/site.json` → `headline`. `*simpler.*` is the inline-emphasis mark the build already
  supports: the home h1 sets it in Newsreader italic, `plain()` strips it for meta, og/twitter and the share cards
  (the card prints it italic), and the About lede reuses it. `description` carries the same sentence for meta and schema.
- **Home structure:** the first fold is exactly five things: wordmark, nav, headline, portrait with its signature,
  and one `Selected work ↓` link. Below it: Selected work (the first three `featured` projects in `data/work.json`,
  large 16:9 pictures, one line each, each opening its product, or the case study when there isn't one), Take it apart,
  the hot takes band, How I work (three rules), Drawings, Writing. The standfirst lives in About's bio.
- **Colour:** tokens are at the top of `assets/css/site.css`. `--signal` (#EDB02A; #C98F12 in the dark scheme) is a flat
  *field* only: the portrait's slab on the home and About pages, at most one per screen. Never text, an underline, a
  focus ring or a status dot (1.94:1 on white). Ink on it is `--slab-ink` (#111111) in both schemes, which is also what
  the home masthead and the signature use over the slab. `--mat` and `--hair` are the neutral picture mat and hairline.
  Add a token, then add its pairs to `PAIRS` in `scripts/check-contrast.mjs`.
- **Availability:** `data/site.json` → `availability` (`mark` is `live`, `prog`,
  `priv` or `ship`). It's stamped into the footer and Work with me (the masthead keeps only the nav and `Work with me`).
- **A new case study:** add an entry to `data/work.json`, put its screenshot in
  `source/work/`, add it to `scripts/images.mjs`, then `npm run images && npm run build && npm run cards`.
  A plate much wider than it is tall crops badly into the share card; give the
  entry a `cardImage` (Terry Time's is in `source/work/`) and the card uses that.
  With no public `links`, the title block says "Private repository" unless
  `linksNote` says something truer (Creative services: the sites retired).
- **A new guide page:** the Terry guide is the pattern. Content goes in a data file
  (`data/guide.json`), the page in a `scripts/lib/` module, and one entry in the `pages`
  list of `scripts/build.mjs` (nested under its case study, so no `guide.html` can hide it).
  Add the path to `GUIDE`/`PAGES`/`CARDS` in `tests/helpers.js`, the contact sheet and
  `scripts/cards.mjs`. Outside links (the Substack post) live in the data file's `sources`.
- **The signature:** his real pencil signature is two marks side by side, `a` then `b` (left to right, as on
  the paper), traced with potrace into `source/signature-a.svg` and `source/signature-b.svg`. The build
  (`scripts/lib/signature.mjs`) drops each trace's background rectangle, keeps each mark as one filled path and
  lays them in one shared viewBox, tops aligned, `portrait.signature.gap` (x a mark's width) apart. In
  `data/site.json`, `takes.<x>.stem` and `.bar` are the hand-placed centerlines (in that trace's own
  coordinates) that reveal each mark like a pen; marks draw in `takes` key order: a stem, a bar, b stem, b bar,
  ~2s once the ink is down (timings in `site.css`, `.sig .m1`-`.m4`). It sits fully drawn with no JS or
  reduced motion.
- **Navigation:** `nav` in `data/site.json` (Work, Takes, Writing, Drawings, About) plus `Work with me` at the right.
  Below 860px it collapses to a Menu disclosure holding the same links; on the home page the full nav only shows from 1100px
  so it always sits on the slab, and the Menu button is used between.
- **Hot-take pieces:** `STAGE_ART` in `scripts/lib/pages.mjs` lists the linefield pieces in the order the
  takes use them (take n gets piece n mod 5). A new piece is a baked export from linefield's `downloads/`
  copied into `source/linefield/` (the build bakes the reduced-motion hold in), then added to that list.
- **The Terry exploded view:** the seven sheets are inline SVG in `scripts/lib/lab.mjs`;
  `assets/js/site.js` ("the lab") lifts the sheet for the step being read. The plate for
  its case study is a screenshot composed into `source/work/terry-home-lab.png`; redo it
  if the drawings change.
- **Inline marks:** text in `data/` can use `` `code` ``, `*emphasis*` and
  `[a link](/work/forma/)` to another page on this site. The build fails if a
  link doesn't land on a page it writes.
- **Retire a take:** set `"retired": { "date": "2027-01-15", "reason": "…" }` in
  `data/takes.json`. It moves to a Retired list on /takes/ and its page goes away.
- **The inked self-portrait:** replace `source/self/ink.png` (black ink on a
  transparent background, 900 × 1075), run `npm run images`. It sits on the signal slab and is revealed by the
  inking animation; the pencil layer (also made by `npm run images`) is no longer shown. Then update `portrait` in `data/site.json`.
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
- **The address:** `url` in `data/site.json` is https://classiccottrell.ca (on
  Netlify). It sets canonical links, share cards and the sitemap, so the GitHub
  Pages copy points search engines at the .ca address too. Change it, then
  `npm run build`.

## Credits

Fonts under the SIL Open Font License (`assets/fonts/OFL-*.txt`). axe-core
under the Mozilla Public License 2.0. Grain Field, Terminator, Dark Nebula, Infall and Longwave are from
[linefield](https://github.com/Classiccottrell/linefield) (MIT). Terry drew himself.
