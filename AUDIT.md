# Accessibility & Performance Audit

**Project:** Resume Tailor
**Live URL:** https://flyrank-capstone-ebon.vercel.app
**Pages audited:** Home (`/`) and Tailor (`/tailor`)
**Date:** August 21, 2026

---

## 1. Baseline (Before)

### Lighthouse — Mobile, Incognito

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/tailor` | 92 | 100 | 100 | 100 |
| `/` (Home) | 91 | 100 | 100 | 100 |

*(Note: initial non-incognito run showed Performance 70 on `/tailor`, but Lighthouse itself flagged that Chrome extensions were skewing the load. Re-running in Incognito — the correct baseline method — gave the accurate scores above.)*

### WAVE

| Page | Errors | Alerts | AIM Score |
|---|---|---|---|
| `/tailor` | 1 | 1 | 9.4 / 10 |
| `/` (Home) | 0 | 1 | 10 / 10 |

---

## 2. Keyboard-only pass

Tested using Tab / Shift+Tab / Enter / Space only, no mouse.

- All primary nav links (Home, Tailor, History, Auth, Health, Viewer) reachable in a logical order.
- Chat input on `/tailor` reachable via Tab; message sendable via Enter.
- **Stop button** during streamed AI response is a real, keyboard-reachable, focusable button and works correctly when triggered via keyboard.
- Focus indicators visible on all interactive elements tested.
- Full primary flow (navigate → open Tailor → send message → stop/receive response) completable without a mouse.

---

## 3. Issues found & fixes

### Issue 1 — Missing form label (WAVE Error, `/tailor`)
**Problem:** The chat input only had a `placeholder`, which disappears on focus/typing and isn't a reliable accessible name for screen reader users.

**Fix:** Added an explicit `aria-label` to the input.
```jsx
// src/app/tailor/page.js
<input
  placeholder="Paste job description and ask for a tailored cover letter..."
  aria-label="Paste job description and ask for a tailored cover letter"
  ...
/>
```

**Result:** WAVE Errors on `/tailor` went from **1 → 0**.

### Issue 2 — Redundant link (WAVE Alert, both pages)
**Problem:** The site logo and the "Home" nav item both link to `/`, which WAVE flags as two links pointing to the same destination.

**Fix:** Gave the logo link a distinct accessible name so it's announced differently from the "Home" nav item.
```jsx
// src/app/components/Nav.jsx
<Link href="/" aria-label="Resume Tailor home" className="...">
  Resume Tailor
</Link>
```

**Status / justification:** The alert can still surface because WAVE's redundant-link check is pattern-based (any logo + nav-home combo trips it), even when the two links now have distinct accessible names and serve different purposes — one is branding, the other is primary