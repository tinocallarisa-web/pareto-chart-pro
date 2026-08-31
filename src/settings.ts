"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

// ─── Aliases ──────────────────────────────────────────────────────────────────
import SimpleCard   = formattingSettings.SimpleCard;
import ColorPicker  = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import NumUpDown    = formattingSettings.NumUpDown;
import TextInput    = formattingSettings.TextInput;
import Model        = formattingSettings.Model;

// ─── Pareto Card ──────────────────────────────────────────────────────────────
export class ParetoCard extends SimpleCard {
    name        = "pareto";
    displayName = "Pareto";

    binSizePct  = new NumUpDown({ name: "binSizePct",  displayName: "Bin size % of entities (Pro)", value: 5 });
    trimLower   = new NumUpDown({ name: "trimLower",   displayName: "Exclude bottom % entities (Pro)", value: 0 });
    trimUpper   = new NumUpDown({ name: "trimUpper",   displayName: "Exclude top % entities (Pro)", value: 0 });
    barColor    = new ColorPicker({ name: "barColor",  displayName: "Bar color",     value: { value: "#4472C4" } });
    barOpacity  = new NumUpDown({ name: "barOpacity",  displayName: "Bar opacity %", value: 85 });
    borderColor = new ColorPicker({ name: "borderColor", displayName: "Border color (Pro)", value: { value: "#2E5BA8" } });
    borderWidth = new NumUpDown({ name: "borderWidth", displayName: "Border width (Pro)", value: 0 });
    barGap      = new NumUpDown({ name: "barGap",      displayName: "Bar gap px (Pro)",   value: 2 });
    ibcsMode    = new ToggleSwitch({ name: "ibcsMode",  displayName: "IBCS Mode (Standardized)", value: false });

    slices = [
        this.binSizePct, this.trimLower, this.trimUpper,
        this.barColor, this.barOpacity,
        this.borderColor, this.borderWidth, this.barGap,
        this.ibcsMode,
    ];
}

// ─── Axes Card ────────────────────────────────────────────────────────────────
export class AxesCard extends SimpleCard {
    name        = "axes";
    displayName = "Axes";

    axisColor  = new ColorPicker({ name: "axisColor",  displayName: "Axis text color",   value: { value: "#444444" } });
    gridColor  = new ColorPicker({ name: "gridColor",  displayName: "Grid color",         value: { value: "#e0e0e0" } });
    fontSize   = new NumUpDown({ name: "fontSize",     displayName: "Font size",           value: 11 });
    showXLabel = new ToggleSwitch({ name: "showXLabel", displayName: "Show X axis label", value: true });
    showYLabel = new ToggleSwitch({ name: "showYLabel", displayName: "Show Y axis label", value: true });

    slices = [this.axisColor, this.gridColor, this.fontSize, this.showXLabel, this.showYLabel];
}

// ─── Cumulative Line Card ─────────────────────────────────────────────────────
export class CumulativeLineCard extends SimpleCard {
    name        = "cumulativeLine";
    displayName = "Cumulative Line";

    lineColor = new ColorPicker({ name: "lineColor", displayName: "Line color", value: { value: "#ED7D31" } });
    lineWidth = new NumUpDown({ name: "lineWidth",   displayName: "Line width", value: 2 });
    showDots  = new ToggleSwitch({ name: "showDots", displayName: "Show dots",  value: true });
    dotRadius = new NumUpDown({ name: "dotRadius",   displayName: "Dot radius", value: 4 });

    slices = [this.lineColor, this.lineWidth, this.showDots, this.dotRadius];
}

// ─── Reference Lines Card ─────────────────────────────────────────────────────
export class ReferenceLinesCard extends SimpleCard {
    name        = "referenceLines";
    displayName = "Reference Lines";

    showRef1  = new ToggleSwitch({ name: "showRef1", displayName: "Show line 1", value: true });
    ref1Value = new NumUpDown({ name: "ref1Value",   displayName: "Line 1 — cumulative % threshold", value: 80 });
    ref1Color = new ColorPicker({ name: "ref1Color", displayName: "Line 1 color", value: { value: "#E84444" } });
    ref1Label = new TextInput({ name: "ref1Label",   displayName: "Line 1 label", value: "80%", placeholder: "80%" });

    showRef2  = new ToggleSwitch({ name: "showRef2", displayName: "Show line 2", value: false });
    ref2Value = new NumUpDown({ name: "ref2Value",   displayName: "Line 2 — cumulative % threshold", value: 60 });
    ref2Color = new ColorPicker({ name: "ref2Color", displayName: "Line 2 color", value: { value: "#9B59B6" } });
    ref2Label = new TextInput({ name: "ref2Label",   displayName: "Line 2 label", value: "60%", placeholder: "60%" });

    showRef3  = new ToggleSwitch({ name: "showRef3", displayName: "Show line 3 (Pro)", value: false });
    ref3Value = new NumUpDown({ name: "ref3Value",   displayName: "Line 3 — cumulative % threshold (Pro)", value: 50 });
    ref3Color = new ColorPicker({ name: "ref3Color", displayName: "Line 3 color (Pro)", value: { value: "#27AE60" } });
    ref3Label = new TextInput({ name: "ref3Label",   displayName: "Line 3 label (Pro)", value: "50%", placeholder: "50%" });

    slices = [
        this.showRef1, this.ref1Value, this.ref1Color, this.ref1Label,
        this.showRef2, this.ref2Value, this.ref2Color, this.ref2Label,
        this.showRef3, this.ref3Value, this.ref3Color, this.ref3Label,
    ];
}

// ─── Value Labels Card ────────────────────────────────────────────────────────
export class ValueLabelsCard extends SimpleCard {
    name        = "valueLabels";
    displayName = "Value Labels (Pro)";

    show        = new ToggleSwitch({ name: "show",        displayName: "Show",        value: true });
    fontSize    = new NumUpDown({ name: "fontSize",       displayName: "Font size",   value: 10 });
    color       = new ColorPicker({ name: "color",        displayName: "Color",       value: { value: "#444444" } });
    showPercent = new ToggleSwitch({ name: "showPercent", displayName: "Show % sign", value: true });

    slices = [this.show, this.fontSize, this.color, this.showPercent];
}

// ─── Root Model ───────────────────────────────────────────────────────────────
export class ParetoFormattingSettings extends Model {
    pareto         = new ParetoCard();
    axes           = new AxesCard();
    cumulativeLine = new CumulativeLineCard();
    referenceLines = new ReferenceLinesCard();
    valueLabels    = new ValueLabelsCard();

    cards = [
        this.pareto,
        this.axes,
        this.cumulativeLine,
        this.referenceLines,
        this.valueLabels,
    ];
}
