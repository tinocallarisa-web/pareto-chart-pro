# Pareto Chart Pro — TCViz Web Product Page Content

## TAB 1: OVERVIEW

### Focus Your Analysis on What Truly Drives Results
Pareto Chart Pro brings true 80/20 ABC concentration analysis to Power BI. Instantly identify top-performing customers, key revenue-generating SKUs, or critical defect root causes—scaled to support over 150,000+ rows with zero performance lag.

### Key Highlights
- **High-Performance 150,000+ Row Streaming**: Engineered with window data reduction and instant <1ms cross-filtering across report pages.
- **IBCS Mode**: One-click compliance with International Business Communication Standards for clean, executive-ready corporate reporting.
- **Custom Tooltips Field Well**: Bind up to 10 additional measures (Profit, Margin %, Quantity, Order Count) to display inside hover tooltips.
- **Strict Monotonic Pareto Math**: Mathematically guaranteed descending bar heights and clean 10% interval labels (`0–10%`, `10–20%`... `90–100%`).
- **Drilldown & Hierarchies**: Navigate seamlessly from Category down to Subcategory and individual SKUs.

---

## TAB 2: FEATURES

### Core Features (Free Tier)
- Native Pareto chart with ranked bars and cumulative percentage line
- Fixed 20% bin size (5 bars)
- Up to 2 configurable reference lines (default 80% threshold)
- Full drilldown & hierarchy navigation
- Instant cross-filtering with filter-in opacity dimming
- High contrast accessibility mode
- Native Power BI tooltip support

### Pro Features (Plan: `pareto-chart-pro-tcviz`)
- **Custom Bin Size (1–20%)**: Render up to 100 granular Pareto bars
- **IBCS Mode**: Neutral charcoal `#404040` palette with solid black `#000000` axis typography
- **Tooltips Field Well**: Up to 10 custom measures in hover tooltips
- **Outlier Exclusion**: Filter top and bottom % of extreme entities before binning
- **Value Labels on Bars**: Configurable font size, color, and % formatting
- **3rd Reference Line**: Add custom target thresholds (e.g. 50%, 80%, 95%)
- **Bar Border & Gap Styling**: Custom border width, color, and gap spacing

---

## TAB 3: TECHNICAL

- **API Version**: `5.10.0`
- **Data Reduction**: `"window": { "count": 30000 }` with `fetchMoreData(true)`
- **Capacity**: Tested up to 150,000+ rows in Power BI Desktop & Service
- **Licensing**: Native `IVisualLicenseManager` via Microsoft AppSource (30-day free trial)
- **Privacy & Security**: 100% local in-memory rendering. No external servers or network requests.
- **Accessibility**: High contrast mode support (`colorPalette.isHighContrast`)

---

## TAB 4: CHANGELOG

### Version 1.2.0.0 (August 2026)
- **Added**: Tooltips field well for up to 10 custom measures
- **Added**: One-click IBCS Mode toggle switch
- **Added**: High-performance 150,000+ row streaming & 0 DS0 query errors
- **Added**: Monotonic remainder distribution (strictly descending bars)
- **Changed**: Dynamic bin adaptation when slicers filter row count
- **Fixed**: SelectionId key deduplication for instant <1ms cross-filtering
