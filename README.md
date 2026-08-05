# ClassicCottrell Portfolio Site

A minimal, fast-loading personal portfolio website hosted on **GitHub Pages**, featuring reusable headers/footers, responsive layouts, and simple HTML/CSS/JS architecture.

---

## 🚀 Features
- Reusable `header.html` and `footer.html` loaded with JavaScript
- Mobile-responsive layout
- Google Fonts integration
- Social icons (LinkedIn + Instagram)
- Lightweight HTML/CSS (no frameworks)
- Easy to maintain and extend

---

## 📁 Project Structure
```
classiccottrell.github.io/
│
├── index.html
├── about.html          (or other future pages)
├── header.html         (reusable site header)
├── footer.html         (reusable site footer)
├── styles.css
├── script.js           (loads header/footer)
├── playwright.config.js (browser test configuration)
├── tests/              (Playwright browser checks)
│
└── img/
    ├── Imag-Matthew.png
    ├── linked.svg
    └── instagram.svg
```

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
- `header.html` loads
- `footer.html` loads
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
