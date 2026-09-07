# Video pipeline — Pareto Chart Pro

An evergreen tutorial: *how to do 80/20 analysis in Power BI*. It teaches the method with a real
business question and uses the visual as the tool. It does not go stale at 1.4, it reaches people
who have never heard of you, and it answers the criticism that there are no real-world scenario
guides. English, 7–8 minutes.

---

## 1 · Before you record

### The build
The normal test build renames the visual **"Pareto Chart Pro (TEST)"**, which would be on camera in
the visuals panel. Use the recording flag instead — it keeps the real name and still suffixes the
GUID so it never collides with the AppSource version:

```powershell
Remove-Item dist\*_test* -ErrorAction SilentlyContinue
node build-test.js --clean-name
```

### The data
`_testdata\pareto_500k_int.csv` — 500,000 customers, 4 channels, lognormal values.

Its concentration is known, which makes it a demo you cannot fumble:

| | |
|---|---|
| 4,72% of customers | 50% of value |
| **20,34% of customers** | **80% of value** |
| 34,91% | 90% |
| 49,09% | 95% |

Per channel — note **Field Sales: 10% of customers, 25% of value**, which is the punchline for the
slicer scene:

| Channel | Customers | % of value |
|---|---|---|
| Retail | 209,691 | 25,57% |
| Wholesale | 135,159 | 40,38% |
| Online | 105,002 | 9,03% |
| Field Sales | 50,148 | 25,01% |

### The report
Build it once, before recording, and let it load fully:

- Import the CSV in Desktop, import the `.pbiviz`, publish, and **record in the Service**. Desktop
  caps at 30,000 rows and would show the amber partial-data notice on camera.
- One page: the Pareto large on the left, a **table of `customer_id` + `sales_value`** on the right,
  a **channel slicer** top-right, and a card with the customer count.
- Set the bin size to **2%** before you start. At 500,000 entities that is 10,000 per bar — the
  largest that still cross-filters over a live connection. **Do not demo a click at 5% or 10%**; it
  will be slow or decline, and neither belongs in a tutorial.
- Turn off anything you are not going to talk about.

### The environment
1920×1080, browser at 100% zoom, no extensions bar, no notifications, clean bookmarks bar.
Close every other tab. Nothing personal on screen.

---

## 2 · Script

Timings are targets, not a metronome. What matters is the order: **question → method → answer →
what you do with it.**

### 0:00 – 0:35 · The question, not the product
Open on the report, no narration about the visual yet.

> "This company has half a million customers. The sales director has to decide where to put a team
> of twelve account managers. Which customers actually matter?"

Say the thing everyone assumes and nobody checks: *the 80/20 rule is a heuristic, not a law.* Some
businesses are 90/10, some are 60/40. The point of the analysis is finding out which one you are.

### 0:35 – 1:30 · Why this is hard natively
Very briefly — this is what makes people watch, but do not gloat.

The usual approach is a sorted column chart plus a DAX cumulative measure in a combo chart. Show
what half a million customers look like in a native bar chart: an unreadable wall.

> "The problem isn't the maths. It's that a chart with one bar per customer stops being a chart."

### 1:30 – 2:45 · Build it — two fields
Drag `customer_id` to **Entity**, `sales_value` to **Value**. That is the whole setup.

Explain the axis, because it is the one thing people misread:

> "The X axis isn't customers. It's *shares of customers*, ranked best to worst. The first bar is
> the top 2% of your customer base. That's what keeps this readable at any size."

Read the answer off the chart: with the reference line at 80%, the axis marks **~20%**.

> "Twenty percent of customers, eighty percent of the value. This business really is 80/20 — and now
> you know instead of assuming."

### 2:45 – 3:45 · Threshold Colors — make the answer obvious
`Format Pane → Threshold Colors → Color bars by threshold`.

Bars within the 80% threshold in one color, the rest muted, and the crossing bin highlighted.

> "This is the chart you put in front of a board. Nobody has to trace a line to find the crossing
> point — it's the orange bar."

Change the threshold to 50 and back to 80 to show it moves.

### 3:45 – 4:45 · The slicer — the scene that matters
Filter to **Field Sales**.

> "Ten percent of the customers, twenty-five percent of the value. Concentration isn't a property of
> the business — it's a property of the *segment*."

Say plainly that the ranking is recalculated on the filtered data, not a pre-computed grouping being
sliced. That is a real technical difference and it is worth one sentence.

Cycle through Online (diffuse) and Wholesale (concentrated) to show the curve change shape.

### 4:45 – 5:45 · Click through to the names
Clear the slicer. Click the first bar.

The table on the right fills with those 10,000 customers.

> "The chart gives you the shape. The click gives you the list. That's the handoff from analysis to
> action — these are the accounts the twelve managers get."

Mention the honest bit in one line: a bar holds thousands of entities, so bin size controls how many
you filter at once, and the documentation has the numbers. **Do not oversell it as unlimited.**

### 5:45 – 6:45 · Keyboard, and why an enterprise buyer cares
Click away, then **Tab** into the chart.

Arrow through the bins with the focus ring visible. `Enter` to select — the report filters exactly as
it did with the mouse. Show the tooltip appearing **on focus**.

> "Every bar announces its position, its share, the cumulative percentage and how many customers it
> holds. If your organisation has an accessibility policy, this is the part your procurement team
> asks about."

This is roughly thirty seconds and almost no competitor video has it. It will not win views; it wins
evaluations.

### 6:45 – 7:30 · Close
One sentence on Free vs Pro, no hard sell: everything shown works in Free except the bin size
control, and bin size is what you reduce as the model grows.

Point to the documentation for the scenario guides — customer concentration, SKU rationalisation,
defect prioritisation, supplier spend — and end on the AppSource link.

---

## 3 · Recording notes

- **Two passes.** Record the screen clean first, narrate over it after. Trying to talk and drive
  simultaneously is what makes demos feel nervous.
- **Let queries finish before you speak.** Silence while something loads is fine; talking over a
  spinner is not.
- **Do not apologise on camera** for anything being slow. If a step is slow, cut it or change the
  bin size so it is not.
- **Cursor.** Move deliberately, pause before clicking. Consider a click-highlight tool.
- If the amber partial-data notice appears, **stop** — you are in Desktop, or Power BI truncated.
  Fix it before continuing rather than explaining it away.

---

## 4 · After recording

- Thumbnail: the chart with Threshold Colors on, the crossing bar visible, and a short number as
  text — *"20% = 80%"*. No face, no arrows, no shouting.
- Chapters: use the section headings above, with real timestamps.
- Upload the description from `docs/YOUTUBE-DESCRIPTION.txt` and the tags from
  `docs/YOUTUBE-TAGS.txt`, both rewritten for this video.
- **Unlist the old video.** Its description claims *"Instant Cross-Filtering: Category deduplication
  eliminates DS0 errors"*, which describes the bug that filtered one entity per bar. Leaving it
  public is a claim you cannot defend.

## 5 · Wire the URL in

The new video ID has to replace the old one in five places, or the docs point at a video that
describes behaviour the visual no longer has:

- [ ] `support.html` — the `<iframe>` embed
- [ ] `README.md` — the video link at the top
- [ ] `docs/CERTIFICATION-NOTES.md` and `-SHORT.txt` — **Video Walkthrough**
- [ ] `docs/APPSOURCE-LISTING.md` — when it exists
- [ ] The AppSource offer listing itself, in Partner Center
