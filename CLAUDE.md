# CLAUDE.md — ClassicCottrell Portfolio Site

This file documents the codebase structure, conventions, and development workflows for AI assistants working in this repository.

---

## Project Overview

Personal portfolio website for Matthew A. Cottrell, hosted on **GitHub Pages** at `https://classiccottrell.github.io`. It is a **hybrid static site**: traditional HTML/CSS pages for the main structure with React components (compiled via Vite) embedded as interactive islands.

---

## Repository Structure

```
classiccottrell.github.io/
├── index.html              # Home page
├── art.html                # Art/films gallery (grid + timeline views)
├── sandbox.html            # Interactive HTML/CSS/JS code editor
├── header.html             # Shared site header partial
├── footer.html             # Shared site footer partial
├── styles.css              # Global CSS with design tokens (665 lines)
├── package.json            # npm config — React, MUI, Vite, Storybook
├── vite.config.js          # Vite build config (outputs to /assets/)
├── netlify.toml            # Netlify deployment config (publishes root)
├── .gitignore              # Excludes node_modules only
├── src/
│   ├── main.jsx            # React entry point → mounts ArtChart
│   └── ArtChart.jsx        # MUI ScatterChart film timeline component
├── stories/                # Storybook stories
│   ├── ArtCard.stories.js
│   ├── Colors.stories.js
│   └── Typography.stories.js
├── .storybook/
│   ├── main.js             # Storybook config (html-vite framework)
│   └── preview.js          # Imports global styles.css
├── data/
│   └── art_data.json       # Film data: title, director, quote, actor, year, image
├── img/                    # Images and SVG icons
│   ├── Imag-Matthew.png    # Profile photo
│   ├── favicon.png
│   ├── gents-lg.png        # The Gentlemen
│   ├── taxi-lg.png         # Taxi Driver
│   ├── apoc-lg.png         # Apocalypse Now
│   ├── linked.svg          # LinkedIn icon
│   ├── instagram.svg       # Instagram icon
│   └── cc-movie-series/    # Additional screenshot assets
├── accessibility/
│   ├── VPAT.md             # WCAG 2.1 / Section 508 audit report
│   └── top_improvements.md # Prioritized a11y fix list
└── dist/                   # Vite build output (not committed; auto-generated)
    └── assets/
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Pages | Vanilla HTML5 + CSS |
| Styling | CSS custom properties (design tokens) in `styles.css` |
| React components | React 18 + MUI 5 + MUI X-Charts 6 |
| Build tool | Vite 5 with `@vitejs/plugin-react` |
| Component docs | Storybook 7 (`@storybook/html-vite`) |
| Fonts | Google Fonts: Rosarivo (serif) + Red Hat Display (sans-serif) |
| Hosting | GitHub Pages (auto-deploy on push to `master`) |
| Alt hosting | Netlify (config present, publishes root directory) |

---

## Development Commands

```bash
npm install            # Install all dependencies

npm run dev            # Start Vite dev server (hot reload for React/JSX)
npm run build          # Build React components → dist/assets/
npm run preview        # Preview the Vite production build

npm run storybook      # Storybook dev server at http://localhost:6006
npm run build-storybook # Build static Storybook output
```

**Serving the full HTML site locally** (needed for header/footer fetch() partials to load):
```bash
npx http-server .
# or
http-server .
# Visit http://localhost:8080
```

Vite dev server (`npm run dev`) only serves the React entry point, not the static HTML pages. Use `http-server` to develop the full site with header/footer partials loading correctly.

---

## Architecture Patterns

### Header & Footer Partials

`header.html` and `footer.html` are standalone HTML fragments loaded dynamically into each page via `fetch()` inside a `<script>` block. Every page that needs the nav bar or footer must include this fetch pattern. This is a lightweight alternative to a templating system.

### React Islands

The site is not a React SPA. React is used only for the interactive `ArtChart` component on `art.html`. The React app mounts to `<div id="art-chart-root">` and is loaded via the compiled `dist/assets/main.js` script. When adding new interactive features, consider whether a React component island is appropriate or whether vanilla JS suffices.

### Data Layer

Film/art data lives in `data/art_data.json` as a flat array of objects. The art page consumes this JSON via fetch. The `ArtChart.jsx` component currently has its film data inlined (not reading from `art_data.json`) — these two sources should be kept in sync when films are added or removed.

### Build Output

Vite compiles `src/main.jsx` and outputs deterministic filenames (no content hashes) to `dist/assets/`:
- `dist/assets/main.js`
- `dist/assets/main.css` (if any)

The HTML pages reference these compiled files. After adding or changing React components, run `npm run build` and commit the `dist/` changes if that directory is tracked.

---

## Design System

### CSS Custom Properties (defined in `:root` in `styles.css`)

**Brand colors:**
- `--color-primary`: `#777C6D` (muted olive)
- `--color-accent`: `#437057` (forest green — used for interactive elements and chart dots)
- Hover/active state variants off the accent

