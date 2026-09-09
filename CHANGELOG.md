# Changelog — Pareto Chart Pro

## [1.4.0.0] — 2026-09-09

### Added
- **Power BI's own "feature blocked" banner when a Free user reaches for a Pro setting.** Changing a `(Pro)` property now calls `notifyFeatureBlocked()`, so the platform shows its predefined notification with the purchase path. Intent is read from `dataView.metadata.objects`, which carries only properties the user set explicitly, so the banner never fires on defaults; it is raised once per distinct set of attempted features.

### Changed
- **Pro settings are visible to everyone.** `getFormattingModel()` previously set `visible = isPro` on bin size, outlier filtering, bar border, bar gap, the third reference line and value labels, so a Free user could not discover that those features existed. They are now always listed, each already labelled `(Pro)` in its display name.
- **A licence in the `Warning` state is honoured.** The check accepted only `Active`; per the licensing API, "only the active and warning states represent a usable license". `Warning` is a grace period, so a paying customer no longer loses their features while a payment issue is resolved.
- **`isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` are honoured.** In Publish to Web, embedded, national clouds, PDF/PPT export, or when the user is offline or not signed in, a Pro customer reads as Free. The visual now renders the Free experience there without prompting anyone to buy what they may already own.

### Removed
- **The Free-tier caption drawn inside the chart** (`Free: 20% bins — upgrade to Pro...`). Microsoft's guidance is explicit that a visual "shouldn't display its own licensing UX, instead use one of Power BI supported predefined notifications", and the caption was a dead end: 10px grey text with no way to act on it. The platform banner replaces it.

### Fixed
- **`package.json` did not declare `typescript`**, which failed certification policy 1200.1.1.4 (*Code Repository — Required files*): "typescript v3.0.0 or higher does not appear to be present". The build worked because `npx` fetches TypeScript on demand, but the reviewer reads the repository manifest, not the build. Added `typescript ^5.9.3` and regenerated `package-lock.json`.

## [1.3.0.1] — 2026-09-09

### Fixed
- **Repository `package.json` was not a valid npm manifest**, which failed AppSource certification policy 1200.1.1.4 (*Code Repository — Required files*). The file had been overwritten with the internal manifest that `pbiviz` generates inside the `.pbiviz` package (`resources`, `visual`, `metadata`), so it had no `name`, no `scripts` and no `powerbi-visuals-tools` dev dependency. It is now a proper project manifest with `name`, `repository`, `license`, `start`/`package`/`lint` scripts and `powerbi-visuals-tools`; `package-lock.json` was regenerated to match.

No changes to visual behavior — this release exists only to resubmit with a corrected repository.

## [1.3.0.0] — unreleased

### Added
- **Conditional formatting on bar color (`fx`)** — `Format Pane → Pareto → Bar color` now exposes the rule-based dialog. Power BI resolves the rule per entity; each bar takes the color of its top-ranked entity, and falls back to the first entity in the bin that resolves to one.
- **Threshold Colors card** — color bins by where they fall relative to a cumulative % threshold (default 80): one color within, another beyond, and an optional highlight on the bin where the cumulative line crosses. Available in Free and Pro.
- **Keyboard navigation and ARIA** — the chart is a single Tab stop with a roving tabindex; `←/→/↑/↓` move between bins, `Home`/`End` jump to the ends, `Enter`/`Space` select (with `Ctrl`/`Cmd` to add), `Escape` clears, `Shift+F10` and `ContextMenu` open the context menu. Bars expose `role="option"`, `aria-selected` and a descriptive `aria-label`; the chart exposes `role="listbox"`. Tooltips now also open on keyboard focus, not only on hover.
- **Visible focus ring**, injected at runtime with a `forced-colors` variant for high contrast (`style/visual.less` is not emitted into the package, so CSS must come from TypeScript).
- **`stringResources/en-US/resources.resjson`** — display strings are now localizable.

### Fixed
- **Cross-filtering is now exact at any bin size.** Clicking a bar applies a `BasicFilter` over every entity in the bin through `applyJsonFilter`, instead of emitting one selection ID per entity. Selection IDs carry a full scope identity each, so a bin of thousands of entities either built thousands of heavy objects or had to be capped; a filter carries plain scalars, which is the mechanism native slicers use for large value lists. There is no cap on this path. When the category's `queryName` yields no table/column target (some drilldown levels and model shapes), the visual falls back to selection IDs, so behavior degrades rather than breaks.
- **Cross-filtering only filtered one entity per bar.** `getSelIds()` ignored its `max` argument and returned a single selection ID for the bin's first entity, so clicking a bar that represents 40 customers filtered the rest of the report by 1 of them. The bar dimming was driven by local state rather than the real selection, so the chart looked correct while the filter it emitted was not. Selection IDs are now built for every entity in the bin (deduplicated by category value, which was the real cause of the earlier `DataSet 'DS0' contains a filter with duplicate columns` error, and capped at `MAX_SEL_IDS_PER_BIN`). Regression introduced in 1.2.0.0.
- **Conditional formatting never reached the chart.** The `barColor` slice declared `instanceKind` but no selector, so the *fx* button appeared and the rule was accepted while Power BI had no scope to write the resolved colors into. It now carries the `dataViewWildcard` selector.

### Changed
- **Adaptive layout** — chart margins, font size and axis chrome now scale with the viewport instead of using a fixed 64px margin. On small tiles the axis titles, the right-hand cumulative axis and the Free badge are dropped, and X tick labels are thinned to what fits, rather than overlapping.
- **`host.allowInteractions` is honored** before selection, keyboard activation and the context menu.

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
