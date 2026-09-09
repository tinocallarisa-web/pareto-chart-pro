# Pareto Chart Pro — TCViz Web Product Page Content

Content for the four tabs of the TCViz product page. Current visual version: **1.4.0.0**.

## TAB 1: OVERVIEW

### Focus your analysis on what truly drives results

Pareto Chart Pro brings 80/20 ABC concentration analysis to Power BI. Identify the
customers, SKUs or defect causes that account for most of your total — and act on them.
Built to stay responsive on large models: window data reduction streams well past 150,000
rows, and clicking a bar filters the rest of the report through a native filter rather
than thousands of selection objects.

### Key highlights
- **Exact cross-filtering at any bin size.** Clicking a bar filters every entity in that
  bin, using the same mechanism native slicers use for large value lists.
- **Conditional formatting on bar colour.** The *fx* dialog works as it does on a native
  visual: gradient, rules or field value.
- **Threshold colours.** Colour bins by where they fall relative to a cumulative %
  threshold, with an optional highlight on the bin where the line crosses.
- **Keyboard and screen-reader support.** One Tab stop with a roving focus, arrow-key
  navigation, and bars that announce their range, share and cumulative percentage.
- **IBCS mode.** One click for International Business Communication Standards styling.
- **Drilldown and hierarchies.** Navigate from category to subcategory to individual SKU.

---

## TAB 2: FEATURES

Everything below is included without a licence except the six items marked **(Pro)**.

### Chart and analysis
- Ranked bars with a cumulative percentage line and interactive dots
- Strictly monotonic Pareto maths — guaranteed descending bars and clean interval labels
- Up to two configurable reference lines (default 80%), plus a **third (Pro)**
- **Custom bin size, 1–20% (Pro)** — up to 100 bars. Free renders fixed 20% bins (5 bars).
- **Outlier exclusion (Pro)** — drop the top and/or bottom % of entities before binning

### Colour and styling
- Bar colour, opacity, axis and cumulative line styling
- **Conditional formatting on bar colour** via the *fx* rule dialog
- **Threshold colours** — one colour within the threshold, another beyond, and an optional
  highlight on the crossing bin
- **IBCS mode** — neutral charcoal palette with black axis typography
- **Bar border colour and width, and bar gap (Pro)**
- **Value labels on bars (Pro)** — font size, colour and % formatting

### Interaction
- Exact cross-filtering with filter-in dimming
- Multi-select, drilldown and hierarchy navigation
- Custom tooltips field well — bind additional measures shown on hover
- Report and canvas tooltip pages
- Bookmarks: selection is restored when a bookmark is applied
- Right-click context menu

### Accessibility
- Full keyboard navigation: arrow keys between bins, `Home`/`End`, `Enter`/`Space` to
  select, `Ctrl`/`Cmd` to add, `Escape` to clear, `Shift+F10` for the context menu
- Visible focus ring, including a high-contrast variant
- ARIA labels announcing entity range, share and cumulative percentage
- Tooltips open on keyboard focus, not only on hover
- High contrast themes follow the Power BI palette

### Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Pareto chart, cumulative line, reference lines 1 and 2 | ✓ | ✓ |
| Conditional formatting, threshold colours, IBCS mode | ✓ | ✓ |
| Cross-filtering, drilldown, bookmarks, custom tooltips | ✓ | ✓ |
| Keyboard navigation and high contrast | ✓ | ✓ |
| Bin size | Fixed 20% (5 bars) | **1–20%, up to 100 bars** |
| Outlier exclusion (top/bottom %) | — | **✓** |
| Value labels on bars | — | **✓** |
| Third reference line | — | **✓** |
| Bar border colour and width | — | **✓** |
| Bar gap | — | **✓** |

Pro settings are listed in the format pane for everyone, each marked `(Pro)`. Changing one
without a licence leaves the chart on the Free result and raises Power BI's own
notification with a link to get a licence.

---

## TAB 3: TECHNICAL

- **API version**: `5.10.0`
- **Field wells**: Entity (grouping, required) · Value (measure, required) · Tooltips
  (measures, optional)
- **Data reduction**: `window` of 30,000 with `fetchMoreData(true)`; tested past 150,000 rows
- **Cross-filtering**: applies a `BasicFilter` over every entity in the bin, capped at
  10,000 values — the point past which a live connection degrades. Beyond it the visual
  declines and says so rather than filtering a subset and returning a silently wrong answer.
- **Licensing**: native `IVisualLicenseManager` through Microsoft AppSource. Plan
  `pareto-chart-pro-tcviz`. Resolution is asynchronous and never blocks rendering; both
  Active and Warning licence states are honoured.
- **Privacy and security**: all rendering is local and in memory. No external servers, no
  network requests, nothing stored outside the report.
- **Accessibility**: keyboard navigation, ARIA labels, visible focus ring, high contrast
- **Localization**: `en-US`

---

## TAB 4: CHANGELOG

### Version 1.4.0.0 (September 2026)
- **Added**: Power BI's own "feature blocked" notification when a Free user changes a Pro
  setting, with a link to get a licence
- **Changed**: Pro settings are now visible to everyone, each marked `(Pro)`. They were
  hidden from Free users, so the paid features could not be discovered.
- **Changed**: a licence in the `Warning` state (payment grace period) is honoured
- **Changed**: environments without licence enforcement no longer prompt anyone to buy
- **Removed**: the "Free: 20% bins — upgrade to Pro" caption drawn inside the chart
- **Fixed**: the bar colour swatch showed the default after the colour had been changed

### Version 1.3.0.0 (September 2026)
- **Added**: Conditional formatting on bar colour through the *fx* rule dialog
- **Added**: Threshold Colors card — colour bins relative to a cumulative % threshold
- **Added**: Full keyboard navigation and ARIA, with a visible focus ring
- **Added**: Localizable display strings
- **Fixed**: Cross-filtering is now exact at any bin size, and no longer filtered by a
  single entity per bar

### Version 1.2.0.0 (August 2026)
- **Added**: Tooltips field well for custom measures
- **Added**: One-click IBCS mode
- **Added**: 150,000+ row streaming
- **Added**: Monotonic remainder distribution (strictly descending bars)
- **Changed**: Dynamic bin adaptation when slicers filter the row count
