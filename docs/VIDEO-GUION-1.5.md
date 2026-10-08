# Vídeo Pareto Chart Pro 1.5.0.0 — guion

**Build para grabar:** `dist/ParetoChartPro1A2B3C4D5E6F7A8B9C0D_test.1.5.0.0.pbiviz`, generada con
`node build-test.js --clean-name`: nombre real "Pareto Chart Pro", Pro activado, sin marca de agua.

**Datos:** `C:\tcviz\test_visuales\pareto_clientes_5000.csv` (5.000 clientes, ventas de este año y del
anterior, región, segmento y categoría). En el modelo, da a `Sales CY` y `Sales PY` formato moneda (€).

**Duración objetivo:** 5–6 minutos. Locución en inglés, frases cortas. Las cifras de abajo salen del
dataset: compruébalas en pantalla antes de decirlas.

---

## 0:00 — La pregunta (20 s)
**Pantalla:** el informe con el Pareto ya montado (Customer / Sales CY).
**Voz:** *"Everyone says 20% of customers make 80% of sales. Is it true for your business? Was it
more true last year? And is every region the same?"*

## 0:20 — Montarlo: dos campos, sin DAX (40 s)
**Pantalla:** visual vacío → `Customer ID` en Entity → `Sales CY` en Value.
**Señala:** la frase resumen: *"1,120 of 5,000 entities (22.4%) make 80% of the total"*.
**Voz:** *"Two fields, no DAX. And the answer, in words, counted customer by customer."*
Muestra el tooltip de la primera barra: el valor sale en € (formato del modelo).

## 1:00 — ¿Más concentrado que el año pasado? (70 s) — Pro
**Pantalla:** `Sales PY` en Comparison value.
**Señala:** barras grises detrás, línea discontinua, la pill **+1.9 pp** en la primera barra.
**Voz:** *"The top 20% of customers now make 1.9 points more of sales than the top 20% did last year.
Points, not percent: from 75.6 to 77.5."*
**Señala la frase:** *"comparison: 1,206 entities"* → *"86 fewer customers now carry 80% of the
business. More concentration, more exposure."*
Tooltip de la primera barra: comparison share, change in share.

## 2:10 — Una región se comporta distinto (60 s) — Pro
**Pantalla:** `Region` en Small multiples.
**Señala:** los seis paneles, mismo eje; **Canarias** con la pill en **rojo** (−3.7 pp).
**Voz:** *"Every region is getting more concentrated — except one."*
Clic en la primera barra de Canarias → la tabla de clientes / tarjetas se filtran a esa región.
**Voz:** *"One click: those customers, in that region."*

## 3:10 — Clasificación ABC (40 s) — Pro
**Pantalla:** quita Small multiples. Format → ABC zones → On.
**Señala:** las tres franjas y la etiqueta *"A · 22.4% of entities"*.
**Voz:** *"A, B and C, cut at the exact customer where the curve crosses 80 and 95%."*

## 3:50 — Drilldown y barras con nombre (40 s)
**Pantalla:** Entity = `Segment`, `Category`, `Customer ID`. Nivel Segment: 3 barras con nombre.
↓↓ a Category: 8 barras con nombre. ↓↓ a Customer: vuelven los bins.
**Voz:** *"With 30 entities or fewer, one bar each with its name — the classic Pareto. Above that,
bins, so 5,000 customers still read as five bars."*

## 4:30 — Con el resto del informe (35 s)
**Pantalla:** clic en *Convenience* en un gráfico de barras nativo → el Pareto muestra la parte
resaltada de cada barra.
**Voz:** *"Highlighting shows how much of each slice that category is. Want it recalculated instead?
Edit interactions, Filter."* (Enseña el icono de filtro y el Pareto recalculándose.)

## 5:05 — Accesible y en tu idioma (25 s)
**Pantalla:** Tab dentro del gráfico, flechas entre barras, Enter para filtrar, Escape para limpiar.
Si puedes, un plano rápido de Desktop en español: panel de formato y frase resumen en español.

## 5:30 — Free y Pro, cierre (20 s)
**Voz:** *"The free version is a complete Pareto with the summary sentence. Pro adds comparison, small
multiples and ABC zones — and you can try them on your own data before buying."*
**Pantalla:** despedida de marca (azul y verde).

---

## Después de subirlo

1. Pásame la URL **canónica**: `https://www.youtube.com/watch?v=<id>` (nunca youtu.be, /shorts ni
   /embed en Partner Center).
2. Hecho el 08-10-2026: publicado como https://www.youtube.com/watch?v=abzBwDW_wkE y cambiado el id viejo (`qtN0ckSXNZQ`) en todos los ficheros del repo que lo citaban: support.html
   (raíz y docs, en el iframe va como /embed/, que es correcto ahí), README, APPSOURCE-LISTING,
   notas de certificación, infografía, YOUTUBE-DESCRIPTION.
3. **Tú:** el campo de vídeo de la oferta en Partner Center. Editar el repo no lo cambia.
