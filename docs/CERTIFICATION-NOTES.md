# Certification Notes — Pareto Chart Pro v1.2.0.0

## General Information
- **Visual Name:** Pareto Chart Pro
- **GUID:** ParetoChartPro1A2B3C4D5E6F7A8B9C0D
- **Version:** 1.2.0.0
- **Plan ID / spIdentifier:** pareto-chart-pro-tcviz
- **Certification Branch:** https://github.com/tinocallarisa-web/pareto-chart-pro/tree/certification
- **Support URL:** https://tinocallarisa-web.github.io/pareto-chart-pro/support.html
- **Privacy URL:** https://tinocallarisa-web.github.io/pareto-chart-pro/privacy.html
- **Terms URL:** https://tinocallarisa-web.github.io/pareto-chart-pro/terms.html
- **Video Walkthrough:** https://www.youtube.com/watch?v=1YmpeyACe2o

## Release Highlights (v1.2.0.0)
- **Tooltips Field Well (`tooltips` role):** Bind up to 10 additional custom measures to display in hover tooltips.
- **IBCS Mode (`IBCS Mode (Standardized)`):** One-click toggle in Pareto Format card to apply International Business Communication Standards styling (neutral charcoal `#404040` bars, `#000000` solid axis typography).
- **Strict Monotonic Pareto Math:** Remainder items (`tn % nBins`) are prioritized in top bins, guaranteeing strictly descending bar heights and clean 10% interval labels (`0–10%`, `10–20%`... `90–100%`).
- **Dynamic Bin Adaptation:** Automatically adjusts bin count (`Math.min(requestedNBins, tn)`) when slicers or filters reduce rows below requested bin count.
- **Selection ID Deduplication:** Category selection IDs are strictly deduplicated by key (`seen.has(key)`), preventing `DS0` duplicate column query errors and ensuring instant (<1ms) cross-filtering response.

## Big Data Architecture & DAX Integration (v1.2.0.0 Specification)

### 1. Standard Datasets (< 30,000 Entities) — Native Non-DAX Mode
- Configured in `capabilities.json` with `"window": { "count": 30000 }` and `fetchMoreData(true)`.
- Report authors place raw entity fields (e.g. `customer_id`, `product_id`, `SKU`) directly in the `Entity` field well.
- The visual natively performs quantile binning, cumulative line calculation, outlier trimming, and tooltip parsing in memory.

### 2. Massive Enterprise Datasets (> 30,000 up to 150,000+ Entities) — DAX Quantile Mode
- To process over 30,000 rows up to 150,000+ entities with instant (<1ms) cross-filtering across report pages, report authors bind a DAX calculated quantile column to the `Entity` field well.
- This delegates group aggregation to Power BI's DAX engine, allowing the visual to render clean 10% or 2% quantile bars while filtering 100% of underlying rows across the report without host lockup.

#### Recommended DAX Calculated Column Formula:
```dax
Grupo Pareto = 
VAR VentasActual = 'sales_data'[Sales]
VAR TotalFilas = COUNTROWS(ALL('sales_data'))
VAR Ranking = RANKX(ALL('sales_data'), 'sales_data'[Sales], VentasActual, DESC, Skip)
VAR Percentil = CEILING((Ranking / TotalFilas) * 10, 1)
RETURN "Grupo " & FORMAT(Percentil, "00")
```
*(Note: Change `* 10` to `* 50` for 50 fine-grained quantile groups).*

## Licensing & Architecture
- **License API:** Native Power BI `IVisualLicenseManager` via `host.licenseManager.getAvailableServicePlans()`.
- **No External Servers:** Licensing is 100% resolved asynchronously via Microsoft AppSource infrastructure. No external network endpoints, tracking scripts, or custom servers are contacted.
- **Render Safety:** License resolution is deferred via `setTimeout(0)` after initial render and does not block visual painting or report page initialization.

## Free vs Pro Tier
- **Free Tier:**
  - Full Pareto chart with ranked bars and cumulative % line
  - 5 bars (fixed at 20% bin size)
  - Up to 2 configurable reference lines (default 80%)
  - Drilldown / hierarchy navigation
  - Cross-filtering and multi-select with filter-in dimming
  - Standard tooltips on bars and dots
  - High contrast mode
- **Pro Tier (Plan `pareto-chart-pro-tcviz`):**
  - Custom bin size 1–20% (up to 100 bars)
  - **Tooltips field well** (bind up to 10 custom measures to hover tooltips)
  - **IBCS Mode** (one-click International Business Communication Standards corporate palette & typography)
  - Outlier exclusion (top/bottom % trimming)
  - Value labels on bars (font size, color, % sign)
  - Third reference line
  - Bar border color, width, and gap styling

## Testing Instructions

### Free Tier Testing
1. Import `dist/ParetoChartPro1A2B3C4D5E6F7A8B9C0D.1.2.0.0.pbiviz` into Power BI Desktop.
2. Bind a dimension (e.g. `Customer`) to `Entity` and a numeric measure (e.g. `Sales`) to `Value`.
3. Verify the Pareto chart renders 5 bars with a cumulative percentage line.
4. Verify cross-filtering works smoothly when clicking any bar.

### Pro Tier Testing
1. Assign a test account with an active `pareto-chart-pro-tcviz` AppSource license plan.
2. Open Format Pane → **Pareto** card.
3. Change **Bin size %** to `5%` (renders 20 bars).
4. Enable **IBCS Mode (Standardized)** toggle and verify bars update to neutral charcoal `#404040` with solid black `#000000` axis typography.
5. Drag additional measures into the **Tooltips** field well and hover over any bar to verify custom tooltip metrics.
6. Verify value labels, outlier exclusion, and 3rd reference line.
