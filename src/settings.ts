"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

// ─── Aliases ──────────────────────────────────────────────────────────────────
import SimpleCard   = formattingSettings.SimpleCard;
import ColorPicker  = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import NumUpDown    = formattingSettings.NumUpDown;
import TextInput    = formattingSettings.TextInput;
import Model        = formattingSettings.Model;

// Every card and slice carries a displayNameKey: FormattingSettingsService gets the
// localization manager, and the key resolves against stringResources/<locale>. The
// English displayName stays as the fallback. Keys follow capabilities.json:
// Obj_<card> and Prop_<card>_<property>.

// ─── Pareto Card ──────────────────────────────────────────────────────────────
export class ParetoCard extends SimpleCard {
    name        = "pareto";
    displayName = "Pareto";
    displayNameKey = "Obj_pareto";

    binSizePct  = new NumUpDown({ name: "binSizePct",  displayName: "Bin size % of entities (Pro)", displayNameKey: "Prop_pareto_binSizePct", value: 5 });
    trimLower   = new NumUpDown({ name: "trimLower",   displayName: "Exclude bottom % entities (Pro)", displayNameKey: "Prop_pareto_trimLower", value: 0 });
    trimUpper   = new NumUpDown({ name: "trimUpper",   displayName: "Exclude top % entities (Pro)", displayNameKey: "Prop_pareto_trimUpper", value: 0 });
    // Conditional formatting needs BOTH of these, and instanceKind alone is the
    // trap: it makes the fx button appear while Power BI still has no scope to
    // write the resolved rule into, so nothing ever reaches the dataView.
    //
    //   instanceKind 3 = VisualEnumerationInstanceKinds.ConstantOrRule
    //                    (const enum — cannot be referenced at runtime)
    //   selector       = dataViewWildcard.createDataViewWildcardSelector(
    //                        DataViewWildcardMatchingOption.InstancesAndTotals)
    //                    inlined verbatim so we do not pull in
    //                    powerbi-visuals-utils-dataviewutils for one object literal.
    //
    // With the wildcard selector in place, Power BI resolves the rule per entity
    // and hands the colors back on categorical.categories[0].objects[i].
    barColor    = new ColorPicker({
        name: "barColor",
        displayName: "Bar color",
        displayNameKey: "Prop_pareto_barColor",
        value: { value: "#4472C4" },
        selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] } as any,
        instanceKind: 3,
    });
    barOpacity  = new NumUpDown({ name: "barOpacity",  displayName: "Bar opacity %", displayNameKey: "Prop_pareto_barOpacity", value: 85 });
    borderColor = new ColorPicker({ name: "borderColor", displayName: "Border color", displayNameKey: "Prop_pareto_borderColor", value: { value: "#2E5BA8" } });
    borderWidth = new NumUpDown({ name: "borderWidth", displayName: "Border width", displayNameKey: "Prop_pareto_borderWidth", value: 0 });
    barGap      = new NumUpDown({ name: "barGap",      displayName: "Bar gap px",   displayNameKey: "Prop_pareto_barGap", value: 2 });
    ibcsMode    = new ToggleSwitch({ name: "ibcsMode",  displayName: "IBCS Mode (Standardized)", displayNameKey: "Prop_pareto_ibcsMode", value: false });

    slices = [
        this.binSizePct, this.trimLower, this.trimUpper,
        this.barColor, this.barOpacity,
        this.borderColor, this.borderWidth, this.barGap,
        this.ibcsMode,
    ];
}

// ─── Threshold Colors Card ────────────────────────────────────────────────────
export class ThresholdColorsCard extends SimpleCard {
    name        = "thresholdColors";
    displayName = "Threshold Colors";
    displayNameKey = "Obj_thresholdColors";

