# Certification Notes — Pareto Chart Pro v1.3.0.1

## General Information
- **Visual Name:** Pareto Chart Pro
- **GUID:** ParetoChartPro1A2B3C4D5E6F7A8B9C0D
- **Version:** 1.3.0.1
- **Plan ID / spIdentifier:** pareto-chart-pro-tcviz
- **Certification Branch:** https://github.com/tinocallarisa-web/pareto-chart-pro/tree/certification
- **Support URL:** https://tinocallarisa-web.github.io/pareto-chart-pro/support.html
- **Privacy URL:** https://tinocallarisa-web.github.io/pareto-chart-pro/privacy.html
- **Terms URL:** https://tinocallarisa-web.github.io/pareto-chart-pro/terms.html
- **Video Walkthrough:** https://www.youtube.com/watch?v=qtN0ckSXNZQ

## What the visual does
Ranks the entities bound to `Entity` by the measure bound to `Value`, groups them into bins of a
fixed percentage of the entity population, and draws descending bars with a cumulative percentage
line and up to three reference thresholds. The X axis is a share of entities rather than a list of
names, which is what keeps the chart readable from tens to hundreds of thousands of entities.

## Privacy and network access
- **No external network calls of any kind.** The visual contains no telemetry, no analytics, no CDN
  references and no custom endpoints. All rendering and calculation happens locally in the browser.
- **The only host API that leaves the visual** is `IVisualLicenseManager` via
  `host.licenseManager.getAvailableServicePlans()`, which is Microsoft's own licensing
  infrastructure and carries no report data.
- **Nothing is persisted** outside the report. The visual writes one property, `general.filter`,
  through `host.applyJsonFilter` — the standard Power BI filter mechanism — which Power BI stores in
  the report as it does for any visual that filters.
- No local file access, no `localStorage`, no cookies.

## Licensing
- Resolution is deferred with `setTimeout(0)` **after** the first render, so a slow or failed licence
  check never blocks painting. On failure the visual stays on the Free tier and does not touch the DOM.
- The source in this branch is in production state: `isPro` is resolved by the licence manager and is
  not forced, `DEV_MODE` is `false`, and the GUID carries no suffix.

## Free vs Pro
Free tier:
- Full Pareto chart: ranked bars, cumulative percentage line
- Fixed 20% bin size (5 bars)
- Up to 2 reference lines, default at 80%
- Conditional formatting on bar color (`fx`) and the Threshold Colors card
- Tooltips field well, up to 10 additional measures
- IBCS Mode
- Drilldown, cross-filtering, multi-select, filter-in dimming
- Keyboard navigation, screen-reader labels, high contrast mode

Pro tier (plan `pareto-chart-pro-tcviz`):
- Custom bin size 1–20% (up to 100 bars)
- Outlier exclusion (top/bottom % trimming)
- Value labels on bars
- Third reference line
- Bar border color, width and gap styling

> Note for reviewers: conditional formatting, Threshold Colors, the Tooltips field well and IBCS Mode
> are **not** licence-gated. Earlier revisions of this document listed some of them as Pro; the code
> is the authority and they are available in both tiers.

## Accessibility
`supportsKeyboardFocus` is declared and implemented as of this version.
- Roving tabindex: the chart is a single Tab stop; arrows move between bins, `Home`/`End` jump to the
  ends, `Enter`/`Space` select (`Ctrl`/`Cmd` adds), `Escape` clears, `Shift+F10` and `ContextMenu`
  open the context menu.
- `role="listbox"` on the chart, `role="option"` and `aria-selected` on each bar, plus a descriptive
  `aria-label` naming the bin position, entity range, share of value, cumulative percentage and
  entity count.
- Tooltips open on focus as well as hover.
- A visible focus ring, injected from TypeScript with a `forced-colors` variant. (`style/visual.less`
  is not emitted into the package, so runtime injection is the only way to ship CSS.)
- High contrast: all colors switch to the system palette via `host.colorPalette.isHighContrast`.

## Data volume and cross-filtering
- `capabilities.json` declares `"window": { "count": 30000 }`. In Power BI Service the visual
  streams further segments with `fetchMoreData(true)`; **verified at 500,000 entities** with slicers
  re-ranking correctly. Power BI's own ceilings apply (1,048,576 rows; 100 MB in segments
  aggregation mode).
- In Power BI Desktop segment streaming is unavailable, so the visual stops at 30,000 rows. Three
  independent brakes prevent it from requesting data indefinitely in that environment.
- Whenever Power BI stops short of the full set, the visual displays an amber notice stating the
  exact number of rows received. A Pareto always spans 0–100%, so partial data would otherwise look
  entirely normal.
- Clicking a bar applies a `BasicFilter` over every entity in the bin via `applyJsonFilter`. Measured
  ceiling is 10,000 entities per bar over a live connection; past that the visual **declines to
  filter** and tells the user to reduce the bin size, rather than filtering a subset and presenting
  an incorrect result as correct.

## Rendering events
`renderingStarted` is called at the top of `update()`, and every exit path calls either
`renderingFinished` or `renderingFailed` — including the early returns for the empty data view and
for segment continuation.

## Testing instructions

### Free tier
1. Import the `.pbiviz` into Power BI Desktop.
2. Bind a dimension (e.g. `Customer`) to `Entity` and a numeric measure (e.g. `Sales`) to `Value`.
3. The chart renders 5 bars with a cumulative percentage line and a reference line at 80%.
4. Click a bar: other visuals filter to that bin's entities. Click it again to clear.
5. Tab into the chart, move with the arrow keys, press `Enter` to select. Cross-filtering behaves as
   it does with the mouse, and a tooltip appears on focus.
6. `Format Pane → Pareto → Bar color → fx` opens the conditional formatting dialog.
7. `Format Pane → Threshold Colors → Color bars by threshold` colors bars by their position relative
   to the 80% cumulative threshold.

### Pro tier
1. Assign a test account an active `pareto-chart-pro-tcviz` plan.
2. `Format Pane → Pareto → Bin size %` — set 5% and confirm 20 bars.
3. `Exclude top %` / `Exclude bottom %` — confirm entities are trimmed before binning.
4. `Format Pane → Value Labels` — confirm labels appear above bars.
5. `Format Pane → Reference Lines → Show line 3` — confirm the third threshold.
6. Bar border color, width and gap under the Pareto card.
