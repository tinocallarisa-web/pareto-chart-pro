# Changelog — Pareto Chart Pro

## [1.5.0.0] — 2026-10

### Added
- **Period comparison (Pro).** New `comparison` data role (Measure). Bins: the comparison is ranked on its own over the same entity population (every entity with a value in either period; a missing value counts as 0), trimmed with the same top/bottom counts and cut at the same positions, so bin k compares "the top k-th slice then" with "now". Named bars (≤ 30 entities): the same entity, because an independent ranking would put last year's leader under this year's name. Drawn as a translucent comparison bar behind and to the left of the current one (outlined grey in IBCS), a dashed cumulative line and a pill per bar with the change in share in percentage points; pills hide when they do not fit. New `comparison` object: bars, line, pills, colours.
- **Small multiples (Pro).** New `panel` data role (Grouping), mapped as a **second category column** (`categories.select: [for category, bind panel]`), so each row is one entity × panel combination and the 30,000-row window still counts entities. An earlier build grouped the values by panel (`values.group.by`), which made Power BI page the data in blocks of 500 rows — a 5,000-customer model drew a Pareto of 500. Panels share the left axis; layout from `smallMultiples.columns` (0 = automatic, cells about 1.6 times wider than tall). Clicking a bar applies two BasicFilters, entities and panel value; selection identities carry both categories on the fallback path. A selection lives inside one panel.
- **ABC zones (Pro).** New `abcZones` object: show, cuts (80 / 95), colours, labels. Boundaries at the exact entity where the cumulative crosses each cut, mapped onto the evenly spaced entity axis.
- **Summary sentence (Free).** New `summary` object. Entities needed to reach the threshold (reference line 1, else the threshold-colour value, else 80%) counted entity by entity — exact at any bin size. With a comparison, the comparison's own count; no pp in the sentence, because there fewer entities means more concentration, the opposite sign of the bar pills.
- **Named bars (Free).** At 30 entities or fewer (`ENTITY_BARS_MAX`), one bar per entity labelled with its value (model format for dates and numbers); X-axis title becomes the field name. Bars are keyed by `<panel>|#<entity>`, so repeated names do not collide.
- **Localization.** `stringResources` declared in `pbiviz.json` (it was missing: the existing `en-US` file never reached Power BI) with `en-US` and `es-ES`; `displayNameKey` on 5/5 roles, 11/11 objects and 60/61 properties (the hidden filter property has none); the formatting model gets the localization manager. All visual text — tooltips, notices, summary, ARIA labels, watermark, licence banners — goes through it.
- **Native number formats.** `powerbi-visuals-utils-formattingutils` 6.1.2. Tooltip values with the measure's `source.format`; computed percentages and pp with `host.locale`. No `toFixed` on a visible number remains.
- Tooltip rows: bin value, comparison value/share/change/cumulative, highlighted share.