    show           = new ToggleSwitch({ name: "show",           displayName: "Color bars by threshold", displayNameKey: "Prop_thresholdColors_show", value: false });
    thresholdValue = new NumUpDown({    name: "thresholdValue", displayName: "Threshold (cumulative %)", displayNameKey: "Prop_thresholdColors_thresholdValue", value: 80 });
    withinColor    = new ColorPicker({  name: "withinColor",    displayName: "Within threshold",  displayNameKey: "Prop_thresholdColors_withinColor", value: { value: "#4472C4" } });
    beyondColor    = new ColorPicker({  name: "beyondColor",    displayName: "Beyond threshold",  displayNameKey: "Prop_thresholdColors_beyondColor", value: { value: "#C6CFDF" } });
    highlightCrossing = new ToggleSwitch({ name: "highlightCrossing", displayName: "Highlight crossing bin", displayNameKey: "Prop_thresholdColors_highlightCrossing", value: true });
    crossingColor  = new ColorPicker({  name: "crossingColor",  displayName: "Crossing bin color", displayNameKey: "Prop_thresholdColors_crossingColor", value: { value: "#ED7D31" } });

    slices = [
        this.show, this.thresholdValue,
        this.withinColor, this.beyondColor,
        this.highlightCrossing, this.crossingColor,
    ];
}

// ─── Axes Card ────────────────────────────────────────────────────────────────
export class AxesCard extends SimpleCard {
    name        = "axes";
    displayName = "Axes";
    displayNameKey = "Obj_axes";

    axisColor  = new ColorPicker({ name: "axisColor",  displayName: "Axis text color", displayNameKey: "Prop_axes_axisColor", value: { value: "#444444" } });
    gridColor  = new ColorPicker({ name: "gridColor",  displayName: "Grid color",      displayNameKey: "Prop_axes_gridColor", value: { value: "#e0e0e0" } });
    fontSize   = new NumUpDown({ name: "fontSize",     displayName: "Font size",       displayNameKey: "Prop_axes_fontSize", value: 11 });
    showXLabel = new ToggleSwitch({ name: "showXLabel", displayName: "Show X axis label", displayNameKey: "Prop_axes_showXLabel", value: true });
    showYLabel = new ToggleSwitch({ name: "showYLabel", displayName: "Show Y axis label", displayNameKey: "Prop_axes_showYLabel", value: true });

    slices = [this.axisColor, this.gridColor, this.fontSize, this.showXLabel, this.showYLabel];
}

// ─── Cumulative Line Card ─────────────────────────────────────────────────────
export class CumulativeLineCard extends SimpleCard {
    name        = "cumulativeLine";
    displayName = "Cumulative Line";
    displayNameKey = "Obj_cumulativeLine";

    lineColor = new ColorPicker({ name: "lineColor", displayName: "Line color", displayNameKey: "Prop_cumulativeLine_lineColor", value: { value: "#ED7D31" } });
    lineWidth = new NumUpDown({ name: "lineWidth",   displayName: "Line width", displayNameKey: "Prop_cumulativeLine_lineWidth", value: 2 });
    showDots  = new ToggleSwitch({ name: "showDots", displayName: "Show dots",  displayNameKey: "Prop_cumulativeLine_showDots", value: true });
    dotRadius = new NumUpDown({ name: "dotRadius",   displayName: "Dot radius", displayNameKey: "Prop_cumulativeLine_dotRadius", value: 4 });

    slices = [this.lineColor, this.lineWidth, this.showDots, this.dotRadius];
}

// ─── Reference Lines Card ─────────────────────────────────────────────────────
export class ReferenceLinesCard extends SimpleCard {
    name        = "referenceLines";
    displayName = "Reference Lines";
    displayNameKey = "Obj_referenceLines";

    showRef1  = new ToggleSwitch({ name: "showRef1", displayName: "Show line 1", displayNameKey: "Prop_referenceLines_showRef1", value: true });
    ref1Value = new NumUpDown({ name: "ref1Value",   displayName: "Line 1 — cumulative % threshold", displayNameKey: "Prop_referenceLines_ref1Value", value: 80 });
    ref1Color = new ColorPicker({ name: "ref1Color", displayName: "Line 1 color", displayNameKey: "Prop_referenceLines_ref1Color", value: { value: "#E84444" } });
    ref1Label = new TextInput({ name: "ref1Label",   displayName: "Line 1 label", displayNameKey: "Prop_referenceLines_ref1Label", value: "80%", placeholder: "80%" });

