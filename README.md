# ClassicCottrell Portfolio Site

A minimal, fast-loading personal portfolio website hosted on **GitHub Pages**, featuring reusable headers/footers, responsive layouts, and simple HTML/CSS/JS architecture.

---

## 🚀 Features
- Reusable `header.html` and `footer.html` inlined into every page at build time (`npm run build:html`) — no runtime fetch, no flash-of-missing-nav with JS disabled
- Mobile-responsive layout
- Google Fonts integration
- Social icons
- Lightweight HTML/CSS (no frameworks)
- Easy to maintain and extend

---

## 📁 Project Structure
```
classiccottrell.github.io/
│
├── index.html
├── about.html          (or other future pages)
├── header.html         (source of truth for site header — inlined by scripts/build-html.mjs)
├── footer.html         (source of truth for site footer — inlined by scripts/build-html.mjs)
├── scripts/build-html.mjs (inlines header/footer into each page; --check verifies sync)
├── styles.css
├── nav.js              (mobile nav drawer + theme select wiring)
├── playwright.config.js (browser test configuration)
├── tests/              (Playwright browser checks)
│
└── img/
    ├── Imag-Matthew.png
    ├── linked.svg
    └── instagram.svg
```

---

## 🔧 Header/Footer Build Step
`header.html` and `footer.html` are the source of truth. They are **not** loaded at
runtime — `scripts/build-html.mjs` inlines them into each page's
`<div id="header">`/`<div id="footer">` (between `<!-- build:header -->` /
`<!-- build:footer -->` sentinel comments) so the site renders fully with
JavaScript disabled and without layout shift.

**Whenever you edit `header.html` or `footer.html`, you must run:**
```bash
npm run build:html
```
and commit the resulting changes to `index.html`, `art.html`, `projects.html`,
`writing.html`, and `sandbox.html` before pushing. This site has no CI build
step (GitHub Pages / Netlify serve the raw committed repo — see `netlify.toml`),
so the inlined HTML must already be correct in the committed files.

To verify the pages are in sync (e.g. in a pre-commit hook or CI check) without
writing anything:
```bash
npm run build:html:check
```
This exits non-zero and lists any page that doesn't match `header.html`/`footer.html`.

`npm run build` (the Vite/React build for other assets) also runs `build:html`
automatically via `prebuild`, but the HTML build must still be run and committed
manually for plain GitHub Pages / Netlify deploys, which don't run `npm run build`.

---

## 🛠 Local Development (with http-server)
To view the site locally and allow inline HTML imports:

### **1. Navigate to the project folder:**
```bash
cd /path/to/classiccottrell.github.io
```

### **2. Start the local server:**
If installed globally:
```bash
http-server .
```
Or using npx:
```bash
npx http-server .
```
Your site will be visible at:
```
http://localhost:8080
```

### **3. Verify includes:**
- Header/footer content is visible immediately (inlined at build time, no fetch)
- Icons/images appear
- No console errors

### **4. Run browser checks:**
```bash
npm run test:browser
```

---

## 💾 Deployment (GitHub Pages)
After making changes:

### **1. Stage changes**
```bash
git add .
```

### **2. Commit**
```bash
git commit -m "Update site"
```

### **3. Push**
```bash
git push
```
Your live site will update automatically:
```
https://classiccottrell.github.io
```
(Propagation usually takes 10–60 seconds.)

---

## 📱 Responsive Design Notes
Mobile adjustments use media queries in `styles.css`, for example:
```css
@
