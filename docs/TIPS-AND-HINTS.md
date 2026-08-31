# Tips & Hints — Pareto Chart Pro (v1.2.0.0)

## Getting Started
1. **Bind Entity**: Drag a categorical dimension (Customer, Product, SKU, Supplier) into `Entity`. For drilldown, drag a hierarchy field.
2. **Bind Value**: Drag a numeric measure (Sales, Revenue, Liters, Defect Count) into `Value`.
3. **Bind Tooltips**: Drag up to 10 additional measures (Profit, Margin %, Quantity) into `Tooltips`.

## Big Data Scaling (150,000+ Rows)
- **Massive Datasets**: Create a DAX calculated column (e.g. `[Grupo Pareto]` dividing rows into 10 or 50 quantile groups) and place it in `Entity`. This delivers instant (<1ms) cross-filtering of all 150,000 rows across your entire report.
- **Standard Datasets (<30,000 Rows)**: Place raw IDs (e.g. `customer_id`) directly in `Entity`. Pareto Chart Pro handles quantile binning, cumulative line calculation, and outlier trimming natively.

## Format Pane Reference & Features
- **IBCS Mode (Pro)**: One-click toggle under Pareto card to apply International Business Communication Standards corporate neutral styling (`#404040` charcoal bars, `#000000` solid axis typography).
- **Bin Size % (Pro)**: Set custom bin size from 1% to 20% (up to 100 bars). Free tier is fixed at 20% (5 bars).
- **Outlier Trimming (Pro)**: Exclude top or bottom % outliers to prevent extreme values from distorting your Pareto bins.
- **Reference Lines**: Up to 3 configurable reference crosshairs (default line 1 at 80% cumulative threshold).

## Free vs Pro Comparison
| Feature | Free Tier | Pro Tier |
|---|---|---|
| Pareto Bars & Cumulative Line | ✓ | ✓ |
| Max Rows Streamed | Up to 150,000+ | Up to 150,000+ |
| Bin Count | Fixed 5 (20%) | Custom 1–20% (100 bars) |
| Tooltips Field Well | Standard | Up to 10 Extra Measures |
| IBCS Mode (Corporate Palette) | — | ✓ |
| Value Labels on Bars | — | ✓ |
| Outlier Trimming (Top/Bottom %) | — | ✓ |
| Reference Lines | Up to 2 | Up to 3 |