    showRef2  = new ToggleSwitch({ name: "showRef2", displayName: "Show line 2", displayNameKey: "Prop_referenceLines_showRef2", value: false });
    ref2Value = new NumUpDown({ name: "ref2Value",   displayName: "Line 2 — cumulative % threshold", displayNameKey: "Prop_referenceLines_ref2Value", value: 60 });
    ref2Color = new ColorPicker({ name: "ref2Color", displayName: "Line 2 color", displayNameKey: "Prop_referenceLines_ref2Color", value: { value: "#9B59B6" } });
    ref2Label = new TextInput({ name: "ref2Label",   displayName: "Line 2 label", displayNameKey: "Prop_referenceLines_ref2Label", value: "60%", placeholder: "60%" });

    showRef3  = new ToggleSwitch({ name: "showRef3", displayName: "Show line 3 (Pro)", displayNameKey: "Prop_referenceLines_showRef3", value: false });
    ref3Value = new NumUpDown({ name: "ref3Value",   displayName: "Line 3 — cumulative % threshold (Pro)", displayNameKey: "Prop_referenceLines_ref3Value", value: 50 });
    ref3Color = new ColorPicker({ name: "ref3Color", displayName: "Line 3 color (Pro)", displayNameKey: "Prop_referenceLines_ref3Color", value: { value: "#27AE60" } });
    ref3Label = new TextInput({ name: "ref3Label",   displayName: "Line 3 label (Pro)", displayNameKey: "Prop_referenceLines_ref3Label", value: "50%", placeholder: "50%" });

    slices = [
        this.showRef1, this.ref1Value, this.ref1Color, this.ref1Label,
        this.showRef2, this.ref2Value, this.ref2Color, this.ref2Label,
        this.showRef3, this.ref3Value, this.ref3Color, this.ref3Label,
    ];
}

// ─── Summary Card (Free) ──────────────────────────────────────────────────────
export class SummaryCard extends SimpleCard {
    name        = "summary";
    displayName = "Summary";
    displayNameKey = "Obj_summary";

    show     = new ToggleSwitch({ name: "show",     displayName: "Show summary", displayNameKey: "Prop_summary_show", value: true });
    fontSize = new NumUpDown({    name: "fontSize", displayName: "Font size",    displayNameKey: "Prop_summary_fontSize", value: 12 });
    color    = new ColorPicker({  name: "color",    displayName: "Color",        displayNameKey: "Prop_summary_color", value: { value: "#333333" } });

    slices = [this.show, this.fontSize, this.color];
}

// ─── Comparison Card (Pro) ────────────────────────────────────────────────────
export class ComparisonCard extends SimpleCard {
    name        = "comparison";
    displayName = "Comparison (Pro)";
    displayNameKey = "Obj_comparison";

    showBars  = new ToggleSwitch({ name: "showBars",  displayName: "Show comparison bars", displayNameKey: "Prop_comparison_showBars", value: true });
    barColor  = new ColorPicker({  name: "barColor",  displayName: "Comparison bar color", displayNameKey: "Prop_comparison_barColor", value: { value: "#8C8C8C" } });
    showLine  = new ToggleSwitch({ name: "showLine",  displayName: "Show comparison line", displayNameKey: "Prop_comparison_showLine", value: true });
    lineColor = new ColorPicker({  name: "lineColor", displayName: "Comparison line color", displayNameKey: "Prop_comparison_lineColor", value: { value: "#8C8C8C" } });
    showPills = new ToggleSwitch({ name: "showPills", displayName: "Show change (pp) per bar", displayNameKey: "Prop_comparison_showPills", value: true });
    upColor   = new ColorPicker({  name: "upColor",   displayName: "Increase color", displayNameKey: "Prop_comparison_upColor", value: { value: "#2E7D32" } });
    downColor = new ColorPicker({  name: "downColor", displayName: "Decrease color", displayNameKey: "Prop_comparison_downColor", value: { value: "#C62828" } });

    slices = [this.showBars, this.barColor, this.showLine, this.lineColor, this.showPills, this.upColor, this.downColor];
}

