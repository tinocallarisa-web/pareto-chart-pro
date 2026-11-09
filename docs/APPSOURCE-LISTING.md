# AppSource listing copy — Pareto Chart Pro v1.7.0.0 (DRAFT, not submitted yet)

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
*(4,336 characters measured on the HTML that is pasted, What's new included; limit 5,000)*

```
Everyone has heard that 20% of customers make 80% of sales. The useful questions are whether that holds for your business this year, who exactly those customers are, and what changed since last year. Building it natively takes a sorted column chart, a cumulative DAX measure and a dual axis; Pareto Chart Pro does it for you and states the answer in words.

It ranks any entity — customers, SKUs, defect codes, suppliers — and states the answer: "1,120 of 5,000 customers (22.4%) make 80% of sales". Exact, counted customer by customer, recalculated against whatever your slicers select.

FREE: THE EXACT ANSWER, A CORRECT CHART
• Ranked bars and a cumulative line to 100%, up to two threshold lines and the summary sentence with the exact number of entities
• Your top 15 by name: with more than 30 entities, the 15 largest get a named bar and the rest is grouped by rank ("#16–62"), drawn as the average per entity so the curve keeps falling, while the cumulative line and the tooltip keep the real totals. With 30 entities or fewer, every entity has its own bar
• A range bar under the chart: drag two handles, or use the keyboard, to pick a stretch of ranks — the top 50, #51 to #200 — and filter the page to exactly those entities (up to 10,000 entities per filter; not with small multiples)
• Report theme by default, so the chart takes your report's colours like a native visual, plus six style templates including an IBCS style
• Threshold colours, conditional formatting (fx) on bar colour, and highlighting from other visuals drawn on each bar

PRO: WHO, WHAT CHANGED, WHERE
• Vital few by name — every entity up to your threshold (80% by default) gets its own named bar, up to 50
• Period comparison — bind last year's measure for comparison bars, a dashed cumulative line and the change on every bar in percentage points. On named bars each entity shows its move (▲3, ▼2, new), and the summary says how many are no longer among the vital few, and who
• ABC zones — classes A, B and C shaded at the exact entity where the cumulative crosses 80% and 95%, with adjustable opacity and labels
• Small multiples — one Pareto per region, plant or product line on a shared scale, with columns, spacing, titles and panel styling
• Range shortcuts — Vital few, A, B, C and Tail in one click, and a summary of what the range holds
• Six collection styles (Boardroom, Ledger, Editorial, Signal, Aurora, Terrace), bin sizes from 1% to 20%, outlier exclusion, value labels and a third threshold line

FREE AND PRO
The free tier gives you the exact answer and a correct chart. Pro tells you exactly who the vital few are, what changed and where. The setup guide inside the visual lets you try each Pro feature with one click: without a licence it is drawn working under a "Pro preview" watermark, on your own data, while you edit. Reading view shows the free result.

NATIVE INTEGRATION
Cross-filtering and multi-select, drilldown on a hierarchy, standard and report page tooltips, bookmarks, context menu. Keyboard navigation (one Tab stop, arrow keys between bars, and the range bar's handles by keyboard) with screen-reader labels, high contrast, the measure's format string from your model (dynamic format strings included), format on the canvas, a legend, and twelve languages.

PRIVACY
No network requests, no telemetry: everything is calculated inside Power BI. Licences are checked through Microsoft's own licensing API.

GETTING STARTED
1. Entity = Customer, Value = Sales.
2. Pro: Comparison value = Sales last year; Small multiples = Region.
3. Read the sentence above the chart, then drag the range bar to filter the page.

Documentation, scenarios and sample data: https://tinocallarisa-web.github.io/pareto-chart-pro/support.html
Support: support@tcviz.com

WHAT'S NEW IN 1.7.0.0
Your top 15 by name (free) and the vital few by name (Pro); a range bar that filters the page by rank; rank moves and who left the vital few in the comparison; Report theme by default and six collection styles (Pro); ABC zone opacity and labels; small-multiples panel styling.
```

Paste the **HTML**, not this text: `python C:\tcviz\utillaje\ficha_html.py "C:\tcviz\dev\Pareto\pareto-chart-pro"`
writes `docs/APPSOURCE-DESCRIPTION.html`. The 5,000-character limit counts the tags.

---

## Search keywords (3)

1. `pareto chart` — the term a buyer types; we compete with Microsoft's absence of a native one.
2. `80/20 analysis` — the problem in the buyer's words, from people with a question, not a chart type.
3. `ABC analysis` — the inventory and key-account term, new with 1.5; low volume, high intent, and few
   Power BI visuals cover it.

Left out: `customer concentration` (long, low volume), `small multiples` (a function, not a problem).

---

## Plan description (Pro)

Text for the new Pro plan (1.99 per user per month · 19 per year). Prices go in the plan's pricing
fields, never in the offer description.

```
Pro shows exactly who the vital few are, what changed and where: every entity up to the threshold by name (up to 50 named bars); period comparison with comparison bars, a dashed cumulative line, the change on every bar in percentage points, rank moves (▲/▼/new) and who is no longer among the vital few; ABC zones with adjustable opacity and labels; small multiples (one Pareto per region or plant) with panel styling; range-bar shortcuts (Vital few, A, B, C, Tail) with a range summary; six collection styles; bin sizes from 1% to 20%; outlier exclusion; value labels and a third reference line. The free tier remains a complete, correct Pareto chart with the top 15 by name and the range bar.
```

The price of an existing plan cannot be changed: that is why 1.7 goes with a new plan.

---

## URLs to keep in sync

| Field | Value |
|---|---|
| Support | https://tinocallarisa-web.github.io/pareto-chart-pro/support.html |
| Privacy | https://tinocallarisa-web.github.io/pareto-chart-pro/privacy.html |
| Terms | https://tinocallarisa-web.github.io/pareto-chart-pro/terms.html |
| Changelog | https://tinocallarisa-web.github.io/pareto-chart-pro/changelog.html |
| Video | https://www.youtube.com/watch?v=1LLgEmXuA_8 |
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

---

## What to paste by hand in Partner Center (1.7.0.0)

Editing this file changes nothing in the offer. In Partner Center:

1. **Offer listing → Description:** the contents of `docs/APPSOURCE-DESCRIPTION.html` (run
   `ficha_html.py` again after any edit), not the text above.
2. **Offer listing → Search results summary:** unchanged; re-paste only if it is edited.
3. **Offer listing → Search keywords:** unchanged.
4. **Offer listing → Videos:** unchanged, `https://www.youtube.com/watch?v=1LLgEmXuA_8` (canonical
   `watch?v=` form; never `youtu.be`).
5. **Plans → new plan → Plan description:** the "Plan description (Pro)" text above; price 1.99 per
   user per month · 19 per year in the plan's pricing fields.
6. **Technical configuration:** the 1.7.0.0 `.pbiviz` and the `.pbix` sample (without `_test`).
7. **Review and publish → Notes for certification:** `docs/CERTIFICATION-NOTES-SHORT.txt`.
8. **Screenshots**, only if replaced: the current ones show the 1.6 look (Clean); a 1.7 visual opens in
   Report theme with the top 15 by name.
