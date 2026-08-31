"use strict";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions  = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions        = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                    = powerbi.extensibility.visual.IVisual;
import IVisualHost                = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager          = powerbi.extensibility.ISelectionManager;
import ISelectionId               = powerbi.visuals.ISelectionId;
import DataView                   = powerbi.DataView;
import ServicePlanState           = powerbi.ServicePlanState;
import IVisualEventService        = powerbi.extensibility.IVisualEventService;
import DataViewCategoryColumn     = powerbi.DataViewCategoryColumn;

import * as d3 from "d3";

import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { ParetoFormattingSettings } from "./settings";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAN_ID               = "pareto-chart-pro-tcviz";
const MAX_SEL_IDS_PER_BIN   = 100;   // cap per bin — ensures fast, fluid click response without DAX query lockup
const FREE_BIN_SIZE_PCT = 20;
const MARGIN            = { top: 28, right: 64, bottom: 68, left: 64 };

// ─── Settings ─────────────────────────────────────────────────────────────────
interface Settings {
    // pareto group
    binSizePct:   number;
    trimLower:    number;
    trimUpper:    number;
    barColor:     string;
    barOpacity:   number;
    borderColor:  string;
    borderWidth:  number;
    barGap:       number;
    ibcsMode:     boolean;
    // axes group
    axisColor:    string;
    gridColor:    string;
    axisFontSize: number;
    showXLabel:   boolean;
    showYLabel:   boolean;
    // cumulativeLine group
    lineColor:    string;
    lineWidth:    number;
    showDots:     boolean;
    dotRadius:    number;
    // referenceLines group
    showRef1:     boolean;
    ref1Value:    number;
    ref1Color:    string;
    ref1Label:    string;
    showRef2:     boolean;
    ref2Value:    number;
    ref2Color:    string;
    ref2Label:    string;
    showRef3:     boolean;
    ref3Value:    number;
    ref3Color:    string;
    ref3Label:    string;
    // valueLabels group
    showLabels:   boolean;
    labelFontSize:number;
    labelColor:   string;
    showPercent:  boolean;
}

function readSettings(dv: DataView): Settings {
    const o   = dv?.metadata?.objects;
    const col = (g: string, p: string, def: string) =>
        ((o?.[g]?.[p] as powerbi.Fill)?.solid?.color) ?? def;
    const boo = (g: string, p: string, def: boolean) =>
        (o?.[g]?.[p] as boolean) ?? def;
    const num = (g: string, p: string, def: number) =>
        (o?.[g]?.[p] as number) ?? def;
    const txt = (g: string, p: string, def: string) =>
        (o?.[g]?.[p] as string) ?? def;

    return {
        binSizePct:   num("pareto", "binSizePct",    5),
        trimLower:    num("pareto", "trimLower",      0),
        trimUpper:    num("pareto", "trimUpper",      0),
        barColor:     col("pareto", "barColor",       "#4472C4"),
        barOpacity:   num("pareto", "barOpacity",     85) / 100,
        borderColor:  col("pareto", "borderColor",    "#2E5BA8"),
        borderWidth:  num("pareto", "borderWidth",    0),
        barGap:       num("pareto", "barGap",         2),
        ibcsMode:     boo("pareto", "ibcsMode",       false),

        axisColor:    col("axes", "axisColor",        "#444444"),
        gridColor:    col("axes", "gridColor",        "#e0e0e0"),
        axisFontSize: num("axes", "fontSize",         11),
        showXLabel:   boo("axes", "showXLabel",       true),
        showYLabel:   boo("axes", "showYLabel",       true),

        lineColor:    col("cumulativeLine", "lineColor",   "#ED7D31"),
        lineWidth:    num("cumulativeLine", "lineWidth",   2),
        showDots:     boo("cumulativeLine", "showDots",    true),
        dotRadius:    num("cumulativeLine", "dotRadius",   4),

        showRef1:     boo("referenceLines", "showRef1",    true),
        ref1Value:    num("referenceLines", "ref1Value",   80),
        ref1Color:    col("referenceLines", "ref1Color",   "#E84444"),
        ref1Label:    txt("referenceLines", "ref1Label",   "80%"),
        showRef2:     boo("referenceLines", "showRef2",    false),
        ref2Value:    num("referenceLines", "ref2Value",   60),
        ref2Color:    col("referenceLines", "ref2Color",   "#9B59B6"),
        ref2Label:    txt("referenceLines", "ref2Label",   "60%"),
        showRef3:     boo("referenceLines", "showRef3",    false),
        ref3Value:    num("referenceLines", "ref3Value",   50),
        ref3Color:    col("referenceLines", "ref3Color",   "#27AE60"),
        ref3Label:    txt("referenceLines", "ref3Label",   "50%"),

        showLabels:    boo("valueLabels", "show",          true),
        labelFontSize: num("valueLabels", "fontSize",      10),
        labelColor:    col("valueLabels", "color",         "#444444"),
        showPercent:   boo("valueLabels", "showPercent",   true),
    };
}

