# Pareto Chart Pro

**80/20 concentration analysis for Microsoft Power BI.** Rank any entity, group it into
percentage bins, and read the cumulative line against the thresholds your decision
actually depends on — without the sorted-column-plus-DAX workaround.

[![AppSource](https://img.shields.io/badge/Microsoft-AppSource-0078D4)](https://appsource.microsoft.com/product/power-bi-visuals/pareto-chart-pro)
[![Certified](https://img.shields.io/badge/Power%20BI-Certified-107C10)](https://learn.microsoft.com/power-bi/developer/visuals/power-bi-custom-visuals-certified)
[![Docs](https://img.shields.io/badge/docs-tcviz-C96442)](https://tinocallarisa-web.github.io/pareto-chart-pro/)

📘 **[Documentation](https://tinocallarisa-web.github.io/pareto-chart-pro/support.html)** ·
💡 **[Tips & best practices](https://tinocallarisa-web.github.io/pareto-chart-pro/tips.html)** ·
📋 **[Changelog](https://tinocallarisa-web.github.io/pareto-chart-pro/changelog.html)** ·
🎥 **[Video walkthrough](https://www.youtube.com/watch?v=qtN0ckSXNZQ)**

---

## What it does

Entities are ranked from highest to lowest contribution, grouped into bins of a fixed
percentage of the entity population, and drawn as descending bars. A cumulative
percentage line climbs across them to 100%, and up to three reference lines mark the
thresholds you care about — 80% by default.

Because the X axis is a share of entities rather than a list of names, the chart stays
readable whether the model has 40 SKUs or 40,000.

**Typical questions it answers**

- How exposed are we if our largest customers leave?
- How much of the catalogue can we retire without losing meaningful sales?
- Which few defect codes explain most of the failures?
- Is negotiating attention going where the spend actually is?

## Quick start

1. Get the visual from [AppSource](https://appsource.microsoft.com/product/power-bi-visuals/pareto-chart-pro),
   or **Visualizations → ⋯ → Get more visuals → "Pareto Chart Pro"**.
2. Drag a category field (Customer, Product, SKU…) into **Entity**.
3. Drag a numeric measure (Revenue, Units, Defect count…) into **Value**.
4. Optionally add up to 10 measures to **Tooltips**.

That's it — ranking, binning and the cumulative line are automatic. No DAX required.

## Free vs Pro

| | Free | Pro |
|---|---|---|
| Pareto bars, cumulative line, 2 reference lines | ✅ | ✅ |
| Cross-filtering, multi-select, drilldown | ✅ | ✅ |
| Tooltips field well (up to 10 measures) | ✅ | ✅ |
| Conditional formatting (`fx`) and Threshold Colors | ✅ | ✅ |
| IBCS Mode, high contrast, keyboard navigation | ✅ | ✅ |
| Max entities (Power BI Service) | 150,000+ | 150,000+ |
| Bin size | Fixed 20% (5 bars) | 1–20% (up to 100 bars) |
| Outlier exclusion (top/bottom %) | — | ✅ |
| Value labels on bars | — | ✅ |
| Bar border & gap styling | — | ✅ |
| 3rd reference line | — | ✅ |

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
