# Changelog

Notes on notable site changes, newest first.

## 2026-09-17 — Career carousel: process-card redesign

**education.html** — the 8-card Apple Cards carousel on the Education page.

- Replaced the uniform `.mock-stage-grid` box layout inside each expanded card with a
  vanilla CSS/JS "tracing beam" timeline (no framework — this is a static site, so this
  re-implements the visual effect of Aceternity's Tracing Beam by hand). The beam and
  active-dot color now follow each card's own accent color via a `--card-accent` CSS
  custom property set per-card in `openCard()`.
- Simplified the AI card's 3-column Question/Generative AI/Business Need comparison
  table into a cleaner 2-column Output/Risk/Best-use label+description format.
- Added a "Where this shows up" track-record section to all 6 process cards
  (Analytics, AI, Change Management, Design, Data Engineering, Lean Six Sigma) — 3-4
  short, concrete, real examples per card of where that skill has actually been applied
  across roles (Takeda, Chewy, Electric Boat/GD, personal projects) and, where relevant,
  supporting credentials/coursework (Anthropic MCP cert, Databricks cert, HarvardX,
  USC, GD Black Belt). Sourced from interview-prep reference docs plus the existing
  skills map on `index.html`, cross-checked across multiple sources per claim.
- Copy cleanup: removed "actually" / "just" and "it's not X, it's just Y" contrast
  phrasing from the AI card and the new track-record copy.
- Reordered the carousel cards (left-to-right / top-to-bottom, same order on mobile):
  Education, Data Engineering, AI, Lean Six Sigma, Analytics, Roles, Change
  Management, Design.
