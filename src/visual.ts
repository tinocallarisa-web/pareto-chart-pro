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
import LicenseNotificationType    = powerbi.LicenseNotificationType;
import IVisualEventService        = powerbi.extensibility.IVisualEventService;
import DataViewCategoryColumn     = powerbi.DataViewCategoryColumn;
import DataViewValueColumn        = powerbi.DataViewValueColumn;
import ILocalizationManager       = powerbi.extensibility.ILocalizationManager;

import * as d3 from "d3";

import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { ParetoFormattingSettings } from "./settings";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAN_ID               = "pareto-chart-pro-tcviz";

/**
 * spIdentifier es el Service ID completo que genera Partner Center para el plan
 * ("editor.oferta.plan", p.ej. "tino_callarisa.<oferta>.pareto-chart-pro-tcviz"), no el
 * Plan ID corto: lo dice la documentación de la licensing API. Comparar con === PLAN_ID
 * dejaba en Free a quien pagaba. Se acepta el Service ID que termina en ".<plan>" y
 * también el Plan ID solo, por si algún entorno lo devuelve así.
 */
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}
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
/**
 * Up to this many entities, one bar per entity with its name: the classic Pareto of
 * defect types or segments. Binning 3 segments into "0–33%" bars hid the one thing a
 * reader wants at that level, which segment it is. Above it, bins as always.
 */
const ENTITY_BARS_MAX = 30;
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
    // summary group (Free)
    sumShow:      boolean;
    sumFontSize:  number;
    sumColor:     string;
    // comparison group (Pro)
    cmpShowBars:  boolean;
    cmpBarColor:  string;
    cmpShowLine:  boolean;
    cmpLineColor: string;
    cmpShowPills: boolean;
    cmpUpColor:   string;
    cmpDownColor: string;
    // smallMultiples group (Pro)
    smColumns:    number;
    smTitleSize:  number;
    smTitleColor: string;
    // abcZones group (Pro)
    abcShow:      boolean;
    abcA:         number;
    abcB:         number;
    abcAColor:    string;
    abcBColor:    string;
    abcCColor:    string;
    abcLabels:    boolean;
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

        sumShow:       boo("summary", "show",     true),
        sumFontSize:   num("summary", "fontSize", 12),
        sumColor:      col("summary", "color",    "#333333"),

        cmpShowBars:   boo("comparison", "showBars",  true),
        cmpBarColor:   col("comparison", "barColor",  "#8C8C8C"),
        cmpShowLine:   boo("comparison", "showLine",  true),
        cmpLineColor:  col("comparison", "lineColor", "#8C8C8C"),
        cmpShowPills:  boo("comparison", "showPills", true),
        cmpUpColor:    col("comparison", "upColor",   "#2E7D32"),
        cmpDownColor:  col("comparison", "downColor", "#C62828"),

        smColumns:     num("smallMultiples", "columns",       0),
        smTitleSize:   num("smallMultiples", "titleFontSize", 12),
        smTitleColor:  col("smallMultiples", "titleColor",    "#333333"),

        abcShow:       boo("abcZones", "show",       false),
        abcA:          num("abcZones", "aCut",       80),
        abcB:          num("abcZones", "bCut",       95),
        abcAColor:     col("abcZones", "aColor",     "#2B6CB0"),
        abcBColor:     col("abcZones", "bColor",     "#3E9C5B"),
        abcCColor:     col("abcZones", "cColor",     "#A0A0A0"),
        abcLabels:     boo("abcZones", "showLabels", true),
    };
}

interface TooltipSummaryItem {
    displayName: string;
    value: string;
}

interface BinDatum {
    /** Unique across panels: "<panel>|<label>". Selection is keyed on it. */
    key:            string;
    label:          string;
    panel:          number;
    /** One entity per bar, labelled with its name, rather than a share of entities. */
    named:          boolean;
    pctShare:       number;
    cumPct:         number;
    /** Sum of the measure over the bin's entities, for the tooltip. */
    value:          number;
    indices:        number[];      // raw row indices — selIds created on demand
    nEntities:      number;
    highlighted:    boolean;
    /**
     * Share of the panel total held by the entities another visual highlights, in
     * percent. Drawn as the opaque part of the bar, like a native column chart: a
     * bin of 500 customers almost always holds one of the highlighted category, so
     * an all-or-nothing dim never changed anything.
     */
    hlShare:        number | null;
    customTooltips: TooltipSummaryItem[];
    /** Color resolved by an fx conditional-formatting rule on the bin's
     *  top-ranked entity, or null when no rule is applied. */
    ruleColor:      string | null;
    /**
     * Comparison period, ranked ON ITS OWN over the same entity population and
     * cut into the same bins: "the top 20% made 72% then and 78% now". Null when
     * no comparison is drawn.
     */
    cmpShare:       number | null;
    cmpCum:         number | null;
    cmpValue:       number | null;
}

/** One Pareto: the whole chart, or one panel of the small multiples. */
interface PanelDatum {
    title:      string;
    /** Raw panel value, for the filter; null without small multiples. */
    value:      powerbi.PrimitiveValue | null;
    bins:       BinDatum[];
    nEntities:  number;
    hasCmp:     boolean;
    /**
     * Exact, entity by entity, not to the nearest bin: the fewest top entities
     * whose cumulative value reaches `target` % of the total, in each period.
     */
    target:     number;
    need:       number;
    cmpNeed:    number | null;
    /** ABC zones: entities in class A and in A+B, counted exactly. Null when off. */
    abcA:       number | null;
    abcAB:      number | null;
}

/** Per-panel input to the binning: one value per category row. */
interface PanelInput {
    title:   string;
    value:   powerbi.PrimitiveValue | null;
    measure: (number | null)[];
    hl:      (number | null)[] | null;
    cmp:     (number | null)[] | null;
    tips:    { name: string; format: string | undefined; values: (number | null)[] }[];
}

/** Colours resolved once per render (theme, high contrast, IBCS) and shared by every panel. */
interface RenderCtx {
    isHC: boolean; hcFg: string; hcBg: string; hcFgNeutral: string;
    barColor: string; lineColor: string; axisColor: string; gridColor: string; dotColor: string;
    cmpBar: string; cmpLine: string;
}

// ─── Visual ───────────────────────────────────────────────────────────────────
export class Visual implements IVisual {
    private host:             IVisualHost;
    private events:           IVisualEventService;
    private selectionManager: ISelectionManager;

    private container: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private svg:       d3.Selection<SVGSVGElement,  unknown, null, undefined>;

    private settings:      Settings;
    /** Every bin of every panel, panel by panel: the order of the bars in the DOM. */
    private bins:          BinDatum[] = [];
    private panels:        PanelDatum[] = [];
    /** Bin keys ("<panel>|<label>"). A selection lives inside one panel. */
    private selectedBins:  Set<string> = new Set();

    private loc: ILocalizationManager;
    /** Format strings of the bound measures, straight from the model. */
    private measureFormat: string | undefined;
    private cmpFormat:     string | undefined;
    /** The small-multiples column, for the panel half of a bin filter. */
    private panelSource:   powerbi.DataViewMetadataColumn | null = null;
    /** Whether the panel / comparison fields are bound, Pro or not. */
    private hasPanelField = false;
    private hasCmpField   = false;
    private fmtCache = new Map<string, valueFormatter.IValueFormatter>();

    private isPro:           boolean = false; // ISPRO_MARKER
    private isProChecked:    boolean = false;
    /** False in Publish-to-Web, embedded, national clouds and PDF/PPT export. */
    private licenseEnvSupported = true;
    /** False when the license could not be read (offline, not signed in). */
    private licenseInfoAvailable = true;
    /** Last set of Pro settings we already notified about, to avoid nagging. */
    private lastBlockedNotice = "";
    /** The persistent "licence required" icon is a one-shot: it stays until cleared. */
    private licenseIconShown = false;
    /** Pending timer for the Upgrade bar, so it can be cancelled and never leaks. */
    private licenseIconTimer: number | null = null;
    /** Edit mode, from options.viewMode. NOT Desktop vs Service: both report it. */
    private editing = false;
    /**
     * Pro features drawn for real, under a watermark, so the user can see what they
     * would be buying before paying for it. Edit mode only, and only once the licence
     * has actually resolved — otherwise a Pro customer would see a watermark on the
     * first frame, and a published report would ship an unpaid feature.
     */
    private proPreview = false;
    private watermarkEl: HTMLDivElement | null = null;
    /**
     * Un unico color distinto en categories[0].objects significa que el usuario eligio
     * un color plano, no una regla fx. Ver buildBins: sin esto solo se pintan las
     * categorias para las que Power BI llego a entregar objects.
     */
    private uniformBarColor: string | null = null;
    private watermarkTitle: HTMLDivElement | null = null;
    private watermarkWhy: HTMLDivElement | null = null;
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
    /**
     * Desktop, from the host itself (CustomVisualHostEnv.Desktop = 1 << 2). The old
     * test looked for "Electron" in the user agent, which current Desktop builds no
     * longer carry, so Desktop was taken for the Service and the truncation notice
     * blamed the Service's 100 MB limit for a Desktop row cap.
     */
    private get isDesktop(): boolean {
        const env = Number((this.host as any)?.hostEnv);
        if (isFinite(env) && env > 0) return (env & 4) !== 0;
        return navigator.userAgent.indexOf("Electron") !== -1;
    }

    // ── Formatting Model API ──────────────────────────────────────────────────
    private formattingSettingsService: FormattingSettingsService;
    private lastDataView: DataView | undefined;
    private lastCatCol:  DataViewCategoryColumn | undefined;
    private lastPanCol:  DataViewCategoryColumn | null = null;

    // ─────────────────────────────────────────────────────────────────────────

