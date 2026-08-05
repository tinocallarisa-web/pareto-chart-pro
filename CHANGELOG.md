# Changelog — Pareto Chart Pro

## [1.1.0.0] — 2026-08-05

### Added
- **Drilldown support** — add a hierarchy to the Entity field and use Power BI drill buttons to navigate levels; the Pareto recalculates at each level
- **Tooltips on cumulative line dots** — hover any dot on the cumulative line to see Entity range, Cumulative %, and Bin share %
- **Report / canvas tooltip support** — visual now registers with Power BI's tooltip service for report-page tooltip compatibility
- **High contrast mode** — all chart colors (bars, line, axes, dots, reference lines) automatically switch to system palette when high contrast is active
- **New Formatting Pane API** — migrated from `enumerateObjectInstances()` to `getFormattingModel()` using `powerbi-visuals-utils-formattingmodel`; Pro-only settings are hidden (not just disabled) in the Free tier
- **Reference line labels at top** — vertical reference line labels now appear at the top of the line instead of below the X axis, eliminating overlap with tick labels

### Changed
- **Free tier bin size reduced to 20%** (5 bars) — previously 10% (10 bars); makes the difference between Free and Pro more visible and meaningful for users doing detailed analysis
- **`support.html` fully rewritten** — now includes 10-question FAQ, video walkthrough embed, Free vs Pro comparison table, Format Pane reference, and direct support email contact

### Fixed
- Duplicate `// Free tier badge (DEBUG)` comment removed from source
- `flatMap` replaced with `reduce/concat` for ES6 compatibility

---

## [1.0.0.3] — 2026-07-17

### Added
- Initial AppSource release
- Pareto chart with ranked bars and cumulative percentage line
- Up to 2 reference lines with configurable threshold, color, and label
- Free / Pro tier via IVisualLicenseManager (plan: pareto-chart-pro-tcviz)
- Cross-filtering, multi-select, filter-in highlight dimming
- Context menu on right-click
- Landing page when no data is bound
- Tooltips on bars
- Value labels on bars (Pro)
- Outlier exclusion top/bottom % (Pro)
- Custom bin size 1–20% (Pro)
- Bar border, gap, opacity styling