### Changed
- **Highlights draw the highlighted part of each bar** (sum of `highlights` over the bin's entities ÷ panel total), over the full bar at 30% opacity. Before, a bin was dimmed only when no entity in it was highlighted — with large bins, never.
- Reference line labels inside the plot at the right end, with a halo; at `x = -4` they overlapped the left axis tick labels.
- The right (cumulative) axis is always drawn; the summary needs a panel at least 120 × 200 px.
- `isDesktop` from `host.hostEnv` (`CustomVisualHostEnv.Desktop = 4`), falling back to the user agent. Current Desktop builds no longer carry "Electron".
- Current bars over comparison bars get an opaque knockout, so a translucent bar no longer shows the grey through.
- **Rendering events 1:1 per update.** A superseded update (a newer `update()` arrived while the licence promise was pending) returned without `renderingFinished`, and an exception thrown while drawing inside that promise never reached the outer `catch`, so neither emitted `renderingFailed`. Both now close the update's `renderingStarted` (policy 1200.1.2).
- `build-test.js` restores the source on SIGINT/SIGTERM/SIGHUP/SIGBREAK and on exit: an interrupted build left `isPro = true` and the `_test` GUID in the tree.
- Toolchain: `npm audit fix` (non-force) and `overrides.uuid ^11.1.1`; ESLint and `eslint-plugin-powerbi-visuals` declared in `package.json` with an `eslint` script. Remaining: `braces` (no fixed version; build-time only, via powerbi-visuals-tools).

## [1.4.2.0] — 2026-09-21

### Fixed
- **Bar color only painted some of the bars on large models.** Present in 1.4.1.0 and earlier, and reproduced there. `pareto.barColor` carries a `dataViewWildcard` selector so the `fx` rule has a scope to write into, and the side effect is that a plain colour picked in the swatch is persisted per category, in `categorical.categories[0].objects`, rather than in `metadata.objects`. The fill was resolved bin by bin from those objects, but Power BI only delivers them for part of the categories once the model is large — so the chosen colour reached the first bins and the rest fell back to the default blue. Measured with 500,000 entities: 4 bars out of 20. A single distinct colour across the categories is now treated as what it is, a constant the user chose, and applied to every bar; several distinct colours still mean an `fx` rule is driving them and the per-bin colour still wins. This is the same test the format pane already used to decide which swatch to show — the render simply did not apply it.
- **The Upgrade bar was being overwritten, so a user told to buy had nothing to click.** Power BI shows one licence notification at a time and the last call replaces the previous one. `notifyLicenseRequired()` ran first and `notifyFeatureBlocked()` second, in the same `update()`, so on a user's first attempt at a Pro setting the feature banner wiped out the Upgrade bar — which is the call that carries the purchase path. The sequence is now `clearLicenseNotification()` → the banner naming the feature → and, after ~10 s, the persistent Upgrade bar, matching what already ships in Calendar, Bullet Chart Pro and Likert Survey Pro. The pending timer is cancelled in `destroy()`.

### Added
- **Pro preview.** Without a licence, and **in edit mode only**, a Pro setting the user turns on is now drawn *working*, under a "Pro preview" watermark, instead of being silently ignored. Until now the chart stayed on the Free result and only a message appeared, so nobody ever saw what they were being asked to pay for. Reading view — and any environment where licences cannot be read — still draws the Free result with no watermark and no prompt, so a published report never uses an unpaid feature. The preview is granted **per feature**, only for the one the user actually asked for: `binSizePct` defaults to 5, so a blanket preview would have handed out 20 bars on insert, with no watermark and no notice.

### Changed
- **New icon, from the TCViz visual system.** The chart keeps its shape — ranked bars and the cumulative curve — redrawn on the shared tile with the portfolio's palette, so Pareto Chart Pro reads as part of the same family in the Power BI gallery and on AppSource. The 300x300 marketplace logo is updated to match; it does not travel inside the package and is uploaded in Partner Center.
- **Bar border colour, border width and bar gap are Free, and no longer labelled `(Pro)`.** The render never gated them — they have worked without a licence in every published version — so the label was asking people to pay for something they already had, and the purchase notice fired for it. Gating them now would have removed styling from reports that already use it. Documentation and the product page are corrected to match.
- **The sort order is declared implicit.** `sorting` was `default`, so Power BI offered its *Sort axis* menu even though a Pareto chart is descending by value by definition and the visual re-sorts regardless — the menu looked broken because nothing it offered had any effect. It now declares `implicit` on the `measure` role, descending, and Power BI stops offering a choice that does not exist.

## [1.4.1.0] — 2026-09-14

### Fixed
- **A paying customer could stay on Free.** `getAvailableServicePlans()` returns each plan's `spIdentifier` as the full Partner Center **Service ID** (`publisher.offer.plan`), as the licensing API documentation states. The visual compared it with the bare plan ID `pareto-chart-pro-tcviz` using `===`, which never matches the full Service ID. It now accepts a Service ID ending in `.pareto-chart-pro-tcviz`, and the bare plan ID as well.
- **`package.json` carried a four-part version (`1.4.0.0`)**, which is not valid semver and makes `npm install` fail with *Invalid Version*. It is now `1.4.1`; `pbiviz.json` keeps the four-part `1.4.1.0`.

## [1.4.0.0] — 2026-09-09

### Added
- **Power BI's own "feature blocked" banner when a Free user reaches for a Pro setting.** Changing a `(Pro)` property now calls `notifyFeatureBlocked()`, so the platform shows its predefined notification with the purchase path. Intent is read from `dataView.metadata.objects`, which carries only properties the user set explicitly, so the banner never fires on defaults; it is raised once per distinct set of attempted features.

- **A persistent notice when a trial or licence has lapsed.** If Pro settings are saved in the report and no licence resolves, the visual raises Power BI's `notifyLicenseRequired(General)` icon. Without it, an expired trial silently reverts the chart to 20% bins with no value labels and nothing explains why — the settings are still stored, so it reads as the visual breaking. The banner alone does not cover this, since it only fires when a setting is *changed*. Power BI shows the icon in Edit mode only, so report consumers see nothing. It is cleared with `clearLicenseNotification()` as soon as a licence resolves or the Pro settings are removed.

### Changed
- **Pro settings are visible to everyone.** `getFormattingModel()` previously set `visible = isPro` on bin size, outlier filtering, bar border, bar gap, the third reference line and value labels, so a Free user could not discover that those features existed. They are now always listed, each already labelled `(Pro)` in its display name.
- **A licence in the `Warning` state is honoured.** The check accepted only `Active`; per the licensing API, "only the active and warning states represent a usable license". `Warning` is a grace period, so a paying customer no longer loses their features while a payment issue is resolved.
- **`isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` are honoured.** In Publish to Web, embedded, national clouds, PDF/PPT export, or when the user is offline or not signed in, a Pro customer reads as Free. The visual now renders the Free experience there without prompting anyone to buy what they may already own.

### Removed
- **The Free-tier caption drawn inside the chart** (`Free: 20% bins — upgrade to Pro...`). Microsoft's guidance is explicit that a visual "shouldn't display its own licensing UX, instead use one of Power BI supported predefined notifications", and the caption was a dead end: 10px grey text with no way to act on it. The platform banner replaces it.

### Fixed
- **The bar colour swatch showed the default after the user changed it.** `barColor` carries a `dataViewWildcard` selector so Power BI has a scope to write fx-resolved colours into; the side effect is that a plain colour picked by the user is persisted under that wildcard as well, landing in `categorical.categories[0].objects` instead of `metadata.objects`. `populateFormattingSettingsModel` only reads the latter, so the chart honoured the new colour while the picker kept displaying `#4472C4` — which reads as the setting not having applied. The format pane now reflects the colour actually being painted when a single colour is in force; when several are, an fx rule is driving them and the rule dialog represents the state. Introduced in 1.3.0.0 with conditional formatting, never released.
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
