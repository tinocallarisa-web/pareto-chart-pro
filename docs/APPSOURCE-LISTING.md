# AppSource listing copy — Pareto Chart Pro v1.5.0.0

Paste-ready text for Partner Center. **Editing this file does not change the offer**: the fields
Microsoft reviews live only in Partner Center, and have to be pasted by hand.

Measured limits: search results summary 100 characters, description 5,000 (cut silently; the
What's new block goes inside it), certification notes 2,500 counting CRLF, 3 keywords.

---

## Search results summary
*(88 characters)*

```
80/20 analysis in Power BI: who drives your result, how that changed, by region. No DAX.
```

---

## Description
*(3076 characters, What's new included)*

```
Everyone has heard that 20% of customers make 80% of sales. Almost nobody in the meeting knows whether that is true for their own business this year, whether it was more or less true last year, or whether one region behaves differently. The native way to find out is a sorted column chart, a cumulative DAX measure and a dual axis — and it still cannot tell you the answer in words.

Pareto Chart Pro ranks any entity — customers, SKUs, defect codes, suppliers — and states the answer: "1,120 of 5,000 customers (22.4%) make 80% of sales". Exact, counted customer by customer, recalculated against whatever your slicers select.

WHAT YOU SEE
• Ranked bars and a cumulative line to 100%, with up to three threshold lines
• A summary sentence with the exact number of entities behind the threshold
• Bins of a fixed share of entities, so 500,000 customers read as five bars; with 30 entities or fewer, one named bar each — the classic Pareto
• Threshold colours and conditional formatting (fx) on bar colour
• Highlighting from other visuals draws the highlighted part of each bar, like a native chart

PRO: COMPARE, SPLIT, CLASSIFY
• Period comparison — bind last year's measure and get comparison bars, a dashed cumulative line and the change on every bar in percentage points. Each period is ranked on its own, so it answers the real question: are we more dependent on our top customers than a year ago?
• Small multiples — one Pareto per region, plant or product line on a shared scale. Click a bar to filter the report to those customers in that region.
• ABC zones — classes A, B and C shaded at the exact customer where the cumulative crosses 80% and 95%
• Bin sizes from 1% to 20%, outlier exclusion, value labels

FREE AND PRO
The free tier is a complete, correct Pareto: nothing is hidden or capped, and with a small-multiples field bound it sums the panels into one chart rather than dropping data. Turn on a Pro feature without a licence while editing and it is drawn working under a "Pro preview" watermark, on your own data. Reading view shows the free result.

NATIVE INTEGRATION
Cross-filtering and multi-select, drilldown on a hierarchy, standard and report page tooltips, bookmarks, context menu. Keyboard navigation (one Tab stop, arrow keys between bars) with screen-reader labels, high contrast, the measure's format string from your model, and English and Spanish.

PRIVACY
Certified by Microsoft. No network requests, no telemetry: everything is calculated inside Power BI. Licences are checked through Microsoft's own licensing API.

GETTING STARTED
1. Entity = Customer, Value = Sales.
2. Pro: Comparison value = Sales last year; Small multiples = Region.
3. Read the sentence above the chart.

Documentation, scenarios and sample data: https://tinocallarisa-web.github.io/pareto-chart-pro/support.html
Support: support@tcviz.com

WHAT'S NEW IN 1.5.0.0
Period comparison, small multiples and ABC zones (Pro); the exact summary sentence; named bars for small entity counts; partial highlighting from other visuals; number formats from the model; Spanish.
```

---

## Search keywords (3)

1. `pareto chart` — the term a buyer types; we compete with Microsoft's absence of a native one.
2. `80/20 analysis` — the problem in the buyer's words, from people with a question, not a chart type.
3. `ABC analysis` — the inventory and key-account term, new with 1.5; low volume, high intent, and few
   Power BI visuals cover it.

Left out: `customer concentration` (long, low volume), `small multiples` (a function, not a problem).

---

## Plan description (Pro)

```
Pareto Chart Pro adds period comparison (comparison bars, dashed cumulative line and the change on every bar in percentage points), small multiples (one Pareto per region or plant), ABC zones, bin sizes from 1% to 20%, outlier exclusion, value labels and a third reference line. The free tier remains a complete Pareto chart.
```

The price of an existing plan cannot be changed (USD 4.99 per user per month).

---

## URLs to keep in sync

| Field | Value |
|---|---|
| Support | https://tinocallarisa-web.github.io/pareto-chart-pro/support.html |
| Privacy | https://tinocallarisa-web.github.io/pareto-chart-pro/privacy.html |
| Terms | https://tinocallarisa-web.github.io/pareto-chart-pro/terms.html |
| Changelog | https://tinocallarisa-web.github.io/pareto-chart-pro/changelog.html |
| Video | https://www.youtube.com/watch?v=abzBwDW_wkE |
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
