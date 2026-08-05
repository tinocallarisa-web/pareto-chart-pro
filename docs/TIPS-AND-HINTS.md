# Tips & Hints — Pareto Chart Pro

## Getting Started

Add an **Entity** field (customer, product, SKU, supplier) and a **Value** field (revenue, units, defects). The chart sorts automatically from highest to lowest and draws the cumulative % line. No manual sorting needed.

To see the 80/20 threshold, the default reference line is already set at 80%. A horizontal dashed line and a vertical crosshair mark the exact bin where cumulative value reaches 80%.

## Field Wells

| Field | Type | Description |
|---|---|---|
| Entity | Category / Hierarchy | The dimension to rank — customer, product, SKU, region |
| Value | Numeric measure | The metric to concentrate — revenue, units, defects, cost |

**Tip:** Add a hierarchy to Entity (e.g. Category > Subcategory > SKU) to enable drilldown. Use the drill buttons in the visual header to navigate levels.

## Format Pane

**Pareto section**
- Bin size % (Pro) — each bar covers this % of entities. 5% = 20 bars, 20% = 5 bars.
- Exclude bottom/top % (Pro) — remove outliers before binning. Useful when one anomaly distorts the whole distribution.
- Bar color — supports conditional formatting rules via the fx button.
- Bar opacity % — reduce to see reference lines more clearly through the bars.

**Reference Lines section**
- Line 1 is ON by default at 80%. Change the threshold to any value between 1–99.
- Enable Line 2 for a second threshold (e.g. 60% to create three zones).
- Line 3 (Pro) — add a third threshold for detailed zone analysis.

**Cumulative Line section**
- Increase Line width for presentations. Use Show dots OFF for a cleaner look in small tiles.

**Value Labels (Pro)**
- Show % labels above each bar. Useful for executive dashboards and screenshots.

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Pareto chart + cumulative line | ✓ | ✓ |
| Reference lines (up to 2) | ✓ | ✓ |
| Drilldown / hierarchy | ✓ | ✓ |
| High contrast mode | ✓ | ✓ |
| Cross-filtering & multi-select | ✓ | ✓ |
| Bin size (fixed at 20%) | ✓ | ✓ configurable 1–20% |
| Outlier exclusion | — | ✓ |
| Bar border & gap | — | ✓ |
| 3rd reference line | — | ✓ |
| Value labels on bars | — | ✓ |

## Tips & Best Practices

**For executive dashboards:** use 5 bins (20% bin size Pro), enable value labels, set a strong bar color. Keep the chart large enough so labels don't overlap.

**For analyst pages:** use 5% bins (20 bars) to see fine-grained concentration. Disable value labels. Use the outlier filter if you have extreme top accounts that dwarf the rest.

**For presentations:** set bar opacity to 100%, increase line width to 3, use a high-contrast color pair for bars and line.

**Reference line strategy:** the classic 80/20 rule uses one line at 80%. For ABC analysis, use three lines: A=70%, B=90%, C=100%.

**Drilldown tip:** start with product families to see overall concentration, then drill into SKUs to find the specific items to act on. Each level recalculates the Pareto automatically.

**Hover the cumulative dots** to see the exact cumulative % at each bin without reading the right Y-axis.

## Pro Features — Quick Reference

- **Bin size:** Format Pane → Pareto → Bin size %. Range 1–20%. Each bar = that % of entities.
- **Outlier exclusion:** Format Pane → Pareto → Exclude top/bottom %. Removes extreme values before binning.
- **Value labels:** Format Pane → Value Labels → Show ON. Configure font size, color, and % sign.
- **3rd reference line:** Format Pane → Reference Lines → Show line 3 ON.

## Example Configurations

**Classic 80/20 analysis**
Entity: Customer | Value: Revenue | Line 1: 80% | Bins: 20% Free or 10% Pro

**ABC inventory**
Entity: SKU | Value: Sales volume | Line 1: 70% (A) | Line 2: 90% (B) | Line 3: 100% (C) Pro

**Defect prioritization**
Entity: Issue category | Value: Defect count | Bins: 5% (Pro) | Outlier filter: top 2%

**Supplier concentration**
Entity: Supplier | Value: Purchase value | Line 1: 80% | Enable value labels

## Troubleshooting

**Bars are not sorted:** check that Value is a numeric measure, not a text field or calculated column with text output.

**Pro features not visible in Format Pane:** the license check runs after the first render. Wait a moment, or close and reopen the report. Make sure you are signed in with the account that purchased the license.

**Visual shows Free behavior after purchase:** verify the license is assigned to the user viewing the report in the Microsoft 365 admin center. The license must be assigned per user.

**Reference lines overlap at top:** if multiple lines cross the same bin, their top labels may overlap. Adjust threshold values so they cross different bins.

**Too many entities, chart is slow:** pre-filter with a slicer or report filter before connecting data. The visual supports up to 30,000 rows.