interface TooltipSummaryItem {
    displayName: string;
    value: string;
}

interface BinDatum {
    label:          string;
    pctShare:       number;
    cumPct:         number;
    indices:        number[];      // raw row indices — selIds created on demand
    nEntities:      number;
    highlighted:    boolean;
    customTooltips: TooltipSummaryItem[];
}

// ─── Visual ───────────────────────────────────────────────────────────────────
export class Visual implements IVisual {
    private host:             IVisualHost;
    private events:           IVisualEventService;
    private selectionManager: ISelectionManager;

    private container: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private svg:       d3.Selection<SVGSVGElement,  unknown, null, undefined>;

    private settings:      Settings;
    private bins:          BinDatum[] = [];
    private selectedBins:  Set<string> = new Set();

    private isPro:           boolean = false; // ISPRO_MARKER
    private isProChecked:    boolean = false;
    private readonly DEV_MODE        = false;
    private renderGeneration: number = 0;   // guards stale async renders
    // Power BI Desktop runs inside Electron; fetchMoreData only works in Service
    private readonly isDesktop: boolean = navigator.userAgent.indexOf('Electron') !== -1;

    // ── Formatting Model API ──────────────────────────────────────────────────
    private formattingSettingsService: FormattingSettingsService;
    private lastDataView: DataView | undefined;
    private lastCatCol:  DataViewCategoryColumn | undefined;

    // ─────────────────────────────────────────────────────────────────────────

    constructor(options: VisualConstructorOptions) {
        this.host             = options.host;
        this.events           = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.settings         = readSettings(undefined);

        this.formattingSettingsService = new FormattingSettingsService();

        this.container = d3.select(options.element)
            .append("div").classed("pareto-visual", true)
            .style("width", "100%").style("height", "100%")
            .style("overflow", "hidden").style("position", "relative");

        this.svg = this.container.append("svg")
            .style("width", "100%").style("height", "100%");

        this.svg.on("click", () => {
            this.selectedBins.clear();
            this.selectionManager.clear().then(() => this.applyOpacity([]));
        });

        options.element.addEventListener("contextmenu", (event: MouseEvent) => {
            const target = event.target as Element;
            const datum  = d3.select<Element, BinDatum>(target).datum();
            const selId  = datum?.indices?.length && this.lastCatCol
                ? (this.getSelIds(datum.indices, 1)[0] ?? null)
                : null;
            this.selectionManager.showContextMenu(selId, {
                x: event.clientX,
                y: event.clientY,
            });
            event.preventDefault();
        });
    }

    // ── Update ────────────────────────────────────────────────────────────────
    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dv = options.dataViews?.[0];
            this.lastDataView = dv;
            this.settings = readSettings(dv);

            if (!dv?.categorical?.categories?.[0]?.values?.length) {
                this.container.selectAll(".loading-indicator").remove();
                this.renderLandingPage();
                this.events.renderingFinished(options);
                return;
            }

