# Voluntary Product Accessibility Template (VPAT)
**Product**: classiccottrell.ca
**Date**: 2025-12-02
**Contact**: Matthew A. Cottrell

## Summary of Findings
The website is largely accessible but has minor issues related to HTML validation and color contrast for secondary text.

## Section 508 Standards

| Criteria | Status | Remarks and Explanations |
| :--- | :--- | :--- |
| **1194.21 Software Applications and Operating Systems** | | |
| (a) Keyboard Navigation | Supports | All interactive elements (links, buttons) are reachable via keyboard. |
| (b) Focus Indicator | Supports | Browser default focus rings are preserved. |
| **1194.22 Web-based Intranet and Internet Information and Applications** | | |
| (a) Text Alternatives | Supports | Images have `alt` attributes (e.g., Profile image, Social icons). |
| (c) Color | Partially Supports | Most text meets contrast ratios, but footer copyright text (#888) is below 4.5:1. |
| (d) Stylesheets | Supports | Content is readable without stylesheets. |
| (i) Frames | Not Applicable | No frames used. |
| (n) Forms | Not Applicable | No forms present. |
| (o) Skip Navigation | Does Not Support | No "Skip to Main Content" link provided. |
| **1194.31 Functional Performance Criteria** | | |
| (a) Blindness | Supports with Exceptions | Invalid HTML structure (head inside body) may confuse some screen readers. |
| (b) Low Vision | Partially Supports | Zooming works, but some low contrast text exists. |

## WCAG 2.1 Report
**Compliance Level**: AA

### Principle 1: Perceivable
- **1.1.1 Non-text Content**: PASS. Images have alt text.
- **1.3.1 Info and Relationships**: FAIL. `index.html` has `<head>` nested inside `<body>`. This is invalid HTML and breaks semantic parsing.
- **1.4.3 Contrast (Minimum)**: FAIL. Footer copyright text (`#888888`) on background (`#F9F5F1`) has a ratio of ~3.5:1, which fails the 4.5:1 requirement for small text.

### Principle 2: Operable
- **2.4.1 Bypass Blocks**: FAIL. No mechanism to skip header navigation.
- **2.4.4 Link Purpose**: PASS. Link text is descriptive ("Art", "LinkedIn", "Instagram").

### Principle 3: Understandable
- **3.1.1 Language of Page**: PASS. `lang="en"` is present.

### Principle 4: Robust
- **4.1.1 Parsing**: FAIL. Significant HTML validation error (`head` inside `body`).
