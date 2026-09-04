# Tips & Hints — Pareto Chart Pro (v1.2.0.0)

## Getting Started
1. **Bind Entity**: Drag a categorical dimension (Customer, Product, SKU, Supplier) into `Entity`. For drilldown, drag a hierarchy field.
2. **Bind Value**: Drag a numeric measure (Sales, Revenue, Liters, Defect Count) into `Value`.
3. **Bind Tooltips**: Drag up to 10 additional measures (Profit, Margin %, Quantity) into `Tooltips`.

## Big Data Architecture & Scaling Strategy

### 1. Standard Datasets (< 30,000 Entities) — WITHOUT DAX
- Simply drag your raw entity ID (e.g. `customer_id`, `product_id`, `SKU`) directly into the **Entity** field well.
- No DAX formulas required. Pareto Chart Pro automatically handles quantile binning, cumulative percentage calculations, outlier trimming, and tooltips natively.

### 2. Massive Enterprise Datasets (> 30,000 up to 150,000+ Entities) — WITH DAX
- To process over 30,000 rows up to 150,000+ entities with instant (<1ms) cross-filtering across your entire report, create a DAX calculated column to group entities into quantile bins and place it in **Entity**.

#### Exact DAX Calculated Column Formula Example:
```dax
Grupo Pareto = 
VAR VentasActual = 'sales_data'[Sales]
VAR TotalFilas = COUNTROWS(ALL('sales_data'))
VAR Ranking = RANKX(ALL('sales_data'), 'sales_data'[Sales], VentasActual, DESC, Skip)
VAR Percentil = CEILING((Ranking / TotalFilas) * 10, 1)
RETURN "Grupo " & FORMAT(Percentil, "00")
```
*(Note: Change `* 10` to `* 50` if you prefer 50 fine-grained quantile groups).*

## Format Pane Reference & Features
- **IBCS Mode (Free & Pro)**: One-click toggle under Pareto card to apply International Business Communication Standards corporate neutral styling (`#404040` charcoal bars, `#000000` solid axis typography).
- **Bin Size % (Pro)**: Set custom bin size from 1% to 20% (up to 100 bars). Free tier is fixed at 20% (5 bars).
- **Outlier Trimming (Pro)**: Exclude top or bottom % outliers to prevent extreme values from distorting your Pareto bins.
- **Reference Lines**: Up to 3 configurable reference crosshairs (default line 1 at 80% cumulative threshold).

## Free vs Pro Comparison
| Feature | Free Tier | Pro Tier |
|---|---|---|
| Pareto Bars & Cumulative Line | ✓ | ✓ |
| Max Rows Streamed | Up to 150,000+ | Up to 150,000+ |
| Bin Count | Fixed 5 (20%) | Custom 1–20% (100 bars) |
| Tooltips Field Well | Up to 10 Extra Measures | Up to 10 Extra Measures |
| IBCS Mode (Corporate Palette) | ✓ | ✓ |
| Value Labels on Bars | — | ✓ |
| Outlier Trimming (Top/Bottom %) | — | ✓ |
| Reference Lines | Up to 2 | Up to 3 |
