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
// Fallback path only (no usable filter target): selection IDs are heavy, so few.
const MAX_SEL_IDS_PER_BIN   = 100;
// A BasicFilter becomes a DAX IN() list, and the cost grows with the number of
// values. Measured on a 500,000-entity model in Power BI Service, integer keys,
// varying bin size to vary entities per bar:
//
//   values   imported model        live connection
//    5,000   instant               comfortable
//   10,000   fluid                 slow but works
//   20,000   perceptible, usable   (not measured)
//   25,000   unusable              -
//   50,000   hangs the report      -
//
// A live connection sends the query to the remote model instead of resolving it
// in local memory, so it is the slower of the two — and the one enterprise
// deployments actually use. The cap follows the live figure, not the imported
// one. Text keys are heavier per value, so their real ceiling is lower still.
//
// The old 500-value filter limit documented for Analysis Services live
// connections does NOT apply: verified filtering 10,000 values over a live
// connection to a Power BI semantic model with no error.
//
// Filtering a subset instead would be a silently wrong answer, so past this the
// visual declines and names the lever that fixes it.
const MAX_FILTER_VALUES     = 10000;
const FREE_BIN_SIZE_PCT = 20;
// Base chrome at full size. computeLayout() scales it down for small tiles.
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
    // thresholdColors group
    thShow:              boolean;
    thValue:             number;
    thWithinColor:       string;
    thBeyondColor:       string;
    thHighlightCrossing: boolean;
    thCrossingColor:     string;
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

        thShow:              boo("thresholdColors", "show",              false),
        thValue:             num("thresholdColors", "thresholdValue",    80),
        thWithinColor:       col("thresholdColors", "withinColor",       "#4472C4"),
        thBeyondColor:       col("thresholdColors", "beyondColor",       "#C6CFDF"),
        thHighlightCrossing: boo("thresholdColors", "highlightCrossing", true),
        thCrossingColor:     col("thresholdColors", "crossingColor",     "#ED7D31"),

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
    /** Color resolved by an fx conditional-formatting rule on the bin's
     *  top-ranked entity, or null when no rule is applied. */
    ruleColor:      string | null;
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
    /** False in Publish-to-Web, embedded, national clouds and PDF/PPT export. */
    private licenseEnvSupported = true;
    /** False when the license could not be read (offline, not signed in). */
    private licenseInfoAvailable = true;
    /** Last set of Pro settings we already notified about, to avoid nagging. */
    private lastBlockedNotice = "";
    private readonly DEV_MODE        = false;
    private renderGeneration: number = 0;   // guards stale async renders
    /** Roving tabindex: index of the bin that currently owns Tab focus. */
    private focusedBin: number = 0;
    private restoreFocusAfterRender = false;
    /** Entities actually loaded when Power BI stopped feeding us. */
    private truncatedAt = 0;
    /** Entities in the last selection that was too large to filter. */
    private oversizedSelection = 0;
    /** Segment streaming guards — see the fetch block in update(). */
    private lastFetchCount = 0;
    private fetchRounds    = 0;
    private readonly MAX_FETCH_ROUNDS = 60;   // 60 x 30k is past Power BI's row ceiling
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

        this.injectStyles();

        this.svg.on("click", () => {
            if (!this.canInteract) return;
            this.selectedBins.clear();
            this.clearBinFilter();
            this.selectionManager.clear().then(() => { this.applyOpacity([]); this.syncAria(); });
        });

        // Bookmarks and external "clear selections" also travel through the selection
        // manager on the fallback path. Not present in the 5.x types, hence the cast.
        const sm = this.selectionManager as any;
        if (typeof sm.registerOnSelectCallback === "function") {
            sm.registerOnSelectCallback(() => {
                if (!sm.hasSelection || !sm.hasSelection()) {
                    this.selectedBins.clear();
                    this.applyOpacity();
                    this.syncAria();
                }
            });
        }

        options.element.addEventListener("contextmenu", (event: MouseEvent) => {
            if (!this.canInteract) return;
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
            // metadata.segment means Power BI has more rows than it handed us.
            // If fetchMoreData then refuses, we are capped and drawing a Pareto of
            // a partial universe — which looks completely normal, because a Pareto
            // always spans 0-100%. That has to be visible.
            //
            // Power BI's own ceilings: 1,048,576 rows total, and 100 MB of dataView
            // in segments aggregation mode, at which point fetchMoreData() returns
            // false. Desktop cannot stream segments at all and stops at 30,000.
            // operationKind 1 = Append (a segment continuation). Anything else is a
            // fresh query, so the streaming guards start over.
            if ((options as any).operationKind !== 1) {
                this.lastFetchCount = 0;
                this.fetchRounds    = 0;
            }

            let truncated = false;
            if (dv.metadata?.segment) {
                // Three independent brakes. Asking for more data and returning without
                // rendering is only safe while more data is actually arriving; when it
                // is not, this loops forever and takes the host down with it.
                //   - Desktop runs in Electron and cannot stream segments at all.
                //   - No growth since the previous round means we are being handed the
                //     same data again. This is the brake that matters, because it does
                //     not depend on sniffing the user agent.
                //   - A round ceiling, as a last resort.
                const grew      = loadedCount > this.lastFetchCount;
                const canStream = !this.isDesktop && grew && this.fetchRounds < this.MAX_FETCH_ROUNDS;

                if (canStream && loadedCount >= 30000) {
                    this.lastFetchCount = loadedCount;
                    this.fetchRounds++;
                    this.renderLoadingIndicator(loadedCount);
                    if (this.host.fetchMoreData(true)) {
                        // aggregateSegments=true: Power BI combines chunks and calls update() again.
                        this.events.renderingFinished(options);
                        return;
                    }
                }
                truncated = true;
                this.truncatedAt = loadedCount;
            }

            const activeEl = (this.container.node() as HTMLElement)?.ownerDocument?.activeElement;
            this.restoreFocusAfterRender = !!activeEl
                && (this.container.node() as HTMLElement).contains(activeEl);

            this.container.selectAll(".loading-indicator").remove();
            this.svg.selectAll("*").remove();
            this.container.selectAll(".landing-page").remove();

            // Applying a filter persists it into this visual's own general.filter
            // property, which makes Power BI call update() again. Clearing the
            // selection here — as this did — wiped the bar's selected state on the
            // very render that the click caused, so the first click filtered but
            // left nothing marked and a second click was needed to see it.
            //
            // Keep the selection instead, and only drop it when the filter is
            // genuinely gone (cleared elsewhere, or a bookmark switched it off).
            const filterActive =
                (options.jsonFilters?.length ?? 0) > 0 ||
                !!(dv.metadata?.objects?.["general"]?.["filter"]);

            const gen = ++this.renderGeneration;
            this.checkLicense().then(() => {
                if (gen !== this.renderGeneration) return; // stale update, skip

                // After the licence is known, and only if the user actually
                // reached for a Pro setting.
                this.notifyProFeatureBlocked();

                this.buildBins(dv);

                // Derive the selection from the filter Power BI actually holds, so a
                // bookmark switch lands on the right bars. If the filter is unreadable,
                // keep what we have rather than guessing.
                if (!this.restoreSelectionFromFilter(options, filterActive)) {
                    if (!filterActive && !this.selectionManager.hasSelection()) {
                        this.selectedBins.clear();
                    }
                }

                // Drop labels that no longer exist (bin count can change).
                const labels = new Set(this.bins.map(b => b.label));
                Array.from(this.selectedBins).forEach(l => {
                    if (!labels.has(l)) this.selectedBins.delete(l);
                });

                this.renderChart(options.viewport, truncated);
                // renderChart sets opacity from highlight state only; re-apply the
                // selection dimming on top of the fresh nodes.
                this.applyOpacity();
                this.syncAria();
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

            // Microsoft: "Only the active and warning states represent a usable
            // license." Warning means grace period — the customer has paid and
            // must keep their features while the payment issue is resolved.
            this.isPro = r?.plans?.some(
                p => p.spIdentifier === PLAN_ID &&
                     (p.state === ServicePlanState.Active ||
                      p.state === ServicePlanState.Warning)
            ) ?? false;

            // In these cases a paying customer legitimately reads as Free, so we
            // must not tell them to buy something they already own.
            this.licenseEnvSupported  = !(r as any)?.isLicenseUnsupportedEnv;
            this.licenseInfoAvailable = (r as any)?.isLicenseInfoAvailable !== false;

            this.isProChecked = true;
        } catch {
            this.isPro = false;
            this.licenseInfoAvailable = false;
            this.isProChecked = true;
        }
    }

    /**
     * Which Pro settings the user has explicitly changed.
     *
     * Reads `metadata.objects`, which only carries properties the user actually
     * set — unlike the settings model, where every Pro property has a default
     * and `valueLabels.show` even defaults to true. Presence here is a
     * deliberate action, and therefore a genuine moment of purchase intent.
     */
    private attemptedProFeatures(): { labels: string[]; signature: string } {
        const objs = this.lastDataView?.metadata?.objects as any;
        if (!objs) return { labels: [], signature: "" };

        const groups: [string, string, string[]][] = [
            ["custom bin size",         "pareto",         ["binSizePct"]],
            ["outlier filtering",       "pareto",         ["trimLower", "trimUpper"]],
            ["bar styling",             "pareto",         ["borderColor", "borderWidth", "barGap"]],
            ["a third reference line",  "referenceLines", ["showRef3", "ref3Value", "ref3Color", "ref3Label"]],
            ["value labels",            "valueLabels",    ["show", "fontSize", "color", "showPercent"]],
        ];

        const labels: string[] = [];
        const parts:  string[] = [];
        for (const [label, card, props] of groups) {
            let touched = false;
            for (const p of props) {
                const v = objs?.[card]?.[p];
                if (v === undefined) continue;
                touched = true;
                // The value, not just the property name: changing bin size from 10
                // to 15 is a fresh attempt at the same feature and deserves the
                // banner again. A resize or a data refresh changes neither.
                parts.push(`${card}.${p}=${JSON.stringify(v)}`);
            }
            if (touched) labels.push(label);
        }
        return { labels, signature: parts.join("|") };
    }

    /**
     * Ask Power BI to show its own "feature blocked" banner, which carries the
     * purchase path. Microsoft is explicit that a visual "shouldn't display its
     * own licensing UX", and a banner the user can act on converts; a grey
     * caption in a corner does not.
     */
    private notifyProFeatureBlocked(): void {
        if (this.isPro || this.DEV_MODE) { this.lastBlockedNotice = ""; return; }

        const { labels: wanted, signature } = this.attemptedProFeatures();
        if (wanted.length === 0) { this.lastBlockedNotice = ""; return; }

        // Licence unreadable, or an environment without licence enforcement:
        // a Pro customer would land here too, so never ask them to buy.
        if (!this.licenseEnvSupported || !this.licenseInfoAvailable) return;

        // Fires on every fresh change to a Pro setting, and only then: update()
        // also runs on resize, selection and data refresh, and the banner has no
        // business reappearing for those.
        if (signature === this.lastBlockedNotice) return;
        this.lastBlockedNotice = signature;

        const list = wanted.length === 1
            ? wanted[0]
            : wanted.slice(0, -1).join(", ") + " and " + wanted[wanted.length - 1];

        try {
            (this.host.licenseManager as any)?.notifyFeatureBlocked?.(
                `Pareto Chart Pro: ${list} ${wanted.length === 1 ? "is" : "are"} part of the Pro plan. ` +
                `Get a licence to enable ${wanted.length === 1 ? "it" : "them"}.`
            );
        } catch { /* notification is best-effort; never break the render */ }
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

        // Conditional formatting: Power BI resolves the fx rule per category and
        // hands the result back on categories[0].objects[i]. Read it defensively —
        // with no rule applied the whole chain is undefined.
        const catObjects = (catCol as any)?.objects as powerbi.DataViewObjects[] | undefined;
        const ruleColorAt = (rowIndex: number): string | null => {
            const c = (catObjects?.[rowIndex]?.["pareto"]?.["barColor"] as powerbi.Fill)?.solid?.color;
            return typeof c === "string" && c.length > 0 ? c : null;
        };

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

                // Rows are sorted descending, so b[0] is the bin's top-ranked
                // entity. Its rule color represents the bin; fall back to the
                // first entity in the bin that resolves to one.
                let ruleColor: string | null = null;
                for (const r of b) {
                    ruleColor = ruleColorAt(r.index);
                    if (ruleColor) break;
                }

                return {
                    label:          `${Math.round(binStart)}–${Math.round(binEnd)}%`,
                    pctShare,
                    cumPct,
                    indices:        b.map(r => r.index),
                    nEntities:      b.length,
                    highlighted,
                    customTooltips,
                    ruleColor,
                };
            });
    }

    /** Toggle a bin's selection. Shared by pointer and keyboard so both behave
     *  identically. `additive` mirrors Ctrl/Cmd-click. */
    private toggleBinSelection(b: BinDatum, additive: boolean): void {
        if (!this.canInteract) return;

        if (additive) {
            if (this.selectedBins.has(b.label)) this.selectedBins.delete(b.label);
            else                                this.selectedBins.add(b.label);
        } else if (this.selectedBins.size === 1 && this.selectedBins.has(b.label)) {
            this.selectedBins.clear();
        } else {
            this.selectedBins.clear();
            this.selectedBins.add(b.label);
        }

        if (this.selectedBins.size === 0) {
            this.clearBinFilter();
            this.selectionManager.clear().then(() => { this.applyOpacity([]); this.syncAria(); });
            return;
        }

        const chosen = this.bins.filter(bin => this.selectedBins.has(bin.label));

        // Refuse rather than filter partially.
        const entityCount = chosen.reduce((acc, b) => acc + b.nEntities, 0);
        if (entityCount > MAX_FILTER_VALUES) {
            this.selectedBins.clear();
            this.oversizedSelection = entityCount;
            this.applyOpacity();
            this.syncAria();
            this.renderOversizedNotice();
            return;
        }
        this.oversizedSelection = 0;

        // Preferred path: an exact filter over every entity in the bins, no cap.
        const filter = this.buildBinFilter(chosen);
        if (filter) {
            this.host.applyJsonFilter(filter, "general", "filter", this.FILTER_MERGE);
            this.applyOpacity([]);
            this.syncAria();
            return;
        }

        // Fallback: no usable filter target (drilldown level, unusual model
        // shape). Selection IDs still work, capped at MAX_SEL_IDS_PER_BIN.
        const allIds = chosen.reduce(
            (acc, bin) => acc.concat(this.getSelIds(bin.indices)), [] as ISelectionId[]);
        this.selectionManager.select(allIds, false)
            .then((ids: ISelectionId[]) => { this.applyOpacity(ids); this.syncAria(); });
    }

    /**
     * Rebuild the bin selection from whatever filter Power BI currently has.
     *
     * The visual's selection lives in memory, but a bookmark restores a *filter*.
     * Coming back to a bookmark that had bin 1 selected, the filter returns and the
     * report filters correctly while selectedBins is still empty from wherever the
     * user had been — so no bar is marked. Reading the selection back out of the
     * filter is what keeps the chart honest about what is filtered.
     *
     * Returns false when the filter exists but its values cannot be read, so the
     * caller can leave the current selection alone rather than wrongly clearing it.
     */
    private restoreSelectionFromFilter(options: VisualUpdateOptions, filterActive: boolean): boolean {
        const filters = (options as any).jsonFilters as any[] | undefined;
        if (!filters || !filters.length) {
            // No readable filter. Only clear when nothing says one is applied —
            // otherwise this would wipe the selection on the very update our own
            // click caused, which is the double-click bug all over again.
            if (filterActive) return false;
            this.selectedBins.clear();
            return true;
        }

        const values = new Set<string>();
        for (const f of filters) {
            const vs = (f as any)?.values;
            if (Array.isArray(vs)) for (const v of vs) values.add(String(v));
        }
        if (!values.size) return false;   // a filter we cannot read — do not clear

        const cat = this.lastCatCol;
        if (!cat) return false;

        this.selectedBins.clear();
        for (const b of this.bins) {
            // A bin cannot be fully contained in a smaller value set.
            if (!b.indices.length || b.nEntities > values.size) continue;
            let all = true;
            for (const i of b.indices) {
                if (!values.has(String(cat.values[i]))) { all = false; break; }
            }
            if (all) this.selectedBins.add(b.label);
        }
        return true;
    }

    /** Keep aria-selected in step with the visual selection state. */
    private syncAria(): void {
        this.svg.selectAll<SVGRectElement, BinDatum>(".bar")
            .attr("aria-selected", b => (this.selectedBins.has(b.label) ? "true" : "false"));
    }

    /** style/visual.less is not emitted into the .pbiviz by pbiviz, so any CSS the
     *  visual actually needs has to be injected at runtime. */
    private injectStyles(): void {
        const ID  = "pareto-chart-pro-styles";
        const doc = (this.container.node() as HTMLElement).ownerDocument ?? document;
        if (doc.getElementById(ID)) return;
        const st = doc.createElement("style");
        st.id = ID;
        st.textContent = [
            ".pareto-visual .bar:focus{outline:none}",
            ".pareto-visual .bar:focus-visible{outline:none;stroke:#000;stroke-width:3px;",
            "paint-order:stroke;filter:drop-shadow(0 0 0 2px #fff)}",
            "@media (forced-colors: active){",
            ".pareto-visual .bar:focus-visible{stroke:Highlight;stroke-width:3px}}",
        ].join("");
        (doc.head ?? (this.container.node() as HTMLElement)).appendChild(st);
    }

    /** Power BI can disable all interaction (e.g. in some embed scenarios).
     *  Not present in the powerbi-visuals-api 5.x types, hence the cast. */
    private get canInteract(): boolean {
        return (this.host as any).allowInteractions !== false;
    }

    // ── Resolve color (high contrast aware) ───────────────────────────────────
    private resolveColor(userColor: string, hcColor: string, isHighContrast: boolean): string {
        return isHighContrast ? hcColor : userColor;
    }

    // ── Render chart ──────────────────────────────────────────────────────────
    private renderChart(viewport: powerbi.IViewport, isTruncated = false): void {
        const s  = this.settings;
        // ── Adaptive layout ────────────────────────────────────────────────────
        // A fixed margin spends most of a small dashboard tile on chrome. Scale the
        // chrome with the viewport and drop whatever no longer earns its space.
        const VW = viewport.width, VH = viewport.height;
        const compact = VW < 360 || VH < 240;
        const tiny    = VW < 240 || VH < 170;

        const fs = tiny    ? Math.max(8, s.axisFontSize - 3)
                 : compact ? Math.max(9, s.axisFontSize - 2)
                 : s.axisFontSize;

        const showXLabel    = s.showXLabel && !compact;
        const showYLabel    = s.showYLabel && !compact;
        const showRightAxis = !tiny;

        const M = {
            top:    tiny ? 10 : compact ? 16 : MARGIN.top,
            right:  tiny ?  8 : compact ? 34 : MARGIN.right,
            bottom: (tiny ? 26 : compact ? 40 : 52) + (showXLabel ? 16 : 0),
            left:   (tiny ? 28 : compact ? 38 : 48) + (showYLabel ? 16 : 0),
        };

        const W  = VW - M.left - M.right;
        const H  = VH - M.top  - M.bottom;
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
            .attr("transform", `translate(${M.left},${M.top})`);

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
        // Thin the tick labels when the bands get too narrow to read them.
        const bandPx   = xScale.step();   // band + gap: the space one label owns
        const everyNth = Math.max(1, Math.ceil((fs * 2.6) / Math.max(1, bandPx)));
        xAxis.selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end")
            .style("font-size", fs + "px")
            .style("fill", axisColor)
            .style("display", (_d, i) => (i % everyNth === 0 ? null : "none"));
        xAxis.selectAll("line, path").style("stroke", axisColor);

        const yAxisL = g.append("g").classed("axis", true)
            .call(d3.axisLeft(yL).ticks(6).tickFormat(d => `${d}%`));
        yAxisL.selectAll("text").style("fill", axisColor).style("font-size", fs + "px");
        yAxisL.selectAll("line, path").style("stroke", axisColor);

        if (showRightAxis) {
            const yAxisR = g.append("g").classed("axis", true)
                .attr("transform", `translate(${W},0)`)
                .call(d3.axisRight(yR).ticks(compact ? 3 : 5).tickFormat(d => `${d}%`));
            yAxisR.selectAll("text").style("fill", axisColor).style("font-size", fs + "px");
            yAxisR.selectAll("line, path").style("stroke", axisColor);
        }

        // Axis labels
        if (showYLabel) {
            g.append("text")
                .attr("transform", `rotate(-90)`)
                .attr("x", -H / 2).attr("y", -(M.left - 14))
                .attr("text-anchor", "middle")
                .style("font-size", fs + "px").style("fill", axisColor)
                .text("% of total value");
        }
        if (showXLabel) {
            g.append("text")
                .attr("x", W / 2).attr("y", H + M.bottom - 10)
                .attr("text-anchor", "middle")
                .style("font-size", fs + "px").style("fill", axisColor)
                .text("% of entities (best → worst)");
        }

        // ── Bar fill resolution ────────────────────────────────────────────────
        // Precedence, highest first:
        //   1. high contrast   — meaning may not be encoded in fill
        //   2. IBCS mode       — standardized neutral palette
        //   3. threshold colors — explicit opt-in, applies to every bar
        //   4. fx rule color   — resolved per bin from its top-ranked entity
        //   5. the constant Bar color
        const crossingIdx = s.thShow
            ? this.bins.findIndex(b => b.cumPct >= Math.min(100, Math.max(0, s.thValue)))
            : -1;

        const binFill = (b: BinDatum, i: number): string => {
            if (isHC) return barColor;
            if (s.ibcsMode) return barColor;
            if (s.thShow) {
                if (s.thHighlightCrossing && i === crossingIdx) return s.thCrossingColor;
                if (crossingIdx === -1) return s.thWithinColor;
                return i <= crossingIdx ? s.thWithinColor : s.thBeyondColor;
            }
            return b.ruleColor ?? barColor;
        };

        // Bars
        const bw = s.borderWidth > 0 ? s.borderWidth : 0;
        const borderStroke = this.resolveColor(s.borderColor, hcFg, isHC);

        const barSel = g.selectAll(".bar")
            .data(this.bins)
            .enter().append("rect")
            .classed("bar", true)
            .attr("x",      b => xScale(b.label))
            .attr("y",      b => yL(b.pctShare))
            .attr("width",  xScale.bandwidth())
            .attr("height", b => Math.max(0, H - yL(b.pctShare)))
            .attr("fill",   (b, i) => binFill(b, i))
            .attr("opacity", b => hasHL ? (b.highlighted ? s.barOpacity : s.barOpacity * 0.25) : s.barOpacity)
            .attr("stroke",       (bw > 0 || isHC) ? borderStroke : "none")
            .attr("stroke-width", isHC ? 2 : bw)
            .style("cursor", "pointer")
            .on("click", (event: MouseEvent, b: BinDatum) => {
                event.stopPropagation();
                this.toggleBinSelection(b, event.ctrlKey || event.metaKey);
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

        // ── Accessibility ──────────────────────────────────────────────────────
        // The chart is a single Tab stop (roving tabindex); arrows move between
        // bins. capabilities.supportsKeyboardFocus is only honest with this here.
        this.svg
            .attr("role", "listbox")
            .attr("aria-multiselectable", "true")
            .attr("aria-label",
                `Pareto chart. ${this.bins.length} bins of ranked entities, ` +
                `highest contribution first.`);

        this.focusedBin = Math.max(0, Math.min(this.focusedBin, this.bins.length - 1));

        barSel
            .attr("role", "option")
            .attr("tabindex", (_d, i) => (i === this.focusedBin ? 0 : -1))
            .attr("aria-selected", b => (this.selectedBins.has(b.label) ? "true" : "false"))
            .attr("aria-label", (b, i) =>
                `Bin ${i + 1} of ${this.bins.length}. Entities ${b.label}. ` +
                `${b.pctShare.toFixed(1)} percent of total value. ` +
                `Cumulative ${b.cumPct.toFixed(1)} percent. ` +
                `${b.nEntities} ${b.nEntities === 1 ? "entity" : "entities"}.`);

        const focusBin = (i: number): void => {
            const clamped = Math.max(0, Math.min(this.bins.length - 1, i));
            this.focusedBin = clamped;
            barSel.attr("tabindex", (_d, j) => (j === clamped ? 0 : -1));
            (barSel.nodes()[clamped] as SVGRectElement | undefined)?.focus();
        };

        const openMenu = (event: Event, b: BinDatum): void => {
            const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
            const selId = b.indices.length && this.lastCatCol
                ? (this.getSelIds(b.indices, 1)[0] ?? null)
                : null;
            this.selectionManager.showContextMenu(selId, {
                x: rect.left + rect.width / 2,
                y: rect.top,
            });
        };

        barSel
            .on("keydown", (event: KeyboardEvent, b: BinDatum) => {
                if (!this.canInteract) return;
                const i = this.bins.indexOf(b);
                let handled = true;
                switch (event.key) {
                    case "ArrowRight": case "ArrowDown": focusBin(i + 1); break;
                    case "ArrowLeft":  case "ArrowUp":   focusBin(i - 1); break;
                    case "Home":                         focusBin(0); break;
                    case "End":                          focusBin(this.bins.length - 1); break;
                    case "Enter": case " ": case "Spacebar":
                        this.toggleBinSelection(b, event.ctrlKey || event.metaKey);
                        break;
                    case "Escape":
                        this.selectedBins.clear();
                        this.clearBinFilter();
                        this.selectionManager.clear()
                            .then(() => { this.applyOpacity([]); this.syncAria(); });
                        break;
                    case "ContextMenu":  openMenu(event, b); break;
                    case "F10":
                        if (event.shiftKey) openMenu(event, b); else handled = false;
                        break;
                    default: handled = false;
                }
                if (handled) { event.preventDefault(); event.stopPropagation(); }
            })
            // A tooltip that only appears on hover is invisible to keyboard users.
            .on("focus", (event: FocusEvent, b: BinDatum) => {
                const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
                this.host.tooltipService?.show({
                    dataItems: [
                        { displayName: "Entities",         value: b.label },
                        { displayName: "Count",            value: String(b.nEntities) },
                        { displayName: "% of total value", value: `${b.pctShare.toFixed(2)}%` },
                        { displayName: "Cumulative",       value: `${b.cumPct.toFixed(2)}%` },
                        ...(b.customTooltips || [])
                    ],
                    identities: b.indices.length && this.lastCatCol ? this.getSelIds(b.indices, 1) : [],
                    coordinates: [rect.left + rect.width / 2, rect.top],
                    isTouchEvent: false,
                });
            })
            .on("blur", () =>
                this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false })
            );

        // A re-render destroys the focused node; put focus back where it was.
        if (this.restoreFocusAfterRender) {
            this.restoreFocusAfterRender = false;
            (barSel.nodes()[this.focusedBin] as SVGRectElement | undefined)?.focus();
        }

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

        // The Free tier upsell caption used to live here. Removed: Microsoft is
        // explicit that a visual "shouldn't display its own licensing UX, instead
        // use one of Power BI supported predefined notifications". The Pro
        // settings now carry "(Pro)" in the format pane and reaching for one
        // raises the platform's own banner, which — unlike a grey caption in a
        // corner — the user can actually act on.

        // Truncation notice (Desktop only, when ≥30k rows)
        if (isTruncated) {
            const shown = this.truncatedAt.toLocaleString();
            g.append("text")
                .attr("x", 0).attr("y", -10)
                .attr("text-anchor", "start")
                .style("font-size", "10px").style("fill", isHC ? hcFgNeutral : "#E8A020")
                .text(this.isDesktop
                    ? `⚠ Partial data: ${shown} rows. Power BI Desktop cannot load more — publish to the Service for the full dataset.`
                    : `⚠ Partial data: ${shown} rows. Power BI's 100 MB data limit was reached — reduce bound tooltip measures or narrow the filter.`);
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
    /**
     * A BasicFilter over every entity in the given bins.
     *
     * This is what makes bin filtering exact. selectionManager.select() needs one
     * selection ID per entity — each carrying a full scope identity — so a bin of
     * 3,000 customers either builds 3,000 heavy objects or gets capped and filters
     * a subset. A BasicFilter carries plain scalars instead, which is the same
     * mechanism native slicers use for large value lists, so there is no cap.
     *
     * Returns null when the category's queryName cannot be split into a
     * table/column target — drilldown levels and some model shapes do not expose
     * one. The caller falls back to selection IDs in that case, so behavior
     * degrades to the previous mechanism instead of breaking.
     */
    private buildBinFilter(bins: BinDatum[]): powerbi.IFilter | null {
        const cat = this.lastCatCol;
        if (!cat) return null;

        // Require exactly one dot. "table.column" is a usable target; a hierarchy
        // level arrives as "table.hierarchy.level", and splitting that on the
        // first dot would build a target for a column that does not exist —
        // a wrong filter rather than no filter. Anything else falls back.
        const queryName = cat.source?.queryName ?? "";
        const parts = queryName.split(".");
        if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
        const dot = parts[0].length;

        const values: powerbi.PrimitiveValue[] = [];
        const seen = new Set<string>();
        for (const b of bins) {
            for (const i of b.indices) {
                const v = cat.values[i];
                if (v === null || v === undefined) continue;
                const key = String(v);
                if (seen.has(key)) continue;
                seen.add(key);
                values.push(v);
            }
        }
        if (!values.length) return null;

        return {
            $schema: "https://powerbi.com/product/schema#basic",
            filterType: 1,                    // FilterType.Basic
            target: {
                table:  queryName.slice(0, dot),
                column: queryName.slice(dot + 1),
            },
            operator: "In",
            values,
        } as unknown as powerbi.IFilter;
    }

    /** FilterAction is a const enum — the literals are required at runtime. */
    private readonly FILTER_MERGE  = 0;
    private readonly FILTER_REMOVE = 1;

    private clearBinFilter(): void {
        this.host.applyJsonFilter(null, "general", "filter", this.FILTER_REMOVE);
    }

    /**
     * Selection IDs for the entities of a bin, built on demand.
     *
     * History, because this function has been wrong in both directions:
     *   1.1.0.0 built one ID per row eagerly at parse time — 30k+ objects per
     *           update, and no deduplication, which is what produced
     *           "The DataSet 'DS0' contains a filter with duplicate columns".
     *   1.2.0.0 fixed the cost and the duplicates by returning a single ID for
     *           indices[0], ignoring `max` entirely. That traded a visible error
     *           for silently filtering one entity instead of the whole bin.
     *
     * This version keeps the laziness, deduplicates by category value (the
     * actual DS0 cause), builds a fresh builder per ID — reusing one across
     * categories accumulates selectors — and honors the cap.
     *
     * NOTE: the cap means a bin holding more entities than `max` cross-filters
     * only the first `max` of them. Pre-grouping entities with a DAX quantile
     * column keeps bins well under it; see docs/TIPS-AND-HINTS.md.
     */
    private getSelIds(indices: number[], max: number = MAX_SEL_IDS_PER_BIN): ISelectionId[] {
        if (!this.lastCatCol || !indices.length) return [];
        const cat  = this.lastCatCol;
        const out  = [] as ISelectionId[];
        const seen = new Set<string>();

        for (const i of indices) {
            if (out.length >= max) break;
            const key = String(cat.values[i]);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(
                this.host.createSelectionIdBuilder()
                    .withCategory(cat, i)
                    .createSelectionId()
            );
        }
        return out;
    }

    /**
     * Bar opacity from two independent sources, in precedence order:
     *   1. our own bin selection
     *   2. highlights pushed in by other visuals (filter-in)
     * Without the second branch, calling this with an empty selection erased the
     * incoming highlight dimming that renderChart had just applied.
     */
    private applyOpacity(_selectedIds?: ISelectionId[]): void {
        const opacity = this.settings.barOpacity;
        const hasSel  = this.selectedBins.size > 0;
        const hasHL   = this.bins.some(b => b.highlighted);

        this.svg.selectAll<SVGRectElement, BinDatum>(".bar")
            .attr("opacity", b => {
                if (hasSel) return this.selectedBins.has(b.label) ? opacity : opacity * 0.25;
                if (hasHL)  return b.highlighted                  ? opacity : opacity * 0.25;
                return opacity;
            });
    }


    /** Says why a click did nothing, and what lever fixes it. */
    private renderOversizedNotice(): void {
        this.container.selectAll(".oversized-notice").remove();
        const n   = this.oversizedSelection.toLocaleString();
        const cap = MAX_FILTER_VALUES.toLocaleString();

        const note = this.container.append("div")
            .classed("oversized-notice", true)
            .style("position", "absolute").style("left", "0").style("right", "0")
            .style("bottom", "0").style("padding", "8px 12px")
            .style("background", "#FDF3E7").style("border-top", "1px solid #E8A020")
            .style("font-size", "11px").style("color", "#7A4E12")
            .style("line-height", "1.4");

        note.append("div").text(
            `This bin holds ${n} entities — more than the ${cap} Power BI can cross-filter at once.`);
        note.append("div").text(
            this.isPro
                ? "Reduce the bin size (Pareto → Bin size %) so each bar covers fewer entities."
                : "Pro lets you reduce the bin size so each bar covers fewer entities.");

        setTimeout(() => this.container.selectAll(".oversized-notice").remove(), 6000);
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

        // Pro slices stay visible for everyone. Hiding them meant a Free user
        // could not discover that custom bin size, outlier filtering, value
        // labels or a third reference line existed at all — and nobody buys
        // what they don't know is there. Every one of these already carries
        // "(Pro)" in its display name, and using one triggers Power BI's own
        // "feature blocked" banner, which carries the purchase path.

        // Show the bar colour the chart is actually painting.
        //
        // barColor carries a dataViewWildcard selector so Power BI has a scope to
        // write fx-resolved colours into. The side effect is that a plain colour
        // picked by the user is persisted under that wildcard too, landing in
        // categorical.categories[0].objects rather than in metadata.objects — and
        // populateFormattingSettingsModel only reads the latter. The chart honoured
        // the new colour while the swatch kept showing the default, which reads as
        // the setting not having been applied.
        //
        // A single distinct colour across every category is a constant the user
        // chose. Several distinct colours mean an fx rule is driving them, and then
        // the rule dialog — not the swatch — is what represents the state.
        const catObjs = this.lastDataView?.categorical?.categories?.[0]?.objects;
        if (catObjs?.length) {
            const seen = new Set<string>();
            for (const o of catObjs) {
                const c = (o?.["pareto"]?.["barColor"] as powerbi.Fill)?.solid?.color;
                if (c) seen.add(c);
                if (seen.size > 1) break;
            }
            if (seen.size === 1) {
                model.pareto.barColor.value = { value: seen.values().next().value };
            }
        }

        // Threshold color slices are noise until the toggle is on.
        const th = model.thresholdColors;
        th.thresholdValue.visible    = th.show.value;
        th.withinColor.visible       = th.show.value;
        th.beyondColor.visible       = th.show.value;
        th.highlightCrossing.visible = th.show.value;
        th.crossingColor.visible     = th.show.value && th.highlightCrossing.value;

        return this.formattingSettingsService.buildFormattingModel(model);
    }

    public destroy(): void { this.container.remove(); }
}
