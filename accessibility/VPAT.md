# Voluntary Product Accessibility Template (VPAT)
**Product**: classiccottrell.ca
**Date**: 2025-12-02
**Contact**: Matthew A. Cottrell

## Summary of Findings
The website is largely accessible. The previously noted HTML validation error, copyright contrast issue, and missing skip link have been fixed.

## Section 508 Standards

| Criteria | Status | Remarks and Explanations |
| :--- | :--- | :--- |
| **1194.21 Software Applications and Operating Systems** | | |
| (a) Keyboard Navigation | Supports | All interactive elements (links, buttons) are reachable via keyboard. |
| (b) Focus Indicator | Supports | Browser default focus rings are preserved. |
| **1194.22 Web-based Intranet and Internet Information and Applications** | | |
| (a) Text Alternatives | Supports | Images have `alt` attributes (e.g., Profile image, Social icons). |
| (c) Color | Supports | Footer copyright text (`#6b6b6b`) on background (`#F9F5F1`) now passes at 4.91:1. |
| (d) Stylesheets | Supports | Content is readable without stylesheets. |
| (i) Frames | Not Applicable | No frames used. |
| (n) Forms | Not Applicable | No forms present. |
| (o) Skip Navigation | Supports | A visually-hidden "Skip to main content" link is the first element in `<body>` on every page, targeting `#main`. |
| **1194.31 Functional Performance Criteria** | | |
| (a) Blindness | Supports | `<head>`/`<body>` structure is valid on all pages. |
| (b) Low Vision | Supports | Zooming works and copyright text now meets contrast requirements. |

## WCAG 2.1 Report
**Compliance Level**: AA

### Principle 1: Perceivable
- **1.1.1 Non-text Content**: PASS. Images have alt text.
- **1.3.1 Info and Relationships**: PASS. `<head>` inside `<body>` parse error has been fixed on all pages.
- **1.4.3 Contrast (Minimum)**: PASS. Footer copyright text (`#6b6b6b`) on background (`#F9F5F1`) now has a ratio of 4.91:1, meeting the 4.5:1 requirement for small text.

### Principle 2: Operable
- **2.4.1 Bypass Blocks**: PASS. A "Skip to main content" link is present as the first focusable element on every page.
- **2.4.4 Link Purpose**: PASS. Link text is descriptive ("Art", "LinkedIn", "Instagram").

### Principle 3: Understandable
- **3.1.1 Language of Page**: PASS. `lang="en"` is present.

### Principle 4: Robust
- **4.1.1 Parsing**: PASS. HTML validation error (`head` inside `body`) has been fixed.