// ─── Small Multiples Card (Pro) ───────────────────────────────────────────────
export class SmallMultiplesCard extends SimpleCard {
    name        = "smallMultiples";
    displayName = "Small multiples (Pro)";
    displayNameKey = "Obj_smallMultiples";

    columns       = new NumUpDown({   name: "columns",       displayName: "Columns (0 = automatic)", displayNameKey: "Prop_smallMultiples_columns", value: 0 });
    titleFontSize = new NumUpDown({   name: "titleFontSize", displayName: "Title font size", displayNameKey: "Prop_smallMultiples_titleFontSize", value: 12 });
    titleColor    = new ColorPicker({ name: "titleColor",    displayName: "Title color", displayNameKey: "Prop_smallMultiples_titleColor", value: { value: "#333333" } });

    slices = [this.columns, this.titleFontSize, this.titleColor];
}

// ─── ABC Zones Card (Pro) ─────────────────────────────────────────────────────
export class AbcZonesCard extends SimpleCard {
    name        = "abcZones";
    displayName = "ABC zones (Pro)";
    displayNameKey = "Obj_abcZones";

    show       = new ToggleSwitch({ name: "show",       displayName: "Show ABC zones", displayNameKey: "Prop_abcZones_show", value: false });
    aCut       = new NumUpDown({    name: "aCut",       displayName: "Class A up to (cumulative %)", displayNameKey: "Prop_abcZones_aCut", value: 80 });
    bCut       = new NumUpDown({    name: "bCut",       displayName: "Class B up to (cumulative %)", displayNameKey: "Prop_abcZones_bCut", value: 95 });
    aColor     = new ColorPicker({  name: "aColor",     displayName: "Class A color", displayNameKey: "Prop_abcZones_aColor", value: { value: "#2B6CB0" } });
    bColor     = new ColorPicker({  name: "bColor",     displayName: "Class B color", displayNameKey: "Prop_abcZones_bColor", value: { value: "#3E9C5B" } });
    cColor     = new ColorPicker({  name: "cColor",     displayName: "Class C color", displayNameKey: "Prop_abcZones_cColor", value: { value: "#A0A0A0" } });
    showLabels = new ToggleSwitch({ name: "showLabels", displayName: "Show zone labels", displayNameKey: "Prop_abcZones_showLabels", value: true });

    slices = [this.show, this.aCut, this.bCut, this.aColor, this.bColor, this.cColor, this.showLabels];
}

// ─── Value Labels Card ────────────────────────────────────────────────────────
export class ValueLabelsCard extends SimpleCard {
    name        = "valueLabels";
    displayName = "Value Labels (Pro)";
    displayNameKey = "Obj_valueLabels";

    show        = new ToggleSwitch({ name: "show",        displayName: "Show",        displayNameKey: "Prop_valueLabels_show", value: true });
    fontSize    = new NumUpDown({ name: "fontSize",       displayName: "Font size",   displayNameKey: "Prop_valueLabels_fontSize", value: 10 });
    color       = new ColorPicker({ name: "color",        displayName: "Color",       displayNameKey: "Prop_valueLabels_color", value: { value: "#444444" } });
    showPercent = new ToggleSwitch({ name: "showPercent", displayName: "Show % sign", displayNameKey: "Prop_valueLabels_showPercent", value: true });

    slices = [this.show, this.fontSize, this.color, this.showPercent];
}

// ─── Root Model ───────────────────────────────────────────────────────────────
export class ParetoFormattingSettings extends Model {
    pareto          = new ParetoCard();
    summary         = new SummaryCard();
    thresholdColors = new ThresholdColorsCard();
    axes            = new AxesCard();
    cumulativeLine  = new CumulativeLineCard();
    referenceLines  = new ReferenceLinesCard();
    comparison      = new ComparisonCard();
    smallMultiples  = new SmallMultiplesCard();
    abcZones        = new AbcZonesCard();
    valueLabels     = new ValueLabelsCard();

    cards = [
        this.pareto,
        this.summary,
        this.thresholdColors,
        this.axes,
        this.cumulativeLine,
        this.referenceLines,
        this.comparison,
        this.smallMultiples,
        this.abcZones,
        this.valueLabels,
    ];
}
