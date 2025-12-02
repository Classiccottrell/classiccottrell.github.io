# Top 3 Accessibility Improvements

## 1. Fix Invalid HTML Structure (Critical)
**Issue**: In `index.html`, the `<head>` section is currently nested *inside* the `<body>` tag.
**Why it matters**: This is invalid HTML. Browsers try to fix it, but it can cause screen readers to fail in announcing the page title or language correctly. It can also break SEO meta tags.
**Fix**: Move the `<head>` block before the `<body>` block.

## 2. Improve Color Contrast (Moderate)
**Issue**: The copyright text in the footer uses color `#888888`, which has a contrast ratio of 3.5:1 against the background. WCAG AA requires 4.5:1 for small text.
**Why it matters**: Users with low vision or poor screens may not be able to read this text.
**Fix**: Change the color variable `--text-copyright` in `styles.css` to `#757575` or darker.

## 3. Add "Skip to Content" Link (Moderate)
**Issue**: Keyboard users must tab through all header links before reaching the main content.
**Why it matters**: This is repetitive and tiring for users relying on keyboards or switch devices.
**Fix**: Add a link at the very top of the body that is visually hidden (but visible on focus) that links to `<main id="main">`.