**Neutral scale** (warm grays):
- `--neutral-50`: `#F9F5F1` (cream — page background)
- `--neutral-900`: `#1A1A1A` (near-black)

**Typography:**
- Display/decorative: `Rosarivo` (serif)
- Body/UI: `Red Hat Display` (sans-serif)

When adding new styles, use the existing CSS custom properties instead of hardcoding hex values.

### MUI Theme

`ArtChart.jsx` creates a local MUI theme that sets `fontFamily` to `"Red Hat Display"` and `primary.main` to `#777C6D`. Keep MUI components consistent with this theme configuration.

---

## Content Conventions

### Adding a New Film to the Art Page

1. Add an entry to `data/art_data.json` with all required fields:
   ```json
   {
     "id": <next integer>,
     "quote": "<memorable quote>",
     "film": "<Film Title>",
     "director": "<Director Name>",
     "character": "<Character Name>",
     "runTime": "<Xh Xm>",
     "actor": "<Actor Name>",
     "year": <YYYY>,
     "image": "img/<filename>.png",
     "bgClass": "bg-white"
   }
   ```
2. Add the film's image to `/img/` (large format, `-lg.png` naming convention).
3. Update the inline `data` array in `src/ArtChart.jsx` to include the same film so the timeline chart reflects it.
4. Run `npm run build` after updating the React component.

### Images

- Profile and film images use `.png` format.
- Icons use `.svg`.
- Large film images follow the `<shortname>-lg.png` naming pattern.
- Place all images in `/img/`.

---

## Accessibility Notes

Known issues documented in `accessibility/top_improvements.md`:

1. **Critical** — `<head>` content is placed inside `<body>` in some pages (invalid HTML). Fix by ensuring proper document structure.
2. **Moderate** — Footer copyright text (`#888`) has insufficient color contrast against the background. Target `#767676` or darker per WCAG AA.
3. **Moderate** — No "Skip to Content" link for keyboard navigation. Add one as the first focusable element in `header.html`.

When making HTML changes, do not introduce new accessibility regressions. Run an axe or Lighthouse accessibility audit if uncertain.

---

## Deployment

### GitHub Pages (primary)

Push to `master` triggers automatic deployment. No build step runs server-side — the pre-built `dist/` files and all static assets must be committed.

```bash
git add .
git commit -m "Description of change"
git push origin master
# Live at https://classiccottrell.github.io within ~60 seconds
```

### Netlify (alternative)

`netlify.toml` publishes the root directory with no build command. Netlify can be used as a fallback or staging environment.

---

## Branch Conventions

- `master` — production branch; deploys to GitHub Pages on push
- `claude/*` — AI assistant working branches; open a PR before merging to master

---

## Storybook

Stories live in `/stories/` and cover:
- `Colors.stories.js` — the design token color palette
- `Typography.stories.js` — font families and type scale
- `ArtCard.stories.js` — the art gallery card component

Storybook uses the `@storybook/html-vite` framework (not `@storybook/react`), so stories are written as HTML string templates or DOM factories, not JSX. The global `styles.css` is imported in `.storybook/preview.js`.

---

## Key Files Quick Reference

| File | Purpose |
|---|---|
| `styles.css` | Single source of truth for all visual styling and design tokens |
| `data/art_data.json` | All film/art content data |
| `src/ArtChart.jsx` | Interactive film timeline visualization (React + MUI) |
| `src/main.jsx` | React entry point; mounts to `#art-chart-root` |
| `header.html` / `footer.html` | Shared site chrome; fetched into every page |
| `vite.config.js` | Build config; outputs to `assets/` with stable filenames |
| `accessibility/VPAT.md` | Full WCAG 2.1 / Section 508 conformance report |