    constructor(options: VisualConstructorOptions) {
        this.host             = options.host;
        this.events           = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.settings         = readSettings(undefined);
        this.loc              = options.host.createLocalizationManager();

        this.formattingSettingsService = new FormattingSettingsService(this.loc);

        this.container = d3.select(options.element)
            .append("div").classed("pareto-visual", true)
            .style("width", "100%").style("height", "100%")
            .style("overflow", "hidden").style("position", "relative");

        this.svg = this.container.append("svg")
            .style("width", "100%").style("height", "100%");

        // Texto blanco con sombra en lugar de gris translucido: sobre barras saturadas un
        // gris desaparece. No intercepta clics ni entra en el recorrido del lector.
        this.watermarkEl = document.createElement("div");
        this.watermarkEl.setAttribute("aria-hidden", "true");
        // Dos lineas: el rotulo y, debajo, QUE funcion lo enciende. Una marca que no
        // dice por que esta ahi se lee como que el visual se ha quedado colgado, y no
        // hay forma de saber cual de los ajustes Pro sigue puesto.
        this.watermarkTitle = document.createElement("div");
        this.watermarkTitle.textContent = this.t("UI_ProPreview", "Pro preview");
        this.watermarkWhy = document.createElement("div");
        this.watermarkEl.appendChild(this.watermarkTitle);
        this.watermarkEl.appendChild(this.watermarkWhy);
        // El tamano se fija en updateWatermark(), que lo escala con el visual: 32px fijos
        // se pierden en un grafico ancho, que es justo donde vive un Pareto.
        this.watermarkEl.style.cssText =
            "position:absolute;left:0;top:0;right:0;bottom:0;display:none;align-items:center;" +
            "justify-content:center;flex-direction:column;text-align:center;" +
            "pointer-events:none;z-index:5;" +
            "font-family:'Segoe UI',sans-serif;font-weight:700;letter-spacing:0.06em;" +
            "white-space:nowrap;color:#FFFFFF;opacity:0.72;transform:rotate(-20deg);" +
            "text-shadow:0 0 3px rgba(46,52,64,0.95),0 2px 6px rgba(46,52,64,0.75);";
        (this.container.node() as HTMLElement).appendChild(this.watermarkEl);

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
                ? (this.binSelIds(datum, 1)[0] ?? null)
                : null;
            this.selectionManager.showContextMenu(selId, {
                x: event.clientX,
                y: event.clientY,
            });
            event.preventDefault();
        });
    }

    // ── Localization and number format ────────────────────────────────────────
    /** A string from stringResources, or the English fallback when the key is missing. */
    private t(key: string, fallback: string): string {
        try {
            const s = this.loc?.getDisplayName(key);
            return s && s !== key ? s : fallback;
        } catch { return fallback; }
    }

    /** "{0} of {1}"-style templates. */
    private tf(key: string, fallback: string, ...args: string[]): string {
        return this.t(key, fallback).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? "");
    }

    private formatter(format: string | undefined): valueFormatter.IValueFormatter {
        const k = format ?? "";
        let f = this.fmtCache.get(k);
        if (!f) {
            f = valueFormatter.create({ format, cultureSelector: this.host.locale });
            this.fmtCache.set(k, f);
        }
        return f;
    }

    /**
     * A share the visual computed itself (bin share, cumulative), in the report's
     * locale: 12,5 % in Spanish, 12.5% in English. `v` is in percent units.
     */
    private pct(v: number, decimals = 1): string {
        const fmt = decimals > 0 ? "0." + "0".repeat(decimals) + "%" : "0%";
        return this.formatter(fmt).format(v / 100);
    }

    /** A change between two shares, in percentage points, with its sign. */
    private pp(d: number, decimals = 1): string {
        const r = Math.round(d * Math.pow(10, decimals)) / Math.pow(10, decimals);
        const fmt = decimals > 0 ? "0." + "0".repeat(decimals) : "0";
        const sign = r > 0 ? "+" : r < 0 ? "−" : "±";
        return `${sign}${this.formatter(fmt).format(Math.abs(r))} ${this.t("UI_pp", "pp")}`;
    }

    /** A measure value with the measure's own format string from the model. */
    private fmtValue(v: number, format: string | undefined): string {
        if (!isFinite(v)) return "";
        return this.formatter(format).format(v);
    }

    /** Integer counts (entities) with the locale's thousands separator. */
    private int(n: number): string {
        return this.formatter("#,0").format(n);
    }

    // ── Update ────────────────────────────────────────────────────────────────
    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dv = options.dataViews?.[0];
            this.lastDataView = dv;
            this.settings = readSettings(dv);
            const cols = dv?.metadata?.columns ?? [];
            this.hasCmpField   = cols.some(c => c.roles?.["comparison"]);
            this.hasPanelField = cols.some(c => c.roles?.["panel"]);

            // ViewMode.View = 0. Edit e InFocusEdit son ambos edicion. Esto NO distingue
            // Desktop de Service: los dos informan de los dos modos, y hacerlo por host
            // dejaria la vista previa visible en un informe publicado.
            const viewMode = (options as any).viewMode;
            this.editing = typeof viewMode === "number" && viewMode !== 0;

            if (!dv?.categorical?.categories?.[0]?.values?.length) {
                this.container.selectAll(".loading-indicator").remove();
                this.proPreview = false;
                this.updateWatermark();
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
                        //
                        // Esta salida se lleva por delante el resto de update(), incluida la
                        // marca de agua. Con un modelo grande cada cambio de ajuste relanza la
                        // consulta y pasa por aqui varias veces, asi que dejarla sin refrescar
                        // significaba que la marca no bajaba al devolver el ajuste a Free: se
                        // quedaba la del estado anterior. La licencia no cambia entre rondas,
                        // asi que proPreview sigue siendo valido y basta con releer el ajuste.
                        this.updateWatermark();
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
                // A newer update() superseded this one. It still has to close its own
                // renderingStarted: Microsoft checks the events 1:1 per update (policy
                // 1200.1.2; Likert was rejected for exactly this on 2026-10-02).
                if (gen !== this.renderGeneration) { this.events.renderingFinished(options); return; }

                // Ya se sabe si hay licencia: de ahi sale si toca vista previa.
                // isProChecked garantiza que la licencia se resolvio; sin el, el primer
                // frame de un cliente Pro saldria con marca de agua.
                this.proPreview = !this.isPro && this.editing && this.isProChecked
                    && this.licenseEnvSupported && this.licenseInfoAvailable;

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
                const labels = new Set(this.bins.map(b => b.key));
                Array.from(this.selectedBins).forEach(l => {
                    if (!labels.has(l)) this.selectedBins.delete(l);
                });

                this.renderChart(options.viewport, truncated);
                this.updateWatermark();
                // renderChart sets opacity from highlight state only; re-apply the
                // selection dimming on top of the fresh nodes.
                this.applyOpacity();
                this.syncAria();
                this.events.renderingFinished(options);
            }).catch((e: unknown) => {
                // An error while drawing happens inside this promise, where the outer
                // try/catch cannot see it: without this, renderingStarted is never closed.
                this.events.renderingFailed(options, String(e));
                console.error("[ParetoChartPro]", e);
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
                p => matchesPlan(p.spIdentifier, PLAN_ID) &&
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
     * Which Pro features the report is actually ASKING FOR right now.
     *
     * Two traps, both hit in testing:
     *
     * 1. The settings model has a default for every Pro property, and
     *    `valueLabels.show` even defaults to true — so reading the model would call
     *    every fresh visual a Pro user. Hence `metadata.objects`, which carries only
     *    what the report set explicitly.
     * 2. But `metadata.objects` keeps a property once it has been set, even after the
     *    user puts it back to the free value. Presence alone therefore meant the
     *    watermark never came down again: raise the bin count, lower it, and the mark
     *    stayed. So each feature also has to say whether its CURRENT value asks for
     *    anything beyond Free.
     *
     * The value goes into the signature, not just the property name: moving bin size
     * from 10 to 15 is a fresh attempt and deserves the banner again, while a resize
     * or a data refresh changes neither.
     */
    private attemptedProFeatures(): { labels: string[]; signature: string; touched: Set<string> } {
        // No early return on a report with no saved settings: binding the comparison
        // or small-multiples field is a Pro request on its own.
        const objs = (this.lastDataView?.metadata?.objects ?? {}) as any;

        const num = (v: any, si: number) => (v === undefined || v === null || isNaN(Number(v)) ? si : Number(v));
        const pareto = objs.pareto ?? {};
        const refs   = objs.referenceLines ?? {};
        const vlab   = objs.valueLabels ?? {};

        // [etiqueta, ¿pide algo por encima del Free?, firma del estado]
        const groups: [string, boolean, string][] = [
            ["custom bin size",
             pareto.binSizePct !== undefined && num(pareto.binSizePct, FREE_BIN_SIZE_PCT) !== FREE_BIN_SIZE_PCT,
             `bin=${num(pareto.binSizePct, FREE_BIN_SIZE_PCT)}`],
            ["outlier filtering",
             num(pareto.trimLower, 0) > 0 || num(pareto.trimUpper, 0) > 0,
             `trim=${num(pareto.trimLower, 0)}/${num(pareto.trimUpper, 0)}`],
            ["a third reference line",
             refs.showRef3 === true,
             `ref3=${refs.showRef3 === true}:${refs.ref3Value ?? ""}`],
            ["value labels",
             vlab.show === true,
             `labels=${vlab.show === true}`],
            // Binding the field IS the request: there is nothing else to switch on.
            ["comparison",
             this.hasCmpField,
             `cmp=${this.hasCmpField}`],
            ["small multiples",
             this.hasPanelField,
             `panels=${this.hasPanelField}`],
            ["ABC zones",
             objs.abcZones?.show === true,
             `abc=${objs.abcZones?.show === true}`],
        ];

        const labels: string[] = [];
        const parts:  string[] = [];
        const touched = new Set<string>();
        for (const [label, activa, firma] of groups) {
            if (!activa) continue;
            labels.push(label);
            touched.add(label);
            parts.push(firma);
        }
        return { labels, signature: parts.join("|"), touched };
    }

    /**
     * Ask Power BI to show its own "feature blocked" banner, which carries the
     * purchase path. Microsoft is explicit that a visual "shouldn't display its
     * own licensing UX", and a banner the user can act on converts; a grey
     * caption in a corner does not.
     */
    /**
     * Lo que se DIBUJA, funcion a funcion.
     *
     * La vista previa NO puede concederse en bloque. `binSizePct` vale 5 por defecto, asi
     * que un `proNow` global daba 20 barras nada mas insertar el visual: Pro gratis, sin
     * marca de agua y sin aviso, porque el usuario no habia pedido nada. La previa solo
     * vale para la funcion que el usuario ha tocado de verdad, que es tambien el momento
     * en que aparecen la marca y el aviso de compra.
     */
    /** Display name of a Pro feature id, in the report's language. */
    private featName(id: string): string {
        switch (id) {
            case "custom bin size":        return this.t("Feat_binSize",   "custom bin size");
            case "outlier filtering":      return this.t("Feat_trim",      "outlier filtering");
            case "a third reference line": return this.t("Feat_ref3",      "a third reference line");
            case "value labels":           return this.t("Feat_labels",    "value labels");
            case "comparison":             return this.t("Feat_cmp",       "comparison");
            case "small multiples":        return this.t("Feat_panels",    "small multiples");
            case "ABC zones":              return this.t("Feat_abc",       "ABC zones");
            default: return id;
        }
    }

    private previewOf(feature: string): boolean {
        if (this.isPro) return true;
        if (!this.proPreview) return false;
        return this.attemptedProFeatures().touched.has(feature);
    }

    /**
     * La marca solo aparece cuando hay una funcion Pro realmente puesta. Marcar un
     * Pareto corriente porque el usuario no tiene licencia seria ensuciar un grafico
     * que es correcto y gratuito.
     */
    private updateWatermark(): void {
        if (!this.watermarkEl) return;
        const { labels } = this.attemptedProFeatures();
        const activa = this.proPreview && labels.length > 0;
        this.watermarkEl.style.display = activa ? "flex" : "none";
        if (!activa) return;

        if (this.watermarkTitle) { this.watermarkTitle.textContent = this.t("UI_ProPreview", "Pro preview"); }
        if (this.watermarkWhy) { this.watermarkWhy.textContent = labels.map(l => this.featName(l)).join(" · "); }

        // Escala con el visual y se limita por el alto tambien: en un Pareto muy ancho y
        // bajo, dimensionar solo por ancho daria un texto que no cabe en vertical. El
        // minimo evita que desaparezca en un mosaico pequeno, y el maximo que tape el
        // grafico que precisamente queremos ensenar.
        const el = this.container.node() as HTMLElement;
        const w = el?.clientWidth  || 0;
        const h = el?.clientHeight || 0;
        const size = Math.round(Math.max(30, Math.min(96, w / 7.5, h / 3.5)));
        this.watermarkEl.style.fontSize = `${size}px`;
        if (this.watermarkWhy) {
            this.watermarkWhy.style.cssText =
                `font-size:${Math.round(size * 0.32)}px;font-weight:600;letter-spacing:0.02em;`
                + "margin-top:0.25em;opacity:0.95;";
        }
    }

    private cancelLicenseIcon(): void {
        if (this.licenseIconTimer !== null) {
            window.clearTimeout(this.licenseIconTimer);
            this.licenseIconTimer = null;
        }
    }

    /**
     * Take the licence notice down again: the licence resolved, or the user
     * removed every Pro setting. Both notifications live for the visual's
     * lifetime until cleared, so leaving one up would tell a paying customer
     * they need to buy what they just bought.
     */
    private clearLicenseNotice(): void {
        this.lastBlockedNotice = "";
        this.cancelLicenseIcon();
        if (!this.licenseIconShown) return;
        this.licenseIconShown = false;
        try {
            (this.host.licenseManager as any)?.clearLicenseNotification?.();
        } catch { /* best-effort */ }
    }

    /**
     * Ask Power BI to show its own licence UX. Microsoft is explicit that a visual
     * "shouldn't display its own licensing UX", so everything here goes through the
     * host.
     *
     * Power BI shows ONE notification at a time and the last one replaces the one
     * before it. Until 1.4.1.0 this called notifyLicenseRequired and then
     * notifyFeatureBlocked in the same update(), so on the first attempt the banner
     * overwrote the Upgrade bar: the user was told to get a licence and left with
     * nothing to click. The order is the whole fix.
     *
     * Sequence, the same one already in production in Calendar, Bullet and Likert:
     * clear what is up, show the banner naming the feature, and ~10 s later raise the
     * persistent Upgrade bar, which is what carries the purchase path.
     */
    private notifyProFeatureBlocked(): void {
        const lm = (this.host as any).licenseManager;
        if (!lm) return;

        if (this.isPro || this.DEV_MODE) { this.clearLicenseNotice(); return; }

        const { labels: wanted, signature } = this.attemptedProFeatures();
        if (wanted.length === 0) { this.clearLicenseNotice(); return; }

        // Licence unreadable, or an environment without licence enforcement:
        // a Pro customer would land here too, so never ask them to buy.
        if (!this.licenseEnvSupported || !this.licenseInfoAvailable) return;

        // Fires on every fresh change to a Pro setting, and only then: update()
        // also runs on resize, selection and data refresh, and the notice has no
        // business reappearing for those.
        if (signature === this.lastBlockedNotice) return;
        this.lastBlockedNotice = signature;
        this.licenseIconShown = true;

        const names = wanted.map(w => this.featName(w));
        const list = names.join(", ");
        const msg = this.proPreview
            ? this.tf("UI_NoticePreview",
                "Pareto Chart Pro: {0} — part of the Pro plan, shown here as a watermarked preview. Reading view shows the free result.", list)
            : this.tf("UI_NoticeBlocked",
                "Pareto Chart Pro: {0} — part of the Pro plan. Get a licence to enable it.", list);

        const show = () => {
            try { lm.notifyFeatureBlocked?.(msg.slice(0, 500)); } catch { /* best-effort */ }
            this.cancelLicenseIcon();
            // The Upgrade bar has to come last, or the banner above replaces it.
            // It is also what covers a trial expiring: the user changed nothing, so
            // the banner would never fire on its own, and the chart silently drops
            // back to 20% bins with no value labels and nothing explaining why.
            this.licenseIconTimer = window.setTimeout(() => {
                this.licenseIconTimer = null;
                if (this.isPro || !this.licenseIconShown) return;
                // const enum: TypeScript inlines this to 0. Referencing the enum
                // object at runtime would give undefined.
                try {
                    lm.notifyLicenseRequired?.(LicenseNotificationType.General);
                } catch { /* best-effort */ }
            }, 10500);
        };

        // clearLicenseNotification may return a promise; showing before it settles
        // would let the clear wipe the banner we just raised.
        let cleared: any;
        try { cleared = lm.clearLicenseNotification?.(); } catch { /* best-effort */ }
        if (cleared && typeof cleared.then === "function") { cleared.then(show, show); }
        else { show(); }
    }

    // ── Build bins ────────────────────────────────────────────────────────────
    /**
     * The small-multiples field arrives as a SECOND CATEGORY column, so each row is
     * one entity × panel combination. Grouping the values by panel instead made
     * Power BI page the data in blocks of 500 rows: a 5,000-customer model drew a
     * Pareto of 500. As a category, the 30,000-row window still applies, and a
     * customer that sits in one region is still one row.
     *
     * Without a licence the panels are folded back into one Pareto per entity, and
     * the comparison measure is ignored: the free result is the plain chart.
     */
    private buildBins(dv: DataView): void {
        const cats   = dv.categorical.categories ?? [];
        const catCol = (cats.find(c => c.source?.roles?.["category"]) ?? cats[0]) as DataViewCategoryColumn;
        const panCol = cats.find(c => c.source?.roles?.["panel"] && c !== catCol) ?? null;
        this.lastCatCol  = catCol;
        this.lastPanCol  = panCol;
        this.panelSource = panCol?.source ?? null;
        const nRows = catCol.values.length;

        const vals    = dv.categorical.values ?? ([] as unknown as powerbi.DataViewValueColumns);
        const roleCol = (role: string): DataViewValueColumn | undefined =>
            vals.find(v => v.source?.roles?.[role]);
        const mCol = roleCol("measure");
        const cCol = roleCol("comparison");
        const tCols = vals.filter(v => v.source?.roles?.["tooltips"]);
        this.measureFormat = mCol?.source?.format;
        this.cmpFormat     = cCol?.source?.format;

        const usePanels = !!panCol && this.previewOf("small multiples");
        const useCmp    = !!cCol && this.previewOf("comparison");

        const toNum = (v: powerbi.PrimitiveValue): number | null =>
            v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v);
        const meas = mCol ? mCol.values.map(toNum) : new Array(nRows).fill(null);
        const hl   = mCol?.highlights ? mCol.highlights.map(toNum) : null;
        const cmp  = useCmp && cCol ? cCol.values.map(toNum) : null;
        const tips = tCols.map(tc => ({ name: tc.source.displayName, format: tc.source.format, values: tc.values.map(toNum) }));

        // Rows of each Pareto. With panels: one list per panel value. Without: one
        // list, and an entity that appears under several panels is summed into its
        // first row, so it is ranked once with its total.
        const inputs: PanelInput[] = [];
        if (usePanels && panCol) {
            const byPanel = new Map<string, number[]>();
            const firstVal = new Map<string, powerbi.PrimitiveValue>();
            for (let i = 0; i < nRows; i++) {
                const v = panCol.values[i];
                const k = v === null || v === undefined ? "\u0000" : (v instanceof Date ? String(v.getTime()) : String(v));
                let arr = byPanel.get(k);
                if (!arr) { arr = []; byPanel.set(k, arr); firstVal.set(k, v); }
                arr.push(i);
            }
            const keys = Array.from(byPanel.keys()).sort((a, b) => {
                const va = firstVal.get(a), vb = firstVal.get(b);
                if (typeof va === "number" && typeof vb === "number") return va - vb;
                if (va instanceof Date && vb instanceof Date) return va.getTime() - vb.getTime();
                return String(va ?? "").localeCompare(String(vb ?? ""), this.host.locale);
            });
            for (const k of keys) {
                const rows = byPanel.get(k)!;
                const pick = <T>(arr: (T | null)[] | null): (T | null)[] | null => {
                    if (!arr) return null;
                    const out: (T | null)[] = new Array(nRows).fill(null);
                    for (const i of rows) out[i] = arr[i];
                    return out;
                };
                const v = firstVal.get(k) ?? null;
                inputs.push({
                    title: this.panelTitle(v),
                    value: v,
                    measure: pick(meas)!,
                    hl:   pick(hl),
                    cmp:  pick(cmp),
                    tips: tips.map(t => ({ name: t.name, format: t.format, values: pick(t.values)! })),
                });
            }
        } else if (panCol) {
            const first = new Map<string, number>();
            const fold = <T extends number>(arr: (T | null)[] | null): (number | null)[] | null => {
                if (!arr) return null;
                const out: (number | null)[] = new Array(nRows).fill(null);
                for (let i = 0; i < nRows; i++) {
                    const key = String(catCol.values[i]);
                    let f = first.get(key);
                    if (f === undefined) { f = i; first.set(key, i); }
                    const x = arr[i];
                    if (x !== null && x !== undefined) out[f] = (out[f] ?? 0) + x;
                }
                return out;
            };
            inputs.push({
                title: "", value: null,
                measure: fold(meas)!, hl: fold(hl), cmp: fold(cmp),
                tips: tips.map(t => ({ name: t.name, format: t.format, values: fold(t.values)! })),
            });
        } else {
            inputs.push({ title: "", value: null, measure: meas, hl, cmp, tips });
        }

        // Conditional formatting: Power BI resolves the fx rule per category and
        // hands the result back on categories[0].objects[i]. Read it defensively —
        // with no rule applied the whole chain is undefined.
        const catObjects = (catCol as any)?.objects as powerbi.DataViewObjects[] | undefined;

        // Un color plano elegido en el swatch se persiste bajo el selector wildcard de
        // barColor, asi que aterriza aqui y no en metadata.objects. Power BI solo entrega
        // objects para parte de las categorias cuando el modelo es grande, de modo que
        // resolverlo bin a bin pintaba unas pocas barras con el color elegido y dejaba el
        // resto en el azul por defecto. Medido con 500.000 entidades: 4 barras de 20.
        //
        // Un unico color distinto = constante del usuario, y vale para TODAS las barras.
        // Varios = hay una regla fx gobernando, y entonces si manda el color por bin.
        this.uniformBarColor = null;
        if (catObjects?.length) {
            const distintos = new Set<string>();
            for (const o of catObjects) {
                const c = (o?.["pareto"]?.["barColor"] as powerbi.Fill)?.solid?.color;
                if (typeof c === "string" && c.length > 0) { distintos.add(c); }
                if (distintos.size > 1) { break; }
            }
            if (distintos.size === 1) { this.uniformBarColor = distintos.values().next().value; }
        }

        this.panels = [];
        inputs.forEach(inp => {
            const p = this.binPanel(inp, this.panels.length, catObjects);
            if (p) this.panels.push(p);
        });
        this.bins = ([] as BinDatum[]).concat(...this.panels.map(p => p.bins));
    }

    /** An entity's value as a bar label, with the model's format for dates and numbers. */
    private entityName(row: number): string {
        const v = this.lastCatCol?.values[row];
        if (v === null || v === undefined || v === "") return this.t("UI_Blank", "(Blank)");
        if (v instanceof Date || typeof v === "number") return this.fmtValue(v as any, this.lastCatCol?.source?.format) || String(v);
        return String(v);
    }

    /** The panel's value as a title: the model's format for dates and numbers. */
    private panelTitle(v: powerbi.PrimitiveValue | undefined | null): string {
        if (v === null || v === undefined || v === "") return this.t("UI_Blank", "(Blank)");
        const fmt = this.panelSource?.format;
        if (v instanceof Date || typeof v === "number") return this.fmtValue(v as any, fmt) || String(v);
        return String(v);
    }

    /**
     * Rank, trim and bin one panel. The comparison measure is ranked on its own over
     * the same entity population and cut at the same positions, so bin k compares
     * "the top k-th slice then" with "the top k-th slice now", whoever is in it.
     */
    private binPanel(inp: PanelInput, panelIdx: number,
                     catObjects: powerbi.DataViewObjects[] | undefined): PanelDatum | null {
        const s = this.settings;
        const hasHL = inp.hl != null;

        // An entity belongs to this panel when either period has a value for it. A
        // customer lost since last year has no current value and still counts: it is
        // part of the comparison population, at the bottom of the current ranking.
        const rows: { value: number; cmp: number; index: number; hlValue: number | null }[] = [];
        for (let i = 0; i < inp.measure.length; i++) {
            const v = inp.measure[i];
            const c = inp.cmp ? inp.cmp[i] : null;
            if (v === null && c === null) continue;
            rows.push({
                value:   Math.max(0, v ?? 0),
                cmp:     Math.max(0, c ?? 0),
                hlValue: hasHL ? inp.hl![i] : null,
                index:   i,
            });
        }
        const n = rows.length;
        if (n === 0) return null;

        rows.sort((a, b) => b.value - a.value);

        let skipTop = 0, skipBottom = 0;
        if (this.previewOf("outlier filtering")) {
            skipTop    = Math.max(0, Math.floor(n * Math.min(s.trimUpper, 99) / 100));
            skipBottom = Math.max(0, Math.floor(n * Math.min(s.trimLower, 99) / 100));
        }
        const trimmedRows = rows.slice(skipTop, n - skipBottom || n);
        const tn = trimmedRows.length;
        if (tn === 0) return null;

        const binSizePct = this.previewOf("custom bin size")
            ? Math.min(20, Math.max(1, s.binSizePct))
            : FREE_BIN_SIZE_PCT;
        const requestedNBins = Math.ceil(100 / binSizePct);
        const named = tn <= ENTITY_BARS_MAX;
        const nBins = named ? tn : Math.min(requestedNBins, tn);

        const baseEntities = Math.floor(tn / nBins);
        const remainder    = tn % nBins;
        const starts = new Array<number>(nBins + 1);
        let curr = 0;
        for (let k = 0; k < nBins; k++) {
            starts[k] = curr;
            curr += baseEntities + (k < remainder ? 1 : 0);
        }
        starts[nBins] = tn;

        const total = trimmedRows.reduce((acc, r) => acc + r.value, 0);
        if (total === 0) return null;

        const target = this.summaryTarget();
        const needFor = (sortedDesc: number[], sum: number): number => {
            let acc = 0;
            for (let j = 0; j < sortedDesc.length; j++) {
                acc += sortedDesc[j];
                if (acc >= sum * target / 100 - 1e-9) return j + 1;
            }
            return sortedDesc.length;
        };
        const sortedVals = trimmedRows.map(r => r.value);
        const need = needFor(sortedVals, total);

        // ABC zones, exact like the summary: A reaches the first cut of the total,
        // B the second. Cut points are clamped so B can never end before A.
        let abcA: number | null = null, abcAB: number | null = null;
        if (s.abcShow && this.previewOf("ABC zones")) {
            const cutOf = (pct: number): number => {
                let acc = 0;
                for (let j = 0; j < sortedVals.length; j++) {
                    acc += sortedVals[j];
                    if (acc >= total * pct / 100 - 1e-9) return j + 1;
                }
                return sortedVals.length;
            };
            const a = Math.min(99, Math.max(1, s.abcA));
            const b = Math.min(99.9, Math.max(a, s.abcB));
            abcA  = cutOf(a);
            abcAB = Math.max(abcA, cutOf(b));
        }
        let cmpNeed: number | null = null;

        // Comparison. With bins: its own ranking, the same trim and the same cut
        // points — "the top 20% then" against "the top 20% now", whoever is in them.
        // With named bars it has to be the SAME entity: a bar labelled "Retail" with
        // last year's number one behind it (maybe HoReCa) would be a false reading.
        let cmpBinValues: number[] | null = null;
        let cmpTotal = 0;
        if (inp.cmp) {
            const ranked = rows.map(r => r.cmp).sort((a, b) => b - a).slice(skipTop, n - skipBottom || n);
            cmpTotal = ranked.reduce((a, v) => a + v, 0);
            if (cmpTotal > 0) {
                cmpNeed = needFor(ranked, cmpTotal);
                cmpBinValues = [];
                const source = named ? trimmedRows.map(r => r.cmp) : ranked;
                if (named) cmpTotal = source.reduce((a, v) => a + v, 0);
                for (let k = 0; k < nBins; k++) {
                    let sum = 0;
                    for (let j = starts[k]; j < starts[k + 1]; j++) sum += source[j];
                    cmpBinValues.push(sum);
                }
                if (cmpTotal <= 0) cmpBinValues = null;
            }
        }

        const ruleColorAt = (rowIndex: number): string | null => {
            const c = (catObjects?.[rowIndex]?.["pareto"]?.["barColor"] as powerbi.Fill)?.solid?.color;
            return typeof c === "string" && c.length > 0 ? c : null;
        };

        let cumPct = 0, cmpCum = 0;
        const stepPct = 100 / nBins;
        const bins: BinDatum[] = [];
        for (let k = 0; k < nBins; k++) {
            const b = trimmedRows.slice(starts[k], starts[k + 1]);
            if (!b.length) continue;
            const binStart = k * stepPct;
            const binEnd   = Math.min((k + 1) * stepPct, 100);
            const binValue = b.reduce((acc, r) => acc + r.value, 0);
            const pctShare = (binValue / total) * 100;
            cumPct += pctShare;

            let cmpShare: number | null = null, cmpCumNow: number | null = null, cmpValue: number | null = null;
            if (cmpBinValues) {
                cmpValue = cmpBinValues[k];
                cmpShare = (cmpValue / cmpTotal) * 100;
                cmpCum  += cmpShare;
                cmpCumNow = cmpCum;
            }

            const hlSum = hasHL ? b.reduce((acc, r) => acc + Math.max(0, r.hlValue ?? 0), 0) : 0;
            const highlighted = hasHL && hlSum > 0;
            const hlShare = hasHL ? (hlSum / total) * 100 : null;

            const customTooltips: TooltipSummaryItem[] = inp.tips.map(tip => {
                const sum = b.reduce((acc, r) => acc + (tip.values[r.index] ?? 0), 0);
                return { displayName: tip.name, value: this.fmtValue(sum, tip.format) };
            });

            // Rows are sorted descending, so b[0] is the bin's top-ranked
            // entity. Its rule color represents the bin; fall back to the
            // first entity in the bin that resolves to one.
            let ruleColor: string | null = null;
            for (const r of b) {
                ruleColor = ruleColorAt(r.index);
                if (ruleColor) break;
            }

            const label = named
                ? this.entityName(b[0].index)
                : `${Math.round(binStart)}–${Math.round(binEnd)}%`;
            bins.push({
                // Names can repeat (two customers called the same); the key cannot.
                key:     named ? `${panelIdx}|#${String(this.lastCatCol?.values[b[0].index])}` : `${panelIdx}|${label}`,
                label,
                panel:   panelIdx,
                named,
                pctShare,
                cumPct,
                value:   binValue,
                indices: b.map(r => r.index),
                nEntities: b.length,
                highlighted,
                hlShare,
                customTooltips,
                ruleColor,
                cmpShare,
                cmpCum:  cmpCumNow,
                cmpValue,
            });
        }

        return {
            title: inp.title,
            value: inp.value,
            bins,
            nEntities: tn,
            hasCmp: cmpBinValues !== null,
            target,
            need,
            cmpNeed,
            abcA,
            abcAB,
        };
    }

    /** Toggle a bin's selection. Shared by pointer and keyboard so both behave
     *  identically. `additive` mirrors Ctrl/Cmd-click. A selection lives inside one
     *  panel: an entity filter AND a panel filter cannot express "bin 1 of plant A
     *  plus bin 3 of plant B" without selecting more than was clicked. */
    private toggleBinSelection(b: BinDatum, additive: boolean): void {
        if (!this.canInteract) return;

        const otherPanel = Array.from(this.selectedBins).some(k => !k.startsWith(`${b.panel}|`));
        if (additive && !otherPanel) {
            if (this.selectedBins.has(b.key)) this.selectedBins.delete(b.key);
            else                              this.selectedBins.add(b.key);
        } else if (this.selectedBins.size === 1 && this.selectedBins.has(b.key)) {
            this.selectedBins.clear();
        } else {
            this.selectedBins.clear();
            this.selectedBins.add(b.key);
        }

        if (this.selectedBins.size === 0) {
            this.clearBinFilter();
            this.selectionManager.clear().then(() => { this.applyOpacity([]); this.syncAria(); });
            return;
        }

        const chosen = this.bins.filter(bin => this.selectedBins.has(bin.key));

        // Refuse rather than filter partially.
        const entityCount = chosen.reduce((acc, x) => acc + x.nEntities, 0);
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
            (acc, bin) => acc.concat(this.binSelIds(bin)), [] as ISelectionId[]);
        this.selectionManager.select(allIds, false)
            .then((ids: ISelectionId[]) => { this.applyOpacity(ids); this.syncAria(); });
    }

    /** "table.column" of a column, or null for hierarchy levels and other shapes. */
    private columnTarget(src: powerbi.DataViewMetadataColumn | null | undefined): { table: string; column: string } | null {
        // Require exactly one dot. "table.column" is a usable target; a hierarchy
        // level arrives as "table.hierarchy.level", and splitting that on the
        // first dot would build a target for a column that does not exist —
        // a wrong filter rather than no filter. Anything else falls back.
        const parts = (src?.queryName ?? "").split(".");
        if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
        return { table: parts[0], column: parts[1] };
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

        const cat = this.lastCatCol;
        if (!cat) return false;
        const catTarget   = this.columnTarget(cat.source);
        const panelTarget = this.columnTarget(this.panelSource);

        const values = new Set<string>();
        let panelValues: Set<string> | null = null;
        for (const f of filters) {
            const vs = (f as any)?.values;
            if (!Array.isArray(vs)) continue;
            const col = (f as any)?.target?.column;
            if (panelTarget && col === panelTarget.column && (!catTarget || col !== catTarget.column)) {
                panelValues = panelValues ?? new Set<string>();
                for (const v of vs) panelValues.add(String(v));
            } else {
                for (const v of vs) values.add(String(v));
            }
        }
        if (!values.size) return false;   // a filter we cannot read — do not clear

        this.selectedBins.clear();
        for (const b of this.bins) {
            // A bin cannot be fully contained in a smaller value set.
            if (!b.indices.length || b.nEntities > values.size) continue;
            const pv = this.panels[b.panel]?.value;
            if (panelValues && pv !== null && pv !== undefined && !panelValues.has(String(pv))) continue;
            let all = true;
            for (const i of b.indices) {
                if (!values.has(String(cat.values[i]))) { all = false; break; }
            }
            if (all) this.selectedBins.add(b.key);
        }
        return true;
    }

    /** Keep aria-selected in step with the visual selection state. */
    private syncAria(): void {
        this.svg.selectAll<SVGRectElement, BinDatum>(".bar")
            .attr("aria-selected", b => (this.selectedBins.has(b.key) ? "true" : "false"));
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
    /**
     * One panel, or a grid of them. Every panel shares the left axis, so a bar of
     * the same height means the same share in every panel; the cumulative axis is
     * 0–100% by definition everywhere.
     */
    private renderChart(viewport: powerbi.IViewport, isTruncated = false): void {
        const s  = this.settings;
        const VW = viewport.width, VH = viewport.height;
        if (VW <= 0 || VH <= 0 || !this.panels.length || !this.bins.length) return;

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
        let cmpBar    = this.resolveColor(s.cmpBarColor,  hcFgNeutral, isHC);
        let cmpLine   = this.resolveColor(s.cmpLineColor, hcFgNeutral, isHC);

        if (s.ibcsMode && !isHC) {
            barColor  = "#404040"; // IBCS Neutral Charcoal
            lineColor = "#262626"; // IBCS Solid Dark Line
            dotColor  = "#262626";
            axisColor = "#000000"; // IBCS Black Axis Typography & Lines
            gridColor = "#E5E5E5";
            cmpBar    = "#A6A6A6"; // IBCS previous period: outlined grey
            cmpLine   = "#A6A6A6";
        }
        const ctx: RenderCtx = { isHC, hcFg, hcBg, hcFgNeutral, barColor, lineColor, axisColor, gridColor, dotColor, cmpBar, cmpLine };

        this.svg.attr("width", VW).attr("height", VH);

        const multi = this.panels.length > 1 || (this.panels[0].value !== null && this.panels[0].value !== undefined);
        const n = this.panels.length;
        const noticeH = isTruncated ? 16 : 0;
        let cols = 1;
        if (multi) {
            cols = s.smColumns >= 1
                ? Math.min(n, Math.round(s.smColumns))
                // Aim for cells about 1.6 times wider than tall: a Pareto reads left
                // to right and a tall narrow cell squeezes its bins.
                : Math.max(1, Math.min(n, Math.round(Math.sqrt(n * (VW / Math.max(1, VH - noticeH)) / 1.6))));
        }
        const rows   = Math.ceil(n / cols);
        const gap    = multi ? 14 : 0;
        const titleH = multi ? Math.max(9, s.smTitleSize) + 8 : 0;
        const cellW  = (VW - gap * (cols - 1)) / cols;
        const cellH  = (VH - noticeH - gap * (rows - 1)) / rows;

        // Shared left axis. Headroom for value labels and change pills on top of
        // the tallest bar, so neither is clipped at the top.
        const showCmpBars = this.panels.some(p => p.hasCmp) && s.cmpShowBars;
        const maxShare = d3.max(this.bins, b => Math.max(b.pctShare, showCmpBars && b.cmpShare != null ? b.cmpShare : 0)) ?? 100;
        const pillsOn  = s.cmpShowPills && this.panels.some(p => p.hasCmp);
        const labelsOn = s.showLabels && this.previewOf("value labels");
        const headroom = 1.18 + (pillsOn ? 0.14 : 0) + (labelsOn && pillsOn ? 0.06 : 0);
        const yMax = Math.max(maxShare * headroom, 5);

        this.panels.forEach((p, pi) => {
            const cx = (pi % cols) * (cellW + gap);
            const cy = noticeH + Math.floor(pi / cols) * (cellH + gap);
            const pg = this.svg.append("g").classed("panel", true)
                .attr("transform", `translate(${cx},${cy})`);
            if (multi) {
                const title = pg.append("text")
                    .attr("x", 0).attr("y", Math.max(9, s.smTitleSize))
                    .style("font-size", Math.max(9, s.smTitleSize) + "px")
                    .style("font-weight", "600")
                    .style("fill", isHC ? hcFg : s.smTitleColor)
                    .text(p.title);
                this.fitText(title.node(), cellW);
            }
            const body = pg.append("g").attr("transform", `translate(0,${titleH})`);
            this.drawPanel(body, p, cellW, cellH - titleH, yMax, ctx);
        });

        this.wireBars();

        // Truncation notice (Desktop only, when ≥30k rows)
        if (isTruncated) {
            const shown = this.int(this.truncatedAt);
            this.svg.append("text")
                .attr("x", 4).attr("y", 12)
                .attr("text-anchor", "start")
                .style("font-size", "10px").style("fill", isHC ? hcFgNeutral : "#E8A020")
                .text(this.isDesktop
                    ? this.tf("UI_TruncDesktop", "⚠ Partial data: {0} rows. Power BI Desktop cannot load more — publish to the Service for the full dataset.", shown)
                    : this.tf("UI_TruncService", "⚠ Partial data: {0} rows. Power BI's 100 MB data limit was reached — reduce bound tooltip measures or narrow the filter.", shown));
        }
    }

    /** Shorten an SVG text with an ellipsis until it fits. */
    private fitText(node: SVGTextElement | null, maxW: number): void {
        if (!node || maxW <= 0 || typeof node.getComputedTextLength !== "function") return;
        let txt = node.textContent ?? "";
        if (node.getComputedTextLength() <= maxW) return;
        while (txt.length > 1 && node.getComputedTextLength() > maxW) {
            txt = txt.slice(0, -2);
            node.textContent = txt + "…";
        }
    }

    /** Threshold of the summary: reference line 1 when on, else the threshold colour, else 80%. */
    private summaryTarget(): number {
        const s = this.settings;
        return Math.min(99, Math.max(1, s.showRef1 ? s.ref1Value : (s.thShow ? s.thValue : 80)));
    }

    /**
     * The one sentence a reader wants from a Pareto: how many entities make the
     * threshold share. Counted entity by entity, so it is exact at any bin size —
     * with 20% bins the bars alone can only say "between 20% and 40%".
     *
     * With a comparison, the same count in the other period: fewer entities
     * needed means more concentration.
     */
    private summaryText(p: PanelDatum): string {
        const share = (k: number) => (100 * k) / Math.max(1, p.nEntities);
        let text = this.tf("UI_Summary", "{0} of {1} entities ({2}) make {3} of the total",
            this.int(p.need), this.int(p.nEntities), this.pct(share(p.need), 1), this.pct(p.target, 0));
        if (p.hasCmp && p.cmpNeed != null) {
            // Two counts, no pp: here fewer entities means MORE concentration, the
            // opposite sign of the bar pills, and two opposite signs on one chart mislead.
            text += this.tf("UI_SummaryCmp", " · comparison: {0} entities ({1})",
                this.int(p.cmpNeed), this.pct(share(p.cmpNeed), 1));
        }
        return text;
    }

    /** Tooltip rows for a bin: the bin, its value, the comparison, extra measures. */
    private tipItems(b: BinDatum, withCount = true): powerbi.extensibility.VisualTooltipDataItem[] {
        const items: powerbi.extensibility.VisualTooltipDataItem[] = [];
        const p = this.panels[b.panel];
        if (p && p.value !== null && p.value !== undefined) {
            items.push({ displayName: this.t("UI_TipPanel", "Panel"), value: p.title });
        }
        items.push({ displayName: this.t("UI_TipEntities", "Entities"), value: b.label });
        if (withCount) items.push({ displayName: this.t("UI_TipCount", "Count"), value: this.int(b.nEntities) });
        items.push({ displayName: this.t("UI_TipValue", "Value"), value: this.fmtValue(b.value, this.measureFormat) });
        items.push({ displayName: this.t("UI_TipShare", "% of total value"), value: this.pct(b.pctShare, 2) });
        items.push({ displayName: this.t("UI_TipCum", "Cumulative"), value: this.pct(b.cumPct, 2) });
        if (b.hlShare !== null) {
            items.push({ displayName: this.t("UI_TipHl", "Highlighted share"), value: this.pct(b.hlShare, 2) });
        }
        if (b.cmpShare != null && b.cmpCum != null && b.cmpValue != null) {
            items.push({ displayName: this.t("UI_TipCmpValue", "Comparison value"), value: this.fmtValue(b.cmpValue, this.cmpFormat ?? this.measureFormat) });
            items.push({ displayName: this.t("UI_TipCmpShare", "Comparison share"), value: this.pct(b.cmpShare, 2) });
            items.push({ displayName: this.t("UI_TipChange", "Change in share"), value: this.pp(b.pctShare - b.cmpShare) });
            items.push({ displayName: this.t("UI_TipCmpCum", "Comparison cumulative"), value: this.pct(b.cmpCum, 2) });
        }
        return items.concat(b.customTooltips || []);
    }

    private showTip(event: MouseEvent, b: BinDatum, move = false): void {
        const args = {
            dataItems: this.tipItems(b),
            identities: b.indices.length && this.lastCatCol ? this.binSelIds(b, 1) : [],
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
        };
        if (move) this.host.tooltipService?.move(args);
        else      this.host.tooltipService?.show(args);
    }

    private drawPanel(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        p: PanelDatum, VW: number, VH: number, yMax: number, ctx: RenderCtx
    ): void {
        const s = this.settings;
        const bins = p.bins;
        if (!bins.length) return;
        // ── Adaptive layout ────────────────────────────────────────────────────
        // A fixed margin spends most of a small dashboard tile on chrome. Scale the
        // chrome with the viewport and drop whatever no longer earns its space.
        const compact = VW < 360 || VH < 240;
        const tiny    = VW < 240 || VH < 170;

        const fs = tiny    ? Math.max(8, s.axisFontSize - 3)
                 : compact ? Math.max(9, s.axisFontSize - 2)
                 : s.axisFontSize;

        const showXLabel    = s.showXLabel && !compact;
        const showYLabel    = s.showYLabel && !compact;
        // The cumulative line, its dots and the reference lines live on the 0–100%
        // scale. Without the right axis they were read against the left one and
        // looked wrong: a 52% first bar with its cumulative dot at "42%".
        const showRightAxis = true;
        const showSummary   = s.sumShow && VH >= 120 && VW >= 200;
        const sumFs         = compact ? Math.max(9, s.sumFontSize - 2) : s.sumFontSize;
        const summaryH      = showSummary ? sumFs + 10 : 0;

        const M = {
            top:    (tiny ? 10 : compact ? 16 : MARGIN.top) + summaryH,
            right:  tiny ? 30 : compact ? 36 : MARGIN.right,
            bottom: (tiny ? 26 : compact ? 40 : 52) + (showXLabel ? 16 : 0),
            left:   (tiny ? 28 : compact ? 38 : 48) + (showYLabel ? 16 : 0),
        };

        const W  = VW - M.left - M.right;
        const H  = VH - M.top  - M.bottom;
        if (W <= 0 || H <= 0) return;

        const { isHC, hcFg, hcBg, barColor, lineColor, axisColor, gridColor, dotColor, cmpBar, cmpLine } = ctx;

        if (showSummary) {
            const st = g.append("text").classed("pareto-summary", true)
                .attr("x", 0).attr("y", sumFs)
                .style("font-size", sumFs + "px")
                .style("fill", isHC ? hcFg : s.sumColor)
                .text(this.summaryText(p));
            this.fitText(st.node(), VW);
        }

        const hasHL    = bins.some(b => b.hlShare !== null);
        const padding  = Math.max(0.05, Math.min(0.4, s.barGap / 100));

        const gp = g.append("g")
            .attr("transform", `translate(${M.left},${M.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(bins.map(b => b.key))
            .range([0, W])
            .padding(padding);

        const yL = d3.scaleLinear()
            .domain([0, yMax])
            .range([H, 0]).nice();
        const yR = d3.scaleLinear().domain([0, 100]).range([H, 0]);

        // Grid lines
        gp.selectAll(".grid-line")
            .data(yL.ticks(6))
            .enter().append("line")
            .classed("grid-line", true)
            .attr("x1", 0).attr("x2", W)
            .attr("y1", d => yL(d)).attr("y2", d => yL(d))
            .attr("stroke", gridColor)
            .attr("stroke-width", isHC ? 1 : 0.5);

        // ABC zones (Pro): shaded behind everything, split at the exact entity where
        // the cumulative crosses each cut. The entity axis runs evenly from 0 to W, so
        // a fraction of entities maps straight to a position.
        if (p.abcA !== null && p.abcAB !== null && p.nEntities > 0) {
            const xA = W * p.abcA / p.nEntities;
            const xB = W * p.abcAB / p.nEntities;
            const zones = [
                { cls: "A", x0: 0,  x1: xA, n: p.abcA,                color: s.abcAColor },
                { cls: "B", x0: xA, x1: xB, n: p.abcAB - p.abcA,      color: s.abcBColor },
                { cls: "C", x0: xB, x1: W,  n: p.nEntities - p.abcAB, color: s.abcCColor },
            ].filter(z => z.x1 - z.x0 > 0.5);
            const zg = gp.append("g").classed("abc-zones", true).style("pointer-events", "none");
            zg.selectAll("rect").data(zones).enter().append("rect")
                .attr("x", z => z.x0).attr("y", 0)
                .attr("width", z => z.x1 - z.x0).attr("height", H)
                .attr("fill", z => isHC ? "none" : z.color)
                .attr("fill-opacity", 0.12)
                .attr("stroke", isHC ? hcFg : "none")
                .attr("stroke-dasharray", isHC ? "3,3" : null);
            if (s.abcLabels) {
                zg.selectAll("text").data(zones.filter(z => z.x1 - z.x0 > 34)).enter().append("text")
                    .attr("x", z => z.x0 + 4).attr("y", 11)
                    .style("font-size", "10px").style("font-weight", "700")
                    .style("fill", z => isHC ? hcFg : z.color)
                    .text(z => (z.x1 - z.x0 > 110)
                        ? this.tf("UI_AbcLabel", "{0} · {1} of entities", z.cls, this.pct(100 * z.n / p.nEntities, 1))
                        : z.cls);
            }
        }

        // Axes
        const xAxis = gp.append("g").classed("axis", true)
            .attr("transform", `translate(0,${H})`)
            .call(d3.axisBottom(xScale).tickFormat(k => {
                const lab = bins.find(b => b.key === k)?.label ?? "";
                return lab.length > 16 ? lab.slice(0, 15) + "…" : lab;
            }));
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

        const yAxisL = gp.append("g").classed("axis", true)
            .call(d3.axisLeft(yL).ticks(6).tickFormat(d => this.pct(Number(d), 0)));
        yAxisL.selectAll("text").style("fill", axisColor).style("font-size", fs + "px");
        yAxisL.selectAll("line, path").style("stroke", axisColor);

        if (showRightAxis) {
            const yAxisR = gp.append("g").classed("axis", true)
                .attr("transform", `translate(${W},0)`)
                .call(d3.axisRight(yR).ticks(tiny ? 2 : compact ? 3 : 5).tickFormat(d => this.pct(Number(d), 0)));
            yAxisR.selectAll("text").style("fill", axisColor).style("font-size", fs + "px");
            yAxisR.selectAll("line, path").style("stroke", axisColor);
        }

        // Axis labels
        if (showYLabel) {
            gp.append("text")
                .attr("transform", `rotate(-90)`)
                .attr("x", -H / 2).attr("y", -(M.left - 14))
                .attr("text-anchor", "middle")
                .style("font-size", fs + "px").style("fill", axisColor)
                .text(this.t("UI_AxisY", "% of total value"));
        }
        if (showXLabel) {
            gp.append("text")
                .attr("x", W / 2).attr("y", H + M.bottom - 10)
                .attr("text-anchor", "middle")
                .style("font-size", fs + "px").style("fill", axisColor)
                .text(bins[0]?.named
                    ? (this.lastCatCol?.source?.displayName ?? "")
                    : this.t("UI_AxisX", "% of entities (best → worst)"));
        }

        // ── Bar fill resolution ────────────────────────────────────────────────
        // Precedence, highest first:
        //   1. high contrast   — meaning may not be encoded in fill
        //   2. IBCS mode       — standardized neutral palette
        //   3. threshold colors — explicit opt-in, applies to every bar
        //   4. a single colour across every category — a constant the user picked
        //   5. fx rule color   — resolved per bin from its top-ranked entity
        //   6. the constant Bar color from metadata.objects
        const crossingIdx = s.thShow
            ? bins.findIndex(b => b.cumPct >= Math.min(100, Math.max(0, s.thValue)))
            : -1;

        const binFill = (b: BinDatum, i: number): string => {
            if (isHC) return barColor;
            if (s.ibcsMode) return barColor;
            if (s.thShow) {
                if (s.thHighlightCrossing && i === crossingIdx) return s.thCrossingColor;
                if (crossingIdx === -1) return s.thWithinColor;
                return i <= crossingIdx ? s.thWithinColor : s.thBeyondColor;
            }
            // La constante del usuario va antes que el color por bin: si solo hay un
            // color en los objects, no hay regla que respetar y pintarlo bin a bin
            // dejaria fuera las categorias sin objects entregados.
            if (this.uniformBarColor) return this.uniformBarColor;
            return b.ruleColor ?? barColor;
        };

        // Comparison bars sit behind and to the left of the current ones, the IBCS
        // way of drawing a previous period: the eye reads the pair, not two charts.
        const cmpBars = p.hasCmp && s.cmpShowBars;
        const band    = xScale.bandwidth();
        const curW    = cmpBars ? band * 0.78 : band;
        const curX    = (b: BinDatum) => xScale(b.key) + (cmpBars ? band - curW : 0);
        const barTop  = (b: BinDatum) => yL(Math.max(b.pctShare, cmpBars && b.cmpShare != null ? b.cmpShare : 0));

        if (cmpBars) {
            gp.selectAll(".cmp-bar")
                .data(bins.filter(b => b.cmpShare != null))
                .enter().append("rect")
                .classed("cmp-bar", true)
                .attr("x",      b => xScale(b.key))
                .attr("y",      b => yL(b.cmpShare as number))
                .attr("width",  curW)
                .attr("height", b => Math.max(0, H - yL(b.cmpShare as number)))
                .attr("fill",   s.ibcsMode && !isHC ? "#FFFFFF" : cmpBar)
                .attr("fill-opacity", s.ibcsMode || isHC ? 1 : 0.35)
                .attr("stroke", cmpBar)
                .attr("stroke-width", isHC ? 2 : 1)
                .style("pointer-events", "none");
        }

        // A knockout under each current bar where it overlaps the comparison bar:
        // the current bar is translucent (Bar opacity), and the grey showing through
        // split every bar into two blues.
        if (cmpBars) {
            gp.selectAll(".bar-knockout")
                .data(bins)
                .enter().append("rect")
                .classed("bar-knockout", true)
                .attr("x",      b => curX(b))
                .attr("y",      b => yL(b.pctShare))
                .attr("width",  curW)
                .attr("height", b => Math.max(0, H - yL(b.pctShare)))
                .attr("fill",   isHC ? hcBg : "#FFFFFF")
                .style("pointer-events", "none");
        }

        // Bars
        const bw = s.borderWidth > 0 ? s.borderWidth : 0;
        const borderStroke = this.resolveColor(s.borderColor, hcFg, isHC);

        gp.selectAll(".bar")
            .data(bins)
            .enter().append("rect")
            .classed("bar", true)
            .attr("x",      b => curX(b))
            .attr("y",      b => yL(b.pctShare))
            .attr("width",  curW)
            .attr("height", b => Math.max(0, H - yL(b.pctShare)))
            .attr("fill",   (b, i) => binFill(b, i))
            .attr("opacity", hasHL ? s.barOpacity * 0.3 : s.barOpacity)
            .attr("stroke",       (bw > 0 || isHC) ? borderStroke : "none")
            .attr("stroke-width", isHC ? 2 : bw)
            .style("cursor", "pointer");

        // Highlight from another visual: the part of each bar that belongs to the
        // highlighted entities, opaque, over the dimmed full bar.
        if (hasHL) {
            gp.selectAll(".bar-hl")
                .data(bins.filter(b => (b.hlShare ?? 0) > 0))
                .enter().append("rect")
                .classed("bar-hl", true)
                .attr("x",      b => curX(b))
                .attr("y",      b => yL(b.hlShare as number))
                .attr("width",  curW)
                .attr("height", b => Math.max(0, H - yL(b.hlShare as number)))
                .attr("fill",   (b, i) => binFill(b, bins.indexOf(b)))
                .attr("opacity", s.barOpacity)
                .style("pointer-events", "none");
        }

        // Value labels (Pro)
        let labelH = 0;
        if (s.showLabels && this.previewOf("value labels")) {
            const labelColor = this.resolveColor(s.labelColor, hcFg, isHC);
            const lfs = Math.max(7, Math.min(s.labelFontSize, curW * 0.4));
            labelH = lfs + 2;
            gp.selectAll(".bar-label")
                .data(bins)
                .enter().append("text")
                .classed("bar-label", true)
                .attr("x", b => curX(b) + curW / 2)
                .attr("y", b => barTop(b) - 4)
                .attr("text-anchor", "middle")
                .style("font-size", lfs + "px")
                .style("fill", labelColor)
                .text(b => s.showPercent ? this.pct(b.pctShare, 1) : this.formatter("0.0").format(b.pctShare));
        }

        // Change pills (Pro): the change in each bar's share, in percentage points.
        // pp, not %: going from a 20% share to 23% is +3 pp, while "+3%" would read
        // as a 3% relative growth. Hidden when they do not fit the bars at all.
        if (p.hasCmp && s.cmpShowPills) {
            const pfs = Math.max(8, Math.min(10, fs - 1));
            const texts = bins.map(b => b.cmpShare != null ? this.pp(b.pctShare - b.cmpShare) : "");
            const longest = d3.max(texts, x => x.length) ?? 0;
            const pillW = longest * pfs * 0.58 + 8;
            if (pillW <= xScale.step() + 2) {
                const pill = gp.selectAll(".cmp-pill")
                    .data(bins.map((b, i) => ({ b, txt: texts[i] })).filter(d => d.txt))
                    .enter().append("g").classed("cmp-pill", true)
                    .attr("transform", d =>
                        `translate(${xScale(d.b.key) + band / 2},${barTop(d.b) - 4 - labelH - (pfs + 4) / 2})`)
                    .style("pointer-events", "none");
                const deltaOf = (b: BinDatum) => b.pctShare - (b.cmpShare as number);
                pill.append("rect")
                    .attr("x", -pillW / 2).attr("y", -(pfs + 4) / 2)
                    .attr("width", pillW).attr("height", pfs + 4)
                    .attr("rx", (pfs + 4) / 2)
                    .attr("fill", d => isHC ? hcBg : (deltaOf(d.b) >= 0.05 ? s.cmpUpColor : deltaOf(d.b) <= -0.05 ? s.cmpDownColor : "#8C8C8C"))
                    .attr("stroke", isHC ? hcFg : "none");
                pill.append("text")
                    .attr("text-anchor", "middle").attr("dy", "0.35em")
                    .style("font-size", pfs + "px").style("font-weight", "600")
                    .style("fill", isHC ? hcFg : "#FFFFFF")
                    .text(d => d.txt);
            }
        }

        // Cumulative line
        const centre = (b: BinDatum) => xScale(b.key) + band / 2;
        const lineGen = d3.line<BinDatum>()
            .x(b => centre(b))
            .y(b => yR(b.cumPct))
            .curve(d3.curveMonotoneX);

        // Comparison cumulative line, dashed, under the current one.
        if (p.hasCmp && s.cmpShowLine) {
            const cmpGen = d3.line<BinDatum>()
                .defined(b => b.cmpCum != null)
                .x(b => centre(b))
                .y(b => yR(b.cmpCum as number))
                .curve(d3.curveMonotoneX);
            gp.append("path")
                .datum(bins)
                .classed("cmp-line", true)
                .attr("fill", "none")
                .attr("stroke", cmpLine)
                .attr("stroke-width", isHC ? Math.max(s.lineWidth, 2) : Math.max(1, s.lineWidth - 0.5))
                .attr("stroke-dasharray", "5,4")
                .attr("d", cmpGen)
                .style("pointer-events", "none");
        }

        gp.append("path")
            .datum(bins)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", isHC ? Math.max(s.lineWidth, 2) : s.lineWidth)
            .attr("d", lineGen);

        if (s.showDots) {
            gp.selectAll(".cum-dot")
                .data(bins)
                .enter().append("circle")
                .attr("cx", b => centre(b))
                .attr("cy", b => yR(b.cumPct))
                .attr("r", isHC ? Math.max(s.dotRadius, 5) : s.dotRadius)
                .attr("fill", dotColor)
                .attr("stroke", isHC ? hcBg : "#fff")
                .attr("stroke-width", 1.5)
                .style("cursor", "crosshair")
                .on("mouseover", (event: MouseEvent, b: BinDatum) => this.showTip(event, b))
                .on("mousemove", (event: MouseEvent, b: BinDatum) => this.showTip(event, b, true))
                .on("mouseout", () =>
                    this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false })
                );
        }

        // Reference lines
        const refLines = [
            { show: s.showRef1, value: s.ref1Value, color: s.ref1Color, label: s.ref1Label },
            { show: s.showRef2, value: s.ref2Value, color: s.ref2Color, label: s.ref2Label },
            { show: s.showRef3 && this.previewOf("a third reference line"), value: s.ref3Value, color: s.ref3Color, label: s.ref3Label },
        ];

        refLines.forEach(ref => {
            if (!ref.show || ref.value <= 0 || ref.value >= 100) return;

            const refColor = this.resolveColor(ref.color, hcFg, isHC);
            const yH = yR(ref.value);

            this.drawDashedLine(gp, 0, W, yH, yH, refColor, 1.5);

            // Inside the plot, at the right end and just above the line. At x = -4 it
            // sat on top of the left axis tick labels and neither could be read.
            gp.append("text")
                .classed("ref-label", true)
                .attr("x", W - 4).attr("y", yH - 4)
                .attr("text-anchor", "end")
                .style("font-size", "10px").style("font-weight", "600").style("fill", refColor)
                .style("paint-order", "stroke").style("stroke", isHC ? hcBg : "#FFFFFF")
                .style("stroke-width", "3px").style("stroke-linejoin", "round")
                .text(ref.label || this.pct(ref.value, 0));

            const crossBin = bins.find(b => b.cumPct >= ref.value);
            if (crossBin) {
                const xV = centre(crossBin);
                this.drawDashedLine(gp, xV, xV, 0, H, refColor, 1.5, true);

                gp.append("text")
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
    }

    /**
     * Pointer, keyboard and ARIA for every bar of every panel, in one pass: the
     * whole chart stays a single Tab stop and the arrows walk the bars panel by
     * panel, in the same order as this.bins.
     */
    private wireBars(): void {
        const barSel = this.svg.selectAll<SVGRectElement, BinDatum>(".bar");
        const total  = this.bins.length;

        barSel
            .on("click", (event: MouseEvent, b: BinDatum) => {
                event.stopPropagation();
                this.toggleBinSelection(b, event.ctrlKey || event.metaKey);
            })
            .on("mouseover", (event: MouseEvent, b: BinDatum) => this.showTip(event, b))
            .on("mousemove", (event: MouseEvent, b: BinDatum) => this.showTip(event, b, true))
            .on("mouseout", () =>
                this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false })
            );

        // ── Accessibility ──────────────────────────────────────────────────────
        // The chart is a single Tab stop (roving tabindex); arrows move between
        // bins. capabilities.supportsKeyboardFocus is only honest with this here.
        this.svg
            .attr("role", "listbox")
            .attr("aria-multiselectable", "true")
            .attr("aria-label", this.panels.length > 1
                ? this.tf("UI_AriaChartMulti", "Pareto chart, {0} panels, {1} bins of ranked entities, highest contribution first.",
                    String(this.panels.length), String(total))
                : this.tf("UI_AriaChart", "Pareto chart. {0} bins of ranked entities, highest contribution first.", String(total)));

        this.focusedBin = Math.max(0, Math.min(this.focusedBin, total - 1));

        barSel
            .attr("role", "option")
            .attr("tabindex", (_d, i) => (i === this.focusedBin ? 0 : -1))
            .attr("aria-selected", b => (this.selectedBins.has(b.key) ? "true" : "false"))
            .attr("aria-label", b => {
                const p = this.panels[b.panel];
                const inPanel = p.bins.indexOf(b);
                let txt = (this.panels.length > 1 ? `${p.title}. ` : "") +
                    this.tf("UI_AriaBin", "Bin {0} of {1}. Entities {2}. {3} of total value. Cumulative {4}. {5} entities.",
                        String(inPanel + 1), String(p.bins.length), b.label,
                        this.pct(b.pctShare, 1), this.pct(b.cumPct, 1), this.int(b.nEntities));
                if (b.cmpShare != null && b.cmpCum != null) {
                    txt += " " + this.tf("UI_AriaCmp", "Comparison {0}, change {1}.",
                        this.pct(b.cmpShare, 1), this.pp(b.pctShare - b.cmpShare));
                }
                return txt;
            });

        const focusBin = (i: number): void => {
            const clamped = Math.max(0, Math.min(total - 1, i));
            this.focusedBin = clamped;
            barSel.attr("tabindex", (_d, j) => (j === clamped ? 0 : -1));
            (barSel.nodes()[clamped] as SVGRectElement | undefined)?.focus();
        };

        const openMenu = (event: Event, b: BinDatum): void => {
            const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
            const selId = b.indices.length && this.lastCatCol
                ? (this.binSelIds(b, 1)[0] ?? null)
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
                    case "End":                          focusBin(total - 1); break;
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
                    dataItems: this.tipItems(b),
                    identities: b.indices.length && this.lastCatCol ? this.binSelIds(b, 1) : [],
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

    /**
     * A BasicFilter over every entity in the given bins — plus, with small
     * multiples, a second one on the panel field, so clicking bin 1 of plant A
     * filters plant A's top entities and not the same customers in every plant.
     *
     * This is what makes bin filtering exact. selectionManager.select() needs one
     * selection ID per entity — each carrying a full scope identity — so a bin of
     * 3,000 customers either builds 3,000 heavy objects or gets capped and filters
     * a subset. A BasicFilter carries plain scalars instead, which is the same
     * mechanism native slicers use for large value lists, so there is no cap.
     *
     * Returns null when a column cannot be split into a table/column target —
     * drilldown levels and some model shapes do not expose one. The caller falls
     * back to selection IDs in that case, so behavior degrades to the previous
     * mechanism instead of breaking.
     */
    private buildBinFilter(bins: BinDatum[]): powerbi.IFilter | powerbi.IFilter[] | null {
        const cat = this.lastCatCol;
        if (!cat) return null;
        const target = this.columnTarget(cat.source);
        if (!target) return null;

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

        const basic = (t: { table: string; column: string }, vs: powerbi.PrimitiveValue[]) => ({
            $schema: "https://powerbi.com/product/schema#basic",
            filterType: 1,                    // FilterType.Basic
            target: t,
            operator: "In",
            values: vs,
        } as unknown as powerbi.IFilter);

        const entityFilter = basic(target, values);
        const panel = this.panels[bins[0].panel];
        if (!panel || panel.value === null || panel.value === undefined) return entityFilter;

        // Small multiples: the panel half is mandatory. Without a usable target the
        // entity filter alone would select those customers in every panel, so fall
        // back to selection IDs, which carry the panel in their scope.
        const pTarget = this.columnTarget(this.panelSource);
        if (!pTarget) return null;
        return [entityFilter, basic(pTarget, [panel.value])];
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
     * categories accumulates selectors — and honors the cap. With small multiples
     * each ID also carries the panel category, so it scopes to that panel only.
     *
     * NOTE: the cap means a bin holding more entities than `max` cross-filters
     * only the first `max` of them. Pre-grouping entities with a DAX quantile
     * column keeps bins well under it; see docs/TIPS-AND-HINTS.md.
     */
    private binSelIds(b: BinDatum, max: number = MAX_SEL_IDS_PER_BIN): ISelectionId[] {
        if (!this.lastCatCol || !b.indices.length) return [];
        const cat    = this.lastCatCol;
        const panCol = this.panels[b.panel]?.value !== null && this.panels[b.panel]?.value !== undefined
            ? this.lastPanCol : null;
        const out  = [] as ISelectionId[];
        const seen = new Set<string>();

        for (const i of b.indices) {
            if (out.length >= max) break;
            const key = String(cat.values[i]);
            if (seen.has(key)) continue;
            seen.add(key);
            let builder = this.host.createSelectionIdBuilder().withCategory(cat, i);
            if (panCol) builder = builder.withCategory(panCol, i);
            out.push(builder.createSelectionId());
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
        const hasHL   = this.bins.some(b => b.hlShare !== null);

        this.svg.selectAll<SVGRectElement, BinDatum>(".bar")
            .attr("opacity", b => {
                if (hasSel) return this.selectedBins.has(b.key) ? opacity : opacity * 0.25;
                if (hasHL)  return opacity * 0.3;   // the highlighted part is drawn on top
                return opacity;
            });
    }


    /** Says why a click did nothing, and what lever fixes it. */
    private renderOversizedNotice(): void {
        this.container.selectAll(".oversized-notice").remove();
        const n   = this.int(this.oversizedSelection);
        const cap = this.int(MAX_FILTER_VALUES);

        const note = this.container.append("div")
            .classed("oversized-notice", true)
            .style("position", "absolute").style("left", "0").style("right", "0")
            .style("bottom", "0").style("padding", "8px 12px")
            .style("background", "#FDF3E7").style("border-top", "1px solid #E8A020")
            .style("font-size", "11px").style("color", "#7A4E12")
            .style("line-height", "1.4");

        note.append("div").text(this.tf("UI_Oversized",
            "This bin holds {0} entities — more than the {1} Power BI can cross-filter at once.", n, cap));
        note.append("div").text(
            this.isPro
                ? this.t("UI_OversizedPro", "Reduce the bin size (Pareto → Bin size %) so each bar covers fewer entities.")
                : this.t("UI_OversizedFree", "Pro lets you reduce the bin size so each bar covers fewer entities."));

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
            .text(this.tf("UI_Loading", "Loading data… {0} rows", this.int(loadedCount)));
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

        hint.append("span").text(this.t("UI_LandingAdd", "Add an "));
        hint.append("b").text(this.t("Role_category", "Entity"));
        hint.append("span").text(this.t("UI_LandingMid", " (customer/product) and a "));
        hint.append("b").text(this.t("Role_measure", "Value"));
        hint.append("span").text(this.t("UI_LandingEnd", " (sales/revenue)"));
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

    public destroy(): void {
        // Un timeout vivo sobre un visual retirado dispararía un aviso de compra
        // sin visual al que pertenecer.
        this.cancelLicenseIcon();
        this.container.remove();
    }
}
