# Pareto Chart Pro — TCViz Web Product Page Content

Content for the four tabs of the TCViz product page. Current visual version: **1.7.0.0**.
The live page is generated from `src/data.jsx` in `tcviz-web`; this file is the source text, and
editing it does not change the site.

## TAB 1: OVERVIEW

### Who makes your 80% — by name

Pareto Chart Pro brings 80/20 and ABC concentration analysis to Power BI. It ranks any entity —
customers, SKUs, defect causes, suppliers — and states the answer in one sentence: *"1,120 of 5,000
customers (22.4%) make 80% of sales"*, counted entity by entity and recalculated with every slicer.

### Key highlights
- **The exact answer, free.** The summary sentence, the cumulative line and up to two threshold
  lines, on the free tier.
- **Your top 15 by name, free.** With more than 30 entities, the 15 largest get a named bar and the
  rest is grouped by rank (*#16–62*), drawn at the average per entity so the curve keeps falling.
- **A range bar that filters by rank.** Drag two handles under the chart, or use the keyboard, and the
  page is filtered to exactly those entities.
- **Report theme by default.** The chart takes your report's colours, like a native visual.
- **Pro: who, what changed, where.** The vital few by name, period comparison with each entity's change
  of rank, ABC zones, small multiples, range shortcuts and six collection styles.

---

## TAB 2: FEATURES

### Free: the exact answer and a correct chart
- Ranked bars, cumulative percentage line, summary sentence with the exact number of entities
- Up to two reference lines (80% by default)
- **Bars with names:** with 30 entities or fewer, one named bar each; above that, *Top 15 by name +
  rest* (the default for new visuals) or *Bins of entities* (fixed 20% bins, the chart of earlier
  versions)
- **Range bar:** two handles by rank, drag or keyboard, filters the page to those entities; says
  *Range out of date* with Reapply / Clear when other filters change the data
- **Style templates:** Report theme (default), Clean, Minimal, Contrast, Soft, Compact, IBCS style
- Threshold colours, conditional formatting (*fx*) on bar colour, bar border and gap
- Cross-filtering, multi-select, partial highlighting, drilldown, bookmarks, context menu,
  standard and report page tooltips, up to 10 extra tooltip measures
- Setup guide, legend, format on the canvas, number and dynamic format strings from the model,
  12 languages, keyboard navigation with ARIA, high contrast

### Pro: who exactly, what changed, where
- **Vital few by name:** every entity up to the threshold by name, up to 50 named bars
- **Period comparison:** comparison bars, dashed cumulative line, change in percentage points; on
  named bars, rank moves (▲3, ▼2, new) and who is no longer among the vital few
- **ABC zones:** classes A, B and C at the exact entity, with zone opacity and label options
- **Small multiples:** one Pareto per region, plant or product line, with the collection's nine panel
  options (columns, spacing, titles, panel background and border)
- **Range shortcuts:** Vital few, A, B, C and Tail in one click, with a summary of the range
- **Collection styles:** Boardroom, Ledger, Editorial, Signal, Aurora, Terrace
- Bin size 1–20% (up to 100 bars), outlier exclusion, value labels, a third reference line

### Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Pareto chart, cumulative line, summary sentence, reference lines 1 and 2 | ✓ | ✓ |
| Top 15 by name + rank ranges | ✓ | ✓ |
| Range bar (drag, keyboard, filter by rank) | ✓ | ✓ |
| Report theme + six style templates | ✓ | ✓ |
| Conditional formatting, threshold colours, IBCS mode | ✓ | ✓ |
| Cross-filtering, drilldown, bookmarks, custom tooltips | ✓ | ✓ |
| Keyboard navigation, high contrast, 12 languages | ✓ | ✓ |
| Vital few by name (up to 50) | — | **✓** |
| Period comparison with rank moves | — | **✓** |
| ABC zones | — | **✓** |
| Small multiples | — | **✓** |
| Range shortcuts and summary | — | **✓** |
| Six collection styles | — | **✓** |
| Bin size (Bins of entities) | Fixed 20% (5 bars) | **1–20%, up to 100 bars** |
| Outlier exclusion, value labels, third reference line | — | **✓** |

Pro settings are listed in the format pane for everyone, each marked `(Pro)`. Without a licence, a
Pro feature turned on while editing is drawn working under a *Pro preview* watermark, with Power BI's
own notification; reading view shows the free chart.

---

## TAB 3: TECHNICAL

- **Version**: 1.7.0.0 · **API version**: `5.11.1`
- **Field wells**: Entity (grouping or hierarchy, required) · Value (measure, required) · Comparison
  value (measure, Pro) · Small multiples (grouping, Pro) · Tooltips (up to 10 measures)
- **Data reduction**: `window` of 30,000 with `fetchMoreData(true)`; verified at 500,000 entities in
  Power BI Service. Power BI Desktop stops at 30,000 rows and the visual says so.
- **Cross-filtering**: a bar click or a range applies a `BasicFilter` over every entity behind it,
  capped at 10,000 values — the point past which a live connection degrades. Beyond it the visual
  declines and says so rather than filtering a subset. The range bar never reapplies a filter by itself.
- **Licensing**: native `IVisualLicenseManager` through Microsoft AppSource. Plan
  `pareto-chart-pro-tcviz`. Resolution is asynchronous and never blocks rendering; Active and
  Warning licence states are honoured.
- **Privacy and security**: all rendering is local and in memory. No external servers, no network
  requests, nothing stored outside the report.
- **Accessibility**: keyboard navigation (bars and range bar handles), ARIA labels, visible focus
  ring, high contrast
- **Localization**: 12 languages (en, es, pt-BR, pt-PT, fr, de, it, nl, pl, ja, zh-CN, ko)

---

## TAB 4: CHANGELOG

### Version 1.7.0.0 (November 2026)
- **Added**: Bars with names — Top 15 by name + rest (free, default for new visuals) and Vital few by
  name + rest (Pro, up to 50); reports made before 1.7 keep their bins
- **Added**: Range bar — filter the page by a stretch of ranks (free); Vital few / A / B / C / Tail
  shortcuts and range summary (Pro)
- **Added**: Comparison on named bars — rank moves (▲/▼/new) and who left the vital few (Pro)
- **Added**: ABC zone opacity and label options; small multiples with nine panel options (Pro)
- **Added**: Six collection styles (Pro)
- **Changed**: Report theme is the default style (before: Clean, which stays available)
- **Changed**: Format pane in the order common to the TCViz visuals

### Version 1.6.0.0 (October 2026)
- **Added**: Setup guide with one-click Pro preview, six style templates, legend, format on the
  canvas, 12 languages, dynamic format strings

### Version 1.5.0.0 (October 2026)
- **Added**: Period comparison, small multiples and ABC zones (Pro); summary sentence and named bars
  for 30 entities or fewer (free); partial highlighting; number formats from the model

### Version 1.4.0.0 (September 2026)
- **Added**: Power BI's own "feature blocked" notification when a Free user changes a Pro setting
- **Changed**: Pro settings visible to everyone, marked `(Pro)`; `Warning` licence state honoured
- **Removed**: the "Free: 20% bins — upgrade to Pro" caption drawn inside the chart

### Version 1.3.0.0 (September 2026)
- **Added**: Conditional formatting on bar colour, Threshold Colors, keyboard navigation and ARIA
- **Fixed**: Cross-filtering exact at any bin size

### Version 1.2.0.0 (August 2026)
- **Added**: Tooltips field well, one-click IBCS mode, 150,000+ row streaming
