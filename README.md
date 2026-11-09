# Pareto Chart Pro

**80/20 concentration analysis for Microsoft Power BI.** Rank any entity, see the top ones
by name, and read the cumulative line against the thresholds your decision actually depends
on — without the sorted-column-plus-DAX workaround.

[![AppSource](https://img.shields.io/badge/Microsoft-AppSource-0078D4)](https://appsource.microsoft.com/product/power-bi-visuals/tino_callarisa.pareto-chart-pro-tcviz)
[![Certified](https://img.shields.io/badge/Power%20BI-Certified-107C10)](https://learn.microsoft.com/power-bi/developer/visuals/power-bi-custom-visuals-certified)
[![Docs](https://img.shields.io/badge/docs-tcviz-2B6CB0)](https://tinocallarisa-web.github.io/pareto-chart-pro/)

📘 **[Documentation](https://tinocallarisa-web.github.io/pareto-chart-pro/support.html)** ·
💡 **[Tips & best practices](https://tinocallarisa-web.github.io/pareto-chart-pro/tips.html)** ·
📋 **[Changelog](https://tinocallarisa-web.github.io/pareto-chart-pro/changelog.html)** ·
🎥 **[Video walkthrough](https://www.youtube.com/watch?v=1LLgEmXuA_8)**

---

## What it does

Entities are ranked from highest to lowest contribution and drawn as descending bars. A
cumulative percentage line climbs across them to 100%, and up to three reference lines mark the
thresholds you care about — 80% by default. A summary sentence states the answer exactly:
*"1,120 of 5,000 entities (22.4%) make 80% of the total"*.

With 30 entities or fewer every entity has its own named bar, the classic Pareto. Above that,
the 15 largest are drawn by name and the rest in up to four bars by rank (*#16–62*), at the
average share per entity so the curve keeps falling — or, if you prefer, bins of a fixed share
of entities, which keep the chart readable whether the model has 40 SKUs or 400,000. A range bar
under the chart filters the page to any stretch of ranks.

**New in 1.7.0.0:** top 15 by name (free) and the vital few by name (Pro); a range bar that
filters the page by rank, with Vital few / A / B / C / Tail shortcuts in Pro; rank moves and who
left the vital few in the comparison (Pro); Report theme as the default style and six collection
styles (Pro); ABC zone opacity and labels; small-multiples panel styling. See the
[changelog](https://tinocallarisa-web.github.io/pareto-chart-pro/changelog.html).

**Power BI features supported:** conditional formatting (fx) · small multiples · cross-filtering,
highlighting and multi-select · drilldown · standard and report page tooltips · bookmarks · context
menu · keyboard navigation with ARIA · high contrast · report theme colours · model and dynamic
format strings · format on the canvas · 12 languages.

**Typical questions it answers**

- How exposed are we if our largest customers leave?
- How much of the catalogue can we retire without losing meaningful sales?
- Which few defect codes explain most of the failures?
- Is negotiating attention going where the spend actually is?

## Quick start

1. Get the visual from [AppSource](https://appsource.microsoft.com/product/power-bi-visuals/tino_callarisa.pareto-chart-pro-tcviz),
   or **Visualizations → ⋯ → Get more visuals → "Pareto Chart Pro"**.
2. Drag a category field (Customer, Product, SKU…) into **Entity**.
3. Drag a numeric measure (Revenue, Units, Defect count…) into **Value**.
4. Optionally add up to 10 measures to **Tooltips**.
5. *(Pro)* Drag last year's measure into **Comparison value**, or a field such as Region into
   **Small multiples**.

That's it — ranking, named bars and the cumulative line are automatic. No DAX required.
Drag the range bar under the chart to filter the page to a stretch of ranks.

## Free vs Pro

| | Free | Pro |
|---|---|---|
| Pareto bars, cumulative line, 2 reference lines | ✅ | ✅ |
| Cross-filtering, multi-select, drilldown | ✅ | ✅ |
| Tooltips field well (up to 10 measures) | ✅ | ✅ |
| Conditional formatting (`fx`) and Threshold Colors | ✅ | ✅ |
| IBCS Mode, high contrast, keyboard navigation | ✅ | ✅ |
| Entities | Verified at 500,000 entities (Power BI Service); Power BI Desktop: up to 30,000 rows | same |
| Top 15 by name + rank ranges (more than 30 entities) | ✅ | ✅ |
| Vital few by name (up to 50 named bars) | — | ✅ |
| Range bar: drag, keyboard, filter the page by rank | ✅ | ✅ |
| Range bar shortcuts (Vital few, A, B, C, Tail) and summary | — | ✅ |
| Report theme and six style templates (Clean, Minimal, Contrast, Soft, Compact, IBCS style) | ✅ | ✅ |
| Collection styles (Boardroom, Ledger, Editorial, Signal, Aurora, Terrace) | — | ✅ |
| Bin size (Bins of entities mode) | Fixed 20% (5 bars) | 1–20% (up to 100 bars) |
| Outlier exclusion (top/bottom %) | — | ✅ |
| Value labels on bars | — | ✅ |
| Bar border & gap styling | ✅ | ✅ |
| 3rd reference line | — | ✅ |
| Summary sentence, named bars, partial highlighting | ✅ | ✅ |
| Number formats from the model, 12 languages, legend, setup guide | ✅ | ✅ |
| Period comparison, with rank moves on named bars | — | ✅ |
| Small multiples, with panel styling | — | ✅ |
| ABC zones, with opacity and label options | — | ✅ |

Licences are purchased through AppSource and validated automatically inside Power BI.
There is nothing to configure and no key to enter.

## Accessibility

The chart is a single Tab stop. Once focused:

| Key | Action |
|---|---|
| `←` `→` `↑` `↓` | Move between bins |
| `Home` / `End` | First / last bin |
| `Enter` / `Space` | Select the bin (`Ctrl`/`Cmd` to add to the selection) |
| `Escape` | Clear the selection |
| `Shift+F10` / `ContextMenu` | Open the context menu |

The two handles of the range bar are separate sliders (`role="slider"`): arrows move one entity,
`Shift`+arrow or `Page Up`/`Page Down` a tenth of them, `Home`/`End` jump to the ends and
`Escape` clears the range.

Bars expose `role="option"`, `aria-selected` and a descriptive `aria-label`. Tooltips
open on keyboard focus as well as hover, and all colors switch to the system palette
when high contrast is active.

## Privacy

All processing happens locally inside Power BI. The only external call is the licence
check through Power BI's own `IVisualLicenseManager`, which shares no report data.
See the [Privacy Policy](https://tinocallarisa-web.github.io/pareto-chart-pro/privacy.html).

## Support

- 🐛 **Bugs and feature requests** — [open an issue](https://github.com/tinocallarisa-web/pareto-chart-pro/issues)
- 💬 **Questions and ideas** — [Discussions](https://github.com/tinocallarisa-web/pareto-chart-pro/discussions)
- ✉️ **Licensing and billing** — support@tcviz.com

## Building from source

```bash
npm install
npx pbiviz package          # production build -> dist/
node build-test.js          # test build (isPro=true, GUID suffixed _test)
```

Requires [powerbi-visuals-tools](https://www.npmjs.com/package/powerbi-visuals-tools) 5.6+.

## Licence

Proprietary. See [LICENSE](LICENSE) and the
[Terms of Service](https://tinocallarisa-web.github.io/pareto-chart-pro/terms.html).

---

© 2026 TCViz · Visuals to Power BI
