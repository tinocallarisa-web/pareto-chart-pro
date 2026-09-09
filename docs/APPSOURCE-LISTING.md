# AppSource listing copy — Pareto Chart Pro v1.4.0.0

Paste-ready text for Partner Center. The marketplace listing is the documentation the
largest number of people read and the one that goes stale fastest — update it with every
release, not only when the code changes.

---

## Short description
*(Partner Center: "Short description", ~100 characters)*

```
80/20 concentration analysis for Power BI. Rank any entity, find your real Pareto, act on it.
```

---

## Long description

```
Pareto Chart Pro answers one question well: how much of your result comes from how few of
your entities?

Bind a dimension and a numeric measure — customers and revenue, SKUs and units, defect codes
and incidents, suppliers and spend. The visual ranks the entities, groups them into bins of a
fixed share of the population, and overlays a cumulative percentage line with the thresholds
you care about. No DAX, no cumulative measure, no sorted-column workaround.

WHY BINS
Most Pareto charts plot one bar per category, which stops working past a few hundred of them.
Here the X axis is a share of entities rather than a list of names, so the chart stays
readable whether you have 400 customers or 500,000 — and the ranking recalculates against
whatever your slicers currently select, not against a pre-computed grouping.

WHAT YOU CAN DO WITH IT
• Customer concentration and revenue risk — how exposed are you if the top accounts leave
• SKU rationalisation — how much of the catalogue can be retired without losing sales
• Defect and incident prioritisation — which few causes explain most of the failures
• Supplier spend review — whether negotiating attention is going where the money is

KEY FEATURES
• Ranked bins with a cumulative percentage line reaching 100%
• Up to three reference thresholds with custom labels
• Threshold Colors — colour bins by their position relative to a cumulative threshold, and
  highlight the bin where the line actually crosses
• Conditional formatting on bar colour through the standard fx rule dialog
• Tooltips field well — up to 10 additional measures on hover and on keyboard focus
• IBCS Mode — one-click standardized styling for executive and board reporting
• Drilldown across a hierarchy, cross-filtering, multi-select and highlight dimming
• Outlier exclusion, value labels and bin sizes down to 1% (Pro)

ACCESSIBILITY
The chart is a single Tab stop. Arrow keys move between bins, Enter selects and cross-filters,
Escape clears, Shift+F10 opens the context menu. Every bar carries a descriptive label naming
its position, its share of value, the cumulative percentage and how many entities it holds.
Tooltips open on keyboard focus, not only on hover, and all colours switch to the system
palette in high contrast mode.

SCALE
Verified at 500,000 entities in Power BI Service with slicers re-ranking correctly. Power BI
Desktop reads up to 30,000 rows — a platform limitation of Desktop, identical in both tiers.
When Power BI stops short of the full dataset the visual says so, with the exact row count.

PRIVACY
Certified by Microsoft. No external network calls of any kind — no telemetry, no analytics,
no custom endpoints. All calculation happens locally inside Power BI. The only outbound call
is Microsoft's own licence check, which carries no report data.

FREE AND PRO
The free tier is a complete Pareto chart: ranked bins, cumulative line, two reference
thresholds, conditional formatting, Threshold Colors, the tooltips field well, IBCS Mode,
drilldown, cross-filtering, keyboard navigation and high contrast.

Pro adds the controls you need as models grow: bin sizes from 1% to 20% (up to 100 bars),
outlier exclusion, value labels on bars, a third reference threshold, and bar border and gap
styling. Bin size also governs how many entities sit behind a bar, which matters for
cross-filtering large models — the documentation has the measured figures.

30-day free trial on AppSource.
```

---

## What's new — v1.4.0.0

```
• The Pro settings are now listed in the format pane for everyone, each marked (Pro), so you
  can see what the plan includes before deciding. Changing one without a licence leaves the
  chart on the free result and shows Power BI's own notification with a link to get a licence.
• A licence in its payment grace period keeps working instead of dropping to the free tier.
• Environments that cannot enforce licences — Publish to Web, embedded, PDF and PowerPoint
  export — no longer prompt anyone to buy what they may already own.
• Fixed: the bar colour swatch went back to showing the default after you changed the colour,
  even though the chart had applied it.
```

---

## What's new — v1.3.0.0

```
• Conditional formatting on bar colour via the fx rule dialog
• Threshold Colors: colour bins by cumulative % threshold, with the crossing bin highlighted
• Full keyboard navigation and screen-reader support — arrow keys, Enter to select, Escape to
  clear, descriptive labels on every bar, and tooltips that open on focus
• Adaptive layout: the chart now scales its margins, type and axis chrome to the tile it is in
• Cross-filtering rebuilt — clicking a bar now filters every entity behind it
• Fixed: the partial-data warning that never appeared, a hang on large models in Desktop, and
  a selection that needed a second click to register
```

---

## URLs to keep in sync

| Field | Value |
|---|---|
| Support | https://tinocallarisa-web.github.io/pareto-chart-pro/support.html |
| Privacy | https://tinocallarisa-web.github.io/pareto-chart-pro/privacy.html |
| Terms | https://tinocallarisa-web.github.io/pareto-chart-pro/terms.html |
| Changelog | https://tinocallarisa-web.github.io/pareto-chart-pro/changelog.html |
| Video | https://www.youtube.com/watch?v=qtN0ckSXNZQ |
| Source | https://github.com/tinocallarisa-web/pareto-chart-pro |

---

## Notes

- **Do not claim a figure you have not measured.** The 500,000 above was verified once, in
  one tenant, in Service, with an integer key. It is defensible as written — "verified at" —
  and would not be as "supports up to".
- The publisher name shown as "by X" on the marketplace comes from Partner Center account
  settings, not from the package, and each offer freezes it at its last publication.
- Re-check every URL in this table with a real request after publishing. A support URL that
  does not load is an immediate rejection.