            // Fetch more data segments if available (trigger only when chunk capacity of 30,000 is reached)
            const loadedCount = dv.categorical.categories[0].values.length;
            if (dv.metadata?.segment && loadedCount >= 30000) {
                this.renderLoadingIndicator(loadedCount);
                if (this.host.fetchMoreData(true)) {
                    // aggregateSegments=true: Power BI combines chunks and calls update() again.
                    this.events.renderingFinished(options);
                    return;
                }
            }

            this.container.selectAll(".loading-indicator").remove();
            this.svg.selectAll("*").remove();
            this.container.selectAll(".landing-page").remove();
            this.selectedBins.clear();

            const gen = ++this.renderGeneration;
            this.checkLicense().then(() => {
                if (gen !== this.renderGeneration) return; // stale update, skip
                this.buildBins(dv);
                this.renderChart(options.viewport, false);
                this.events.renderingFinished(options);
            });
        } catch (e) {
            this.events.renderingFailed(options, String(e));
            console.error("[ParetoChartPro]", e);
        }
    }

    // ── License ───────────────────────────────────────────────────────────────
    private async checkLicense(): Promise<void> {
        if (this.DEV_MODE || this.isPro) { this.isPro = true; return; }
        if (this.isProChecked) return;
        try {
            const lm = this.host.licenseManager;
            if (!lm) { this.isPro = false; this.isProChecked = true; return; }
            const r = await lm.getAvailableServicePlans();
            this.isPro = r?.plans?.some(
                p => p.spIdentifier === PLAN_ID && p.state === ServicePlanState.Active
            ) ?? false;
            this.isProChecked = true;
        } catch {
            this.isPro = false;
            this.isProChecked = true;
        }
    }

    // ── Build bins ────────────────────────────────────────────────────────────
    private buildBins(dv: DataView): void {
        const s       = this.settings;
        const catCol  = dv.categorical.categories[0] as DataViewCategoryColumn;
        const valCol  = (dv.categorical.values || []).find(v => v.source?.roles?.["measure"])
                     ?? dv.categorical.values[0];
        const rawVals = valCol.values  as number[];
        const hlVals  = valCol.highlights as number[];
        const hasHL   = hlVals != null;

        this.lastCatCol = catCol;
        let rows: { value: number; index: number; hlValue: number | null }[] =
            rawVals.map((v, i) => ({
                value:   Math.max(0, Number(v) || 0),
                hlValue: hasHL ? (hlVals[i] != null ? Number(hlVals[i]) : null) : null,
                index:   i,
            }));

        rows.sort((a, b) => b.value - a.value);

        const n = rows.length;
        if (n === 0) { this.bins = []; return; }

        let trimmedRows = rows;
        if (this.isPro) {
            const skipTop    = Math.max(0, Math.floor(n * Math.min(s.trimUpper, 99) / 100));
            const skipBottom = Math.max(0, Math.floor(n * Math.min(s.trimLower, 99) / 100));
            trimmedRows = rows.slice(skipTop, n - skipBottom || n);
        }
        const tn = trimmedRows.length;
        if (tn === 0) { this.bins = []; return; }

        const binSizePct = this.isPro
            ? Math.min(20, Math.max(1, s.binSizePct))
            : FREE_BIN_SIZE_PCT;
        const requestedNBins = Math.ceil(100 / binSizePct);
        const nBins = Math.min(requestedNBins, tn);

        const baseEntities = Math.floor(tn / nBins);
        const remainder    = tn % nBins;
        const binStartIndices = new Array<number>(nBins);
        let curr = 0;
        for (let k = 0; k < nBins; k++) {
            binStartIndices[k] = curr;
            curr += baseEntities + (k < remainder ? 1 : 0);
        }

        const rawBins: typeof trimmedRows[] = Array.from({ length: nBins }, () => []);
        for (let k = 0; k < nBins; k++) {
            const start = binStartIndices[k];
            const end   = k < nBins - 1 ? binStartIndices[k + 1] : tn;
            rawBins[k]  = trimmedRows.slice(start, end);
        }

        const total = trimmedRows.reduce((s, r) => s + r.value, 0);
        if (total === 0) { this.bins = []; return; }

        const tooltipCols = (dv.categorical.values || []).filter(
            vCol => vCol.source?.roles?.["tooltips"]
        );

        let cumPct = 0;
        const stepPct = 100 / nBins;
        this.bins = rawBins
            .filter(b => b.length > 0)
            .map((b, idx) => {
                const binStart = idx * stepPct;
                const binEnd   = Math.min((idx + 1) * stepPct, 100);
                const binValue = b.reduce((s, r) => s + r.value, 0);
                const pctShare = (binValue / total) * 100;
                cumPct += pctShare;

                const highlighted = hasHL ? b.some(r => r.hlValue != null && r.hlValue > 0) : false;

                const customTooltips: TooltipSummaryItem[] = tooltipCols.map(col => {
                    const sum = b.reduce((acc, r) => acc + (Number(col.values[r.index]) || 0), 0);
                    const formatted = typeof sum === "number" && !isNaN(sum)
                        ? (Number.isInteger(sum) ? sum.toLocaleString() : sum.toLocaleString(undefined, { maximumFractionDigits: 2 }))
                        : String(sum);
                    return {
                        displayName: col.source.displayName,
                        value: formatted,
                    };
                });

                return {
                    label:          `${Math.round(binStart)}–${Math.round(binEnd)}%`,
                    pctShare,
                    cumPct,
                    indices:        b.map(r => r.index),
                    nEntities:      b.length,
                    highlighted,
                    customTooltips,
                };
            });
    }

    // ── Resolve color (high contrast aware) ───────────────────────────────────
    private resolveColor(userColor: string, hcColor: string, isHighContrast: boolean): string {
        return isHighContrast ? hcColor : userColor;
    }

    // ── Render chart ──────────────────────────────────────────────────────────
    private renderChart(viewport: powerbi.IViewport, isTruncated = false): void {
        const s  = this.settings;
        const W  = viewport.width  - MARGIN.left - MARGIN.right;
        const H  = viewport.height - MARGIN.top  - MARGIN.bottom;
        if (W <= 0 || H <= 0 || !this.bins.length) return;

        // ── High contrast support ──────────────────────────────────────────────
        const palette     = this.host.colorPalette as any;
        const isHC        = palette.isHighContrast === true;
        const hcFg        = isHC ? (palette.foreground?.value        ?? "#FFFFFF") : "";
        const hcBg        = isHC ? (palette.background?.value        ?? "#000000") : "";
        const hcFgNeutral = isHC ? (palette.foregroundNeutralSecondary?.value ?? "#808080") : "";

        let barColor  = this.resolveColor(s.barColor,  hcFg,        isHC);
        let lineColor = this.resolveColor(s.lineColor, hcFg,        isHC);
        let axisColor = this.resolveColor(s.axisColor, hcFg,        isHC);
        let gridColor = this.resolveColor(s.gridColor, hcFgNeutral, isHC);
        let dotColor  = lineColor;

        if (s.ibcsMode && !isHC) {
            barColor  = "#404040"; // IBCS Neutral Charcoal
            lineColor = "#262626"; // IBCS Solid Dark Line
            dotColor  = "#262626";
            axisColor = "#000000"; // IBCS Black Axis Typography & Lines
            gridColor = "#E5E5E5";
        }

        // ──────────────────────────────────────────────────────────────────────

        const hasHL    = this.bins.some(b => b.highlighted);
        const padding  = Math.max(0.05, Math.min(0.4, s.barGap / 100));

        this.svg.attr("width", viewport.width).attr("height", viewport.height);
        const g = this.svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(this.bins.map(b => b.label))
            .range([0, W])
            .padding(padding);

        const maxShare = d3.max(this.bins, b => b.pctShare) ?? 100;
        const yL = d3.scaleLinear()
            .domain([0, Math.max(maxShare * 1.18, 5)])
            .range([H, 0]).nice();
        const yR = d3.scaleLinear().domain([0, 100]).range([H, 0]);

        // Grid lines
        g.selectAll(".grid-line")
            .data(yL.ticks(6))
            .enter().append("line")
            .classed("grid-line", true)
            .attr("x1", 0).attr("x2", W)
            .attr("y1", d => yL(d)).attr("y2", d => yL(d))
            .attr("stroke", gridColor)
            .attr("stroke-width", isHC ? 1 : 0.5);

        // Axes
        const xAxis = g.append("g").classed("axis", true)
            .attr("transform", `translate(0,${H})`)
            .call(d3.axisBottom(xScale));
        xAxis.selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end")
            .style("font-size", s.axisFontSize + "px")
            .style("fill", axisColor);
        xAxis.selectAll("line, path").style("stroke", axisColor);

        const yAxisL = g.append("g").classed("axis", true)
            .call(d3.axisLeft(yL).ticks(6).tickFormat(d => `${d}%`));
        yAxisL.selectAll("text").style("fill", axisColor).style("font-size", s.axisFontSize + "px");
        yAxisL.selectAll("line, path").style("stroke", axisColor);

        const yAxisR = g.append("g").classed("axis", true)
            .attr("transform", `translate(${W},0)`)
            .call(d3.axisRight(yR).ticks(5).tickFormat(d => `${d}%`));
        yAxisR.selectAll("text").style("fill", axisColor).style("font-size", s.axisFontSize + "px");
        yAxisR.selectAll("line, path").style("stroke", axisColor);

        // Axis labels
        if (s.showYLabel) {
            g.append("text")
                .attr("transform", `rotate(-90)`)
                .attr("x", -H / 2).attr("y", -50)
                .attr("text-anchor", "middle")
                .style("font-size", s.axisFontSize + "px").style("fill", axisColor)
                .text("% of total value");
        }
        if (s.showXLabel) {
            g.append("text")
                .attr("x", W / 2).attr("y", H + 58)
                .attr("text-anchor", "middle")
                .style("font-size", s.axisFontSize + "px").style("fill", axisColor)
                .text("% of entities (best → worst)");
        }

        // Bars
        const bw = s.borderWidth > 0 ? s.borderWidth : 0;
        const borderStroke = this.resolveColor(s.borderColor, hcFg, isHC);

        g.selectAll(".bar")
            .data(this.bins)
            .enter().append("rect")
            .classed("bar", true)
            .attr("x",      b => xScale(b.label))
            .attr("y",      b => yL(b.pctShare))
            .attr("width",  xScale.bandwidth())
            .attr("height", b => Math.max(0, H - yL(b.pctShare)))
            .attr("fill",   barColor)
            .attr("opacity", b => hasHL ? (b.highlighted ? s.barOpacity : s.barOpacity * 0.25) : s.barOpacity)
            .attr("stroke",       (bw > 0 || isHC) ? borderStroke : "none")
            .attr("stroke-width", isHC ? 2 : bw)
            .style("cursor", "pointer")
            .on("click", (event: MouseEvent, b: BinDatum) => {
                event.stopPropagation();
                if (event.ctrlKey) {
                    if (this.selectedBins.has(b.label)) {
                        this.selectedBins.delete(b.label);
                    } else {
                        this.selectedBins.add(b.label);
                    }
                } else {
                    if (this.selectedBins.size === 1 && this.selectedBins.has(b.label)) {
                        this.selectedBins.clear();
                    } else {
                        this.selectedBins.clear();
                        this.selectedBins.add(b.label);
                    }
                }

                if (this.selectedBins.size === 0) {
                    this.selectionManager.clear().then(() => this.applyOpacity([]));
                } else {
                    const allIds = this.bins
                        .filter(bin => this.selectedBins.has(bin.label))
                        .reduce((acc, bin) => acc.concat(this.getSelIds(bin.indices)), [] as ISelectionId[]);
                    this.selectionManager.select(allIds, false)
                        .then((ids: ISelectionId[]) => this.applyOpacity(ids));
                }
            })
            .on("mouseover", (event: MouseEvent, b: BinDatum) => {
                this.host.tooltipService?.show({
                    dataItems: [
                        { displayName: "Entities",          value: b.label },
                        { displayName: "Count",             value: String(b.nEntities) },
                        { displayName: "% of total value",  value: `${b.pctShare.toFixed(2)}%` },
                        { displayName: "Cumulative",        value: `${b.cumPct.toFixed(2)}%` },
                        ...(b.customTooltips || [])
                    ],
                    identities: b.indices.length && this.lastCatCol ? this.getSelIds(b.indices, 1) : [],
                    coordinates: [event.clientX, event.clientY],
                    isTouchEvent: false,
                });
            })
            .on("mousemove", (event: MouseEvent, b: BinDatum) => {
                this.host.tooltipService?.move({
                    dataItems: [
                        { displayName: "Entities",         value: b.label },
                        { displayName: "% of total value", value: `${b.pctShare.toFixed(2)}%` },
                        { displayName: "Cumulative",       value: `${b.cumPct.toFixed(2)}%` },
                        ...(b.customTooltips || [])
                    ],
                    identities: b.indices.length && this.lastCatCol ? this.getSelIds(b.indices, 1) : [],
                    coordinates: [event.clientX, event.clientY],
                    isTouchEvent: false,
                });
            })
            .on("mouseout", () =>
                this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false })
            );

        // Value labels (Pro)
        if (s.showLabels && this.isPro) {
            const labelColor = this.resolveColor(s.labelColor, hcFg, isHC);
            g.selectAll(".bar-label")
                .data(this.bins)
                .enter().append("text")
                .classed("bar-label", true)
                .attr("x", b => xScale(b.label) + xScale.bandwidth() / 2)
                .attr("y", b => yL(b.pctShare) - 4)
                .attr("text-anchor", "middle")
                .style("font-size", Math.max(7, Math.min(s.labelFontSize, xScale.bandwidth() * 0.4)) + "px")
                .style("fill", labelColor)
                .text(b => s.showPercent ? `${b.pctShare.toFixed(1)}%` : b.pctShare.toFixed(1));
        }

        // Cumulative line
        const lineGen = d3.line<BinDatum>()
            .x(b => xScale(b.label) + xScale.bandwidth() / 2)
            .y(b => yR(b.cumPct))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(this.bins)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", isHC ? Math.max(s.lineWidth, 2) : s.lineWidth)
            .attr("d", lineGen);

        if (s.showDots) {
            g.selectAll(".cum-dot")
                .data(this.bins)
                .enter().append("circle")
                .attr("cx", b => xScale(b.label) + xScale.bandwidth() / 2)
                .attr("cy", b => yR(b.cumPct))
                .attr("r", isHC ? Math.max(s.dotRadius, 5) : s.dotRadius)
                .attr("fill", dotColor)
                .attr("stroke", isHC ? hcBg : "#fff")
                .attr("stroke-width", 1.5)
                .style("cursor", "crosshair")
                .on("mouseover", (event: MouseEvent, b: BinDatum) => {
                    this.host.tooltipService?.show({
                        dataItems: [
                            { displayName: "Entities",   value: b.label },
                            { displayName: "Cumulative", value: `${b.cumPct.toFixed(2)}%` },
                            { displayName: "Bin share",  value: `${b.pctShare.toFixed(2)}%` },
                            ...(b.customTooltips || [])
                        ],
                        identities: b.indices.length && this.lastCatCol ? this.getSelIds(b.indices, 1) : [],
                        coordinates: [event.clientX, event.clientY],
                        isTouchEvent: false,
                    });
                })
                .on("mousemove", (event: MouseEvent, b: BinDatum) => {
                    this.host.tooltipService?.move({
                        dataItems: [
                            { displayName: "Entities",   value: b.label },
                            { displayName: "Cumulative", value: `${b.cumPct.toFixed(2)}%` },
                            { displayName: "Bin share",  value: `${b.pctShare.toFixed(2)}%` },
                            ...(b.customTooltips || [])
                        ],
                        identities: b.indices.length && this.lastCatCol ? this.getSelIds(b.indices, 1) : [],
                        coordinates: [event.clientX, event.clientY],
                        isTouchEvent: false,
                    });
                })
                .on("mouseout", () =>
                    this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false })
                );
        }

        // Reference lines
        const refLines = [
            { show: s.showRef1, value: s.ref1Value, color: s.ref1Color, label: s.ref1Label },
            { show: s.showRef2, value: s.ref2Value, color: s.ref2Color, label: s.ref2Label },
            { show: s.showRef3 && this.isPro, value: s.ref3Value, color: s.ref3Color, label: s.ref3Label },
        ];

        refLines.forEach(ref => {
            if (!ref.show || ref.value <= 0 || ref.value >= 100) return;

            const refColor = this.resolveColor(ref.color, hcFg, isHC);
            const yH = yR(ref.value);

            this.drawDashedLine(g, 0, W, yH, yH, refColor, 1.5);

            g.append("text")
                .attr("x", -4).attr("y", yH + 4)
                .attr("text-anchor", "end")
                .style("font-size", "10px").style("fill", refColor)
                .text(ref.label || `${ref.value}%`);

            const crossBin = this.bins.find(b => b.cumPct >= ref.value);
            if (crossBin) {
                const xV = xScale(crossBin.label) + xScale.bandwidth() / 2;
                this.drawDashedLine(g, xV, xV, 0, H, refColor, 1.5, true);

                g.append("text")
                    .attr("x", xV).attr("y", -4)
                    .attr("text-anchor", "middle")
                    .style("font-size", "10px").style("fill", refColor)
                    .text(crossBin.label);
            }
        });

        // Free tier badge
        if (!this.isPro) {
            g.append("text")
                .attr("x", W).attr("y", -10)
                .attr("text-anchor", "end")
                .style("font-size", "10px").style("fill", isHC ? hcFgNeutral : "#aaa")
                .text(`Free: ${FREE_BIN_SIZE_PCT}% bins — upgrade to Pro for custom bin size, outlier filter & labels`);
        }

        // Truncation notice (Desktop only, when ≥30k rows)
        if (isTruncated) {
            g.append("text")
                .attr("x", 0).attr("y", -10)
                .attr("text-anchor", "start")
                .style("font-size", "10px").style("fill", isHC ? hcFgNeutral : "#E8A020")
                .text("⚠ Data limited to 30,000 rows. Use Power BI Service for full dataset.");
        }
    }

    // ── Draw dashed line ──────────────────────────────────────────────────────
    private drawDashedLine(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        x1: number, x2: number, y1: number, y2: number,
        color: string, width: number, vertical = false
    ): void {
        const dash = 7;
        const len  = vertical ? Math.abs(y2 - y1) : Math.abs(x2 - x1);
        for (let i = 0; i <= len; i += dash * 2) {
            const end = Math.min(i + dash, len);
            g.append("line")
                .attr("x1", vertical ? x1       : x1 + i)
                .attr("x2", vertical ? x2       : x1 + end)
                .attr("y1", vertical ? y1 + i   : y1)
                .attr("y2", vertical ? y1 + end : y2)
                .attr("stroke", color)
                .attr("stroke-width", width);
        }
    }

    // ── Filter-in opacity ─────────────────────────────────────────────────────

    // ── On-demand selId factory (1 SelectionId per category selection action to prevent DS0 query errors) ──
    private getSelIds(indices: number[], max: number = 1): ISelectionId[] {
        if (!this.lastCatCol || !indices.length) return [];
        const cat = this.lastCatCol;
        const builder = this.host.createSelectionIdBuilder();
        const selId = builder.withCategory(cat, indices[0]).createSelectionId();
        return [selId];
    }

    private applyOpacity(_selectedIds?: ISelectionId[]): void {
        const opacity = this.settings.barOpacity;
        this.svg.selectAll<SVGRectElement, BinDatum>(".bar")
            .attr("opacity", b => {
                if (!this.selectedBins.size) return opacity;
                return this.selectedBins.has(b.label) ? opacity : opacity * 0.25;
            });
    }


    // ── Loading indicator (shown while fetchMoreData segments arrive) ──────────
    private renderLoadingIndicator(loadedCount: number): void {
        this.container.selectAll(".landing-page").remove();

        let indicator = this.container.select<HTMLDivElement>(".loading-indicator");
        if (indicator.empty()) {
            indicator = this.container
                .append("div").classed("loading-indicator", true)
                .style("position", "absolute").style("top", "0").style("left", "0")
                .style("width", "100%").style("height", "100%")
                .style("display", "flex").style("align-items", "center")
                .style("justify-content", "center");

            const wrapper = indicator.append("div").style("text-align", "center");
            wrapper.append("div").style("font-size", "28px").style("margin-bottom", "8px").text("⏳");
            wrapper.append("div")
                .classed("loading-text", true)
                .style("font-size", "13px")
                .style("color", "#888");
        }

        indicator.select<HTMLDivElement>(".loading-text")
            .text(`Loading data… ${loadedCount.toLocaleString()} rows`);
    }

    // ── Landing page ──────────────────────────────────────────────────────────
    private renderLandingPage(): void {
        this.svg.selectAll("*").remove();
        this.container.selectAll(".landing-page").remove();

        const landing = this.container
            .append("div").classed("landing-page", true)
            .style("position", "absolute").style("top", "0").style("left", "0")
            .style("width", "100%").style("height", "100%")
            .style("display", "flex").style("align-items", "center")
            .style("justify-content", "center");

        const wrapper = landing.append("div")
            .style("text-align", "center");

        wrapper.append("div")
            .style("font-size", "40px")
            .style("margin-bottom", "8px")
            .text("📊");

        wrapper.append("div")
            .style("font-size", "15px")
            .style("font-weight", "600")
            .style("color", "#555")
            .style("margin-bottom", "6px")
            .text("Pareto Chart Pro");

        const hint = wrapper.append("div")
            .style("font-size", "12px")
            .style("color", "#aaa");

        hint.append("span").text("Add an ");
        hint.append("b").text("Entity");
        hint.append("span").text(" (customer/product) and a ");
        hint.append("b").text("Value");
        hint.append("span").text(" (sales/revenue)");
    }

    // ── Format Pane (new Formatting Model API) ────────────────────────────────
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const model = this.formattingSettingsService.populateFormattingSettingsModel(
            ParetoFormattingSettings,
            this.lastDataView
        );

        // Pro-only slices visibility
        model.pareto.binSizePct.visible  = this.isPro;
        model.pareto.trimLower.visible   = this.isPro;
        model.pareto.trimUpper.visible   = this.isPro;
        model.pareto.borderColor.visible = this.isPro;
        model.pareto.borderWidth.visible = this.isPro;
        model.pareto.barGap.visible      = this.isPro;

        model.referenceLines.showRef3.visible  = this.isPro;
        model.referenceLines.ref3Value.visible = this.isPro;
        model.referenceLines.ref3Color.visible = this.isPro;
        model.referenceLines.ref3Label.visible = this.isPro;

        model.valueLabels.visible = this.isPro;

        return this.formattingSettingsService.buildFormattingModel(model);
    }

    public destroy(): void { this.container.remove(); }
}
