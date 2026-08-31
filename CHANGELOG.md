# Changelog — Pareto Chart Pro

## [1.2.0.0] — 2026-08-31

### Added
- **Tooltips Field Well (`tooltips` role)** — add up to 10 additional measures (Profit, Quantity, Margin %, Customer Count) to display in visual tooltips for bars and cumulative line dots
- **IBCS Mode (`IBCS Mode (Standardized)`)** — one-click toggle in Pareto Format card to apply International Business Communication Standards styling (neutral charcoal `#404040` bars, `#000000` solid axis typography, clean grid contrast)
- **High-Performance 150,000+ Row Support** — optimized window data reduction streaming and zero-GC selection ID generation supporting datasets up to 150,000+ rows
- **Strict Monotonic Pareto Binning Algorithm** — remainder items (`tn % nBins`) are prioritized in top bins, guaranteeing strictly descending bar heights and clean 10% interval labels (`0–10%`, `10–20%`... `90–100%`)

### Changed
- **Dynamic Bin Adaptation for Filtered Datasets** — automatically adjusts bin count (`Math.min(requestedNBins, tn)`) when slicers or filters reduce rows below requested bin count, preventing empty bars or broken X-axis labels
- **Explicit Measure Role Resolution** — visual strictly isolates primary measure from tooltip columns, guaranteeing correct Pareto sorting even when multiple tooltip measures are bound

### Fixed
- **Selection ID Deduplication (0 `DS0` query errors)** — category SelectionId deduplication eliminates `The DataSet 'DS0' contains a filter with duplicate columns` errors and locks up, returning instant <1ms cross-filtering response
- **Segment Loading Lockup Fix** — `fetchMoreData(true)` checks chunk capacity (>= 30,000) before rendering loading state, preventing visual freeze on smaller queries

---

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
