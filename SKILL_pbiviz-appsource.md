---
name: "pbiviz-appsource"
description: "Guía experta para crear, configurar, versionar y publicar custom visuals de Power BI en Microsoft AppSource (Partner Center). Actívala siempre que el usuario mencione: pbiviz, Power BI visual, AppSource, Partner Center, certificación de Power BI, capabilities.json, pbiviz.json, IVisualLicenseManager, pbiviz package, compilar o empaquetar un visual, sacar una versión, rechazo de Microsoft, o cualquier problema de configuración, build, documentación o publicación de un visual de Power BI. También actívala cuando el usuario empiece a crear un visual nuevo desde cero."
---

# Power BI Custom Visuals — AppSource, Release Pipeline & Certificación

Conocimiento acumulado de los visuales publicados por TCViz. Su objetivo es doble:
evitar los rechazos recurrentes de Microsoft, y **imponer un orden de release** para
que cada versión no se improvise.

---

# ⛔ REGLAS DURAS — leer antes de tocar nada

Estas reglas no se negocian. Romper cualquiera de ellas causa daño real
(informes rotos en producción, ofertas duplicadas, rechazos).

## 0. Build de producción — SOLO con confirmación explícita del usuario

**Nunca generes un build de producción (sin `_test`) de forma automática, "de paso",
ni como parte de un flujo normal.** La build de producción es la que se sube a
Microsoft/AppSource y afecta a todos los clientes.

- ✅ Build de producción: **solo** cuando el usuario dice explícitamente algo como
  "genera la versión para Microsoft", "build de producción", o "ya está listo para
  AppSource" — después de haber confirmado que las pruebas pasaron.
- ❌ No compilar producción tras un fix, mejora o cambio, aunque todo funcione.
- ❌ No compilar producción como "también te dejo la versión final" sin que se pida.

> **Flujo correcto:** build de test → usuario prueba en Power BI Desktop → usuario
> confirma que está listo → solo entonces, build de producción.
>
> Si el usuario no ha confirmado pruebas, la respuesta correcta es entregar el
> `_test.pbiviz` y esperar.

## 1. El GUID es INMUTABLE

Los visuales ya están publicados en AppSource. **El `guid` de `pbiviz.json` no se
cambia nunca.** Cambiarlo rompe todos los informes existentes que usan el visual y
crea una oferta distinta en AppSource.

- ✅ La **única** modificación permitida: añadir el sufijo `_test` al GUID real.
- ❌ Nunca inventar un GUID nuevo.
- ❌ Nunca "derivar" uno, ni generar un identificador alternativo, ni proponer un
  GUID distinto para una build paralela.

> Si necesitas una build abierta que conviva con la de AppSource, el mecanismo es
> `<guid-real>_test`. No hay otro.

## 2. Leer antes de escribir — fuentes de verdad

Antes de cualquier acción sobre un visual, **lee estos ficheros**. No preguntes lo
que está escrito, y no deduzcas lo que puedes leer:

| Dato | Dónde vive |
|---|---|
| `guid` | `pbiviz.json` → `visual.guid` |
| Versión local | `pbiviz.json` → `visual.version` |
| Plan ID / `spIdentifier` | `src/visual.ts` → constante `SP_IDENTIFIER` |
| Repo de GitHub | `pbiviz.json` → `visual.gitHubUrl` |
| URL de documentación | `pbiviz.json` → `visual.supportUrl` |
| Privacy URL | `pbiviz.json` → `visual.privacyTermsLink` |
| Features reales | `capabilities.json` + `src/settings.ts` |

**No crear un fichero de configuración adicional** con estos datos. Duplicar un
valor inmutable es exactamente cómo se acaba cambiando un GUID por accidente.

## 3. El código fuente vive en estado PRODUCCIÓN

El repositorio siempre contiene la versión que se publica:

- `isPro` resuelto por `licenseManager` (nunca forzado a `true`)
- `guid` sin sufijo
- Sin instrumentación de debug

El script de test **parchea → empaqueta → restaura**. Nunca al revés.

Motivo: la rama `certification` que revisa Microsoft debe reflejar exactamente lo
publicado. Si el fuente viviera en modo test, Microsoft leería código con la
licencia desactivada.

## 4. Las URLs publicadas son inmutables

`privacy.html`, `terms.html` y `support.html` viven **en la raíz del repo** porque
GitHub Pages sirve desde ahí y sus URLs ya están en `pbiviz.json` y en la oferta de
AppSource. Moverlas rompe enlaces vivos. Misma lógica que el GUID.

---

# 🔁 EL PIPELINE DE RELEASE

Cuando el usuario diga "compilamos", "sacamos versión", "vamos a publicar" o
similar, **este es el orden**. No saltes etapas ni las reordenes.

```
0. LEER          pbiviz.json + visual.ts + capabilities.json + settings.ts
1. BUILD TEST    ←── por defecto, siempre se empieza aquí
2. ⏸ PUERTA      el usuario prueba en Power BI Desktop
3. VERSIÓN       incrementar en pbiviz.json Y package.json
4. DOC AUDIT     contrastar documentación contra el código real
5. VÍDEO         avisar al usuario de grabarlo → esperar la URL
6. ENTREGABLES   generar todo, ya con versión y URL dentro
7. GIT           commit + rama certification
8. BUILD PROD    npx pbiviz package  ←── SOLO tras confirmación explícita
9. ENVÍO         checklist final de Partner Center
```

## Etapa 0 — Leer

Lee las fuentes de verdad de la tabla de arriba. Si el visual es nuevo, ve a la
sección **Visual nuevo** más abajo.

## Etapa 1 — Build de test (por defecto)

**Cualquier petición de compilar sin más produce una build de TEST.** Producción
solo cuando el usuario dice explícitamente que es para enviar a Microsoft.

`build-test.js` debe:
1. Guardar copia de `src/visual.ts` y `pbiviz.json`
2. Parchear el bloque de licencia por `this.isPro = true;`
3. Añadir `_test` al `guid`
4. `npx pbiviz package`
5. **Restaurar ambos ficheros**

El fallo típico: los bloques de texto que el script busca dejan de coincidir con el
fuente tras un cambio de código, y el script aborta con "no se encontró el bloque".
Si eso pasa, **actualiza el script para que coincida** — no cambies el fuente para
encajar con el script.

## Etapa 2 — Puerta de control ⏸

**Aquí paras.** El usuario prueba el `.pbiviz` de test en Power BI Desktop.

No generes documentación, no compiles producción, no toques git hasta que confirme
que está probado. Todo lo que viene después lleva el número de versión y la URL del
vídeo dentro; hacerlo antes obliga a retocar ficheros a posteriori.

## Etapa 3 — Versión

Incrementar sobre el número de `pbiviz.json`, que se asume al día:

- Bugfix → `1.0.0.3` → `1.0.0.4`
- Feature nuevo → `1.0.0.4` → `1.1.0.0`

Cambiar en **`pbiviz.json` y `package.json`**. Si no coinciden, el build puede
fallar en silencio.

> **Paso no saltable.** La fiabilidad de `pbiviz.json` como fuente de verdad depende
> de que la versión se suba en *cada* release. Si alguna vez se envía sin tocarla,
> el número deja de ser fiable para siempre.

## Etapa 4 — Auditoría de documentación ⚠️

**Obligatorio en cada release.** Este es el paso que más cerca ha estado de causar
un rechazo real.

Caso real: `support.html` describía un campo *Location* con códigos ISO, teselas
hexagonales, bubble overlay y 90+ submapas. El visual usa Latitude/Longitude y nada
de eso existía. Llevaba varias versiones así y no había ningún paso que lo detectara.

Contrasta **`capabilities.json` + `src/settings.ts`** (la verdad) contra:

- `support.html` — field wells, features, FAQ
- `privacy.html` — nombres de los data roles, rutas de red reales
- `terms.html` — qué incluye cada tier (¡las features Pro de pago deben estar!)
- La ficha de producto de la web (4 pestañas)
- `README.md`

Reporta las discrepancias al usuario antes de continuar. Presta atención especial a:

- Data roles que ya no existen o cambiaron de nombre
- Features listadas que nunca se implementaron
- Features Pro reales ausentes de los términos de licencia
- Límites numéricos desfasados (nº de filas, nº de campos)
- Fechas de "última actualización" antiguas

## Etapa 5 — Vídeo

Avisa al usuario de que grabe el vídeo de YouTube **antes** de generar los
entregables, y espera a que te pase la URL. Ofrécele el guion si lo quiere.

Si ya existe vídeo de una versión anterior y el visual no ha cambiado
sustancialmente, se reutiliza la URL.

## Etapa 6 — Entregables

Todos van a **`docs/`**, ya con la versión y la URL del vídeo dentro. **Se
sobrescriben** en cada release; el histórico lo da git.

```
/                          ← inmutable, servido por GitHub Pages
  privacy.html
  support.html
  terms.html
  CHANGELOG.md
  README.md

/docs                      ← entregables del release
  infographic.html
  CERTIFICATION-NOTES.md
  TIPS-AND-HINTS.md
  TIPS-AND-HINTS-PLAIN.txt
  WEBSITE-PRODUCT-PAGE.md
  YOUTUBE-DESCRIPTION.txt
  YOUTUBE-TAGS.txt
```

Lista completa en la sección **Entregables** más abajo.

## Etapa 7 — Git

```bash
git add -A
git commit -m "release: vX.X.X.X — <resumen>"
git push origin <rama-principal>

git checkout certification
git merge <rama-principal>
git push origin certification
git checkout <rama-principal>
```

**Comprueba siempre el nombre de la rama principal** con `git branch`. Puede ser
`master`, no `main`, y puede que el usuario esté ya *en* `certification`.

Verifica que la rama de certificación está limpia:

```bash
git ls-tree -r --name-only certification | grep -E "^(node_modules|dist|\.tmp)"
```

Debe salir vacío. Y `.gitignore` debe incluir esas tres rutas explícitamente
(Microsoft verifica ambas cosas por separado).

Si se añadieron antes del `.gitignore`, siguen trackeados:

```bash
git rm -r --cached .tmp dist node_modules
git commit -m "chore: remove build output from tracking"
```

Borra también restos tipo `visual_old.ts`, `*_backup.ts` o carpetas de pruebas: en
la rama de certificación generan preguntas.

## Etapa 8 — Build de producción

**SOLO tras confirmación explícita del usuario de que las pruebas pasaron.**

Verifica primero:
- [ ] `isPro` resuelto por `licenseManager`, no forzado
- [ ] `guid` sin sufijo `_test`
- [ ] Versión subida en ambos ficheros
- [ ] `npx tsc --noEmit` limpio
- [ ] Sin instrumentación de debug (`grep` de `dbg`, `DEBUG`, `BUILD-`, `console.log`)

El `.pbiviz` sale en `dist/` con el nombre estándar `{guid}.{version}.pbiviz`. **No
lo renombres** — ese es el nombre que espera Partner Center.

## Etapa 9 — Envío

Checklist final más abajo.

---

# 🆕 VISUAL NUEVO

Cuando el usuario empiece un visual desde cero, además del pipeline normal:

## Iconos

Genera **300×300** y **36×36**.

> Nota: la documentación de Microsoft dice que `assets/icon.png` debe ser PNG de
> 20×20. En la práctica muchos visuales publicados llevan iconos mayores y pasan
> certificación. Si el usuario tiene visuales publicados con iconos grandes, esa
> evidencia manda sobre el documento. No bloquees por esto.

Si no hay entorno para generar PNG, entrega **SVG fuente + una página HTML con
botón de descarga** que exporte a PNG en ambos tamaños con `html2canvas` o
`canvas.toDataURL`. Mismo mecanismo que la infografía.

Diseño: paleta TCViz, motivo geométrico simple que se lea a 36px. Evita texto y
detalle fino — a tamaño pequeño desaparecen.

## Estructura inicial

- `capabilities.json` con las cinco flags obligatorias + `"privileges": []` desde el primer día
- Rendering events en `update()` desde el primer commit
- Las tres páginas web (`privacy`, `terms`, `support`) antes de la primera submission
- `.gitignore` con `node_modules/`, `dist/`, `.tmp/`
- `CHANGELOG.md`
- Plantillas de issues en `.github/ISSUE_TEMPLATE/`
- Rama `certification` creada y pusheada

## Plan ID

Solo alfanuméricos en minúscula, guiones o guión bajo. No puede terminar en
`-preview`. Patrón: `nombre-visual-tcviz`.

Debe coincidir **exactamente** con `SP_IDENTIFIER` en `visual.ts`.

---

# 🔧 CONFIGURACIÓN TÉCNICA — Visual nuevo desde cero

Errores de build recurrentes al iniciar un proyecto. Aplica todo desde el primer día.

## GUID — formato obligatorio

El GUID de `pbiviz.json` **no es un UUID estándar**. El plugin de webpack genera
directamente `var <guid>: IVisualPlugin`, por lo que los guiones del UUID estándar
(`19c93a62-d024-4c4a-ba15-3607b18dd398`) rompen como identificador JavaScript.

**Formato correcto:** `{visualName}{UUID_sin_guiones_MAYÚSCULAS}`

```json
"guid": "scatterMatrixF758D2720F0C432D83B6E2604BBEC3BE"
```

Así lo genera `VisualGenerator.js` internamente:
```js
// lib/VisualGenerator.js línea 180:
return crypto.randomUUID().replace(/-/g, '').toUpperCase();
// línea 46:
guid: name + VisualGenerator.generateVisualGuid()
```

Si usas un UUID con guiones, el error es `Package wasn't created. {}` sin más detalle.

## `tsconfig.json` — configuración mínima correcta

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "target": "ES6",
    "lib": ["ES6", "DOM"],
    "strict": false,
    "noImplicitAny": false,
    "sourceMap": true,
    "types": [],
    "moduleResolution": "node",
    "outDir": ".tmp/drop"
  },
  "files": ["src/visual.ts"]
}
```

Reglas críticas:

- **`"files"` no `"include"`** — `WebPackWrap.js` lee `tsconfig.files[0]` directamente
  (línea 141). Con `"include"`, `files` es `undefined` → `TypeError: Cannot read
  properties of undefined (reading '0')` en línea 141.
- **`"types": []`** — TypeScript auto-carga todos los `@types` instalados en
  `node_modules` si no se le dice lo contrario. Los tipos de `body-parser`, `node` y
  otros producen decenas de errores de compilación en cascada.
- **`"moduleResolution": "node"`** — necesario para que TypeScript resuelva
  `powerbi-visuals-api` correctamente después de añadir `"types": []`.
- **`"outDir": ".tmp/drop"`** — sin este campo, `WebPackWrap.js` evalúa
  `modules = typeof tsconfig.compilerOptions.outDir !== "undefined"` como `false`.
  Con `modules: false`, el método `_beforeCompile` del plugin de webpack llama a
  `callback()` dos veces: una inmediatamente y otra al generar `visualPlugin.ts`.
  El doble callback es un error fatal de webpack → `Package wasn't created. {}`.
- **`"lib": ["ES6", "DOM"]`** — no uses métodos ES2017+ como `String.padStart()` con
  esta configuración: da `TS2550`. Si los necesitas, usa helpers manuales o añade
  `"ES2017"` al array `lib`. Preferible usar helpers manuales para no cambiar el target.

## El error `Package wasn't created. {}`

El `{}` viene de `JSON.stringify(new Error("mensaje"))` que devuelve `"{}"` porque
las propiedades de `Error` no son enumerables. El error real está completamente oculto.

Causas confirmadas, en orden de frecuencia:

1. **`outDir` ausente en tsconfig** → `modules: false` → double-callback en webpack
2. **GUID con guiones** → identificador JavaScript inválido en `visualPlugin.ts`
3. **`assets/icon.png` inexistente** → el constructor del plugin hace
   `fs.readFileSync(path.join(process.cwd(), options.assets.icon))` síncronamente.
   Si el archivo no existe, lanza un Error que se silencia en el mismo `{}`.

Diagnóstico sin output útil:
1. Comprueba que `npx tsc --noEmit` pasa limpio
2. Comprueba que `.tmp/precompile/visualPlugin.ts` existe y el identificador no tiene guiones
3. Comprueba que `assets/icon.png` existe en el directorio del proyecto

## ESLint en pbiviz — reglas y cómo suprimirlas

`pbiviz` imprime `"Using recommended eslint config"` cuando el proyecto no tiene
la configuración exacta que espera. En ese modo, **ignora completamente
`.eslintrc.json`** del proyecto. La única forma de suprimir reglas es con comentarios
inline en el código fuente:

```typescript
/* eslint-disable powerbi-visuals/no-inner-outer-html */
wrapper.innerHTML = svgString;
/* eslint-enable powerbi-visuals/no-inner-outer-html */
```

**No uses `@typescript-eslint/...` en los comentarios de disable.** Si ese plugin
no está en la configuración recomendada de pbiviz, el propio comentario genera un
error nuevo: `"Definition for rule '@typescript-eslint/...' was not found"`.

Regla más frecuente en visuals SVG: `powerbi-visuals/no-inner-outer-html`.

## Tipos problemáticos en powerbi-visuals-api 5.x

`ILicenseManager` no existe en la API 5.x. Usa `any`:

```typescript
// ✅ Correcto
private licenseManager: any; /* IVisualLicenseManager */

// En el constructor:
this.licenseManager = (options.host as any).licenseManager;
```

`ITooltipServiceWrapper` **no existe** en `powerbi-visuals-api` 5.x como tipo directamente
importable, y `powerbi.extensibility.utils.tooltip` no está disponible a menos que
instales `powerbi-visuals-utils-tooltiputils` por separado. Usa `host.tooltipService`
directamente — es `ITooltipService` y tiene `show()`, `hide()`, `move()`:

```typescript
// ❌ No funciona sin instalar utils separados:
private tooltipService: powerbi.extensibility.ITooltipServiceWrapper;
this.tooltipService = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper(...);

// ✅ Correcto — API nativa directa:
this.host.tooltipService.show({
    dataItems: items as any,
    identities: [selectionId],
    coordinates: [x, y],
    isTouchEvent: false
});
this.host.tooltipService.hide({ immediately: false, isTouchEvent: false });
```

`VisualTooltipDataItem` puede generar conflictos de tipo al pasar items al servicio
de tooltips. Usa una interfaz local y castea a `any`:

```typescript
interface TooltipItem {
    displayName: string; value: string; header?: string; color?: string;
}
// ...
this.host.tooltipService.show({
    dataItems: d.tooltips as any,
    identities: [d.selectionId],
    coordinates: [rc.left + rc.width / 2, rc.top],
    isTouchEvent: false
});
```

## Patrón ISPRO_MARKER para build-test.js

Para que `build-test.js` pueda parchear el modo Pro sin buscar bloques de código
frágiles, marca la línea del inicializador con un comentario exacto:

```typescript
private isPro: boolean = false; // ISPRO_MARKER
```

El script busca esa cadena exacta y la reemplaza por `private isPro: boolean = true; // ISPRO_MARKER`.
Si la línea cambia de forma, actualiza el script — no cambies el fuente.

---

# 📦 ENTREGABLES

Todos a `docs/`, sobrescribiendo. Todos llevan la versión y la URL del vídeo.

## 1. `CERTIFICATION-NOTES.md`

El campo de Partner Center se borra en cada reenvío, por eso se guarda en el repo.

Debe cubrir: enlace a la rama `certification`, las tres URLs web, URL del vídeo,
validación de licencia (API oficial, sin servidor externo, resolución asíncrona que
no bloquea el render), features Free, features Pro, **privacidad y accesos de red**
(detallar cualquier `fetch`, lectura de ficheros locales o persistencia en el
`.pbix`), cumplimiento de requisitos de certificación, e instrucciones de testing
paso a paso para Free y para Pro.

## 2. `infographic.html`

Especificaciones en la sección **Infografía** más abajo.

## 3. `TIPS-AND-HINTS.md` + `TIPS-AND-HINTS-PLAIN.txt`

Para la página "Tips & Hints" del `.pbix` de muestra. Microsoft marca como *soft
failure* los envíos sin orientación de uso.

**Genera siempre las dos versiones.** Los text boxes de Power BI **no soportan
tablas markdown**: al pegar se pierde el formato. La versión `-PLAIN.txt` convierte
las tablas en listas alineadas con puntos guía, que sobreviven al copiar y pegar.

Bloques: Getting Started · Field Wells · Format Pane · Free vs Pro · Tips & Best
Practices · Funciones Pro · Example Configurations · Troubleshooting.

## 4. `WEBSITE-PRODUCT-PAGE.md`

Contenido para las cuatro pestañas de la ficha de producto en la web de TCViz:

- **Overview** — el problema que resuelve, cómo funciona, para quién es, en qué se
  diferencia, resumen de un vistazo
- **Features** — agrupadas por área, marcando cuáles son Pro, con tabla Free vs Pro
- **Technical** — specs, field wells, requisitos de ficheros externos, rendimiento,
  integración con Power BI, compatibilidad, licenciamiento, privacidad,
  dependencias, soporte
- **Changelog** — el mismo contenido que `CHANGELOG.md`

## 5. `YOUTUBE-DESCRIPTION.txt`

Descripción larga con capítulos (timestamps a `0:00` para que el usuario los
rellene), Free vs Pro, casos de uso, links, privacidad y hashtags. Más una versión
corta para Shorts/LinkedIn y 5 títulos alternativos.

## 6. `YOUTUBE-TAGS.txt`

Bloque principal dentro del límite de **500 caracteres** de YouTube, más variantes
según el enfoque del vídeo.

## 7. `CHANGELOG.md` (en la raíz)

Actualizar con la versión nueva: Added / Changed / Fixed / Documentation.

---

# ✅ CHECKLIST ANTES DE `pbiviz package`

## `capabilities.json` — flags obligatorias

```json
{
  "supportsHighlight": true,
  "supportsSynchronizingFilterState": true,
  "supportsLandingPage": true,
  "supportsKeyboardFocus": true,
  "supportsMultiVisualSelection": true,
  "privileges": []
}
```

Sin `supportsHighlight` y `supportsSynchronizingFilterState` el Filter-in no
funciona y Microsoft rechaza mostrando un vídeo de evidencia.

**Reglas para `capabilities.json` en pbiviz 5.6+:**

- **`"privileges": []` es obligatorio** — sin este campo el build da `"should have
  required property 'privileges'"` + `"Invalid capabilities"`. El `.pbiviz` se genera
  igualmente (soft error), pero hay que tenerlo para evitar el warning.
- **No pongas `$schema`** en `capabilities.json` — lo marca como propiedad adicional
  no válida: `"should NOT have additional properties"`.
- **Flags que NO van en `capabilities.json`:** `supportsBookmarkActions`,
  `supportsHierarchicalView`, `supportsReportTooltips`. En pbiviz 5.x estas propiedades
  no son válidas como top-level de capabilities y causan `"Invalid capabilities"`.
  Se configuran por otros mecanismos (objetos, código) o simplemente se omiten.

## Rendering events — rechazo automático si faltan

```typescript
public update(options: VisualUpdateOptions): void {
    this.events.renderingStarted(options);
    try {
        // ... lógica
        this.events.renderingFinished(options);
    } catch (e) {
        this.events.renderingFailed(options, String(e));
    }
}
```

`this.events = options.host.eventService;` en el constructor.

**Todos los caminos de salida** de `update()` deben llamar a `renderingFinished`,
incluidos los `return` tempranos.

## Filter-in

Power BI no filtra vía `selectionManager` — filtra pasando menos filas en
`update()`. Los elementos sin datos deben verse **dimmed**:

```typescript
element.style.opacity = hasHighlights && !isHighlighted ? '0.3' : '1';
```

En `matrix`, el highlight vive en `values[idx].highlight`. Con `table` el highlight
nativo no está soportado: implementa tu propio dimming.

## URLs

`privacyTermsLink` y `supportUrl` en `pbiviz.json`, y las páginas **activas** en
GitHub Pages. Si no cargan → rechazo inmediato.

Ojo: `pbiviz.json` no tiene campo para `terms.html` aunque la documentación lo
referencie. Verifica que existe igualmente.

---

# 🐛 ERRORES QUE ROMPEN EL VISUAL EN SILENCIO

## `ServicePlanState` es un `const enum`

No se puede referenciar como `powerbi.extensibility.ServicePlanState.Active` — da
`TS2339`. Y comparar contra el string `"Active"` da `TS2367`. Usa el valor numérico:

```typescript
p => p.spIdentifier === "mi-plan-tcviz" &&
     (p.state as unknown as number) === 1 /* ServicePlanState.Active */
```

## `getAvailableServicePlans()` devuelve `IPromise2`, no `Promise`

Encadenar `.catch()` directamente da `TS2741`. Envuélvelo:

```typescript
new Promise<boolean>(resolve => {
    licenseManager.getAvailableServicePlans().then(
        (result: any) => { resolve(isPro); },
        () => resolve(false)
    );
});
```

## `persistProperties` y `selector`

`selector: null` y `selector: undefined` dan error de tipos. Usa `{}` — `Selector`
es una interfaz vacía:

```typescript
this.host.persistProperties({
  merge: [{ objectName: "misSettings", selector: {}, properties: { ... } }]
});
```

## `animation-fill-mode: both` deja el visual invisible

Aplica el keyframe `from` antes de que la animación arranque, y las animaciones CSS
no arrancan si el elemento se pinta en un contenedor aún no visible — justo lo que
pasa al cambiar de página. El DOM está correcto pero congelado en `opacity: 0`.

❌ `animation: fade-in 0.2s ease both;`
✅ `opacity: 1; animation: fade-in 0.2s ease;`

**Síntoma delator:** el visual aparece al redimensionarlo. Si un resize lo arregla,
sospecha del CSS antes que de los datos.

## `dataViewMappings` inválido → `dataView.matrix` no se genera

Claves no válidas dentro del mapping lo invalidan entero. No da error de build ni
de lint. `rowSubtotals` / `columnSubtotals` **no** son claves del mapping `matrix`;
van en `objects`.

**Síntoma:** `matrix` es `undefined` en updates de tipo Data.

## Matrix sin agrupación devuelve un hijo anónimo

Aunque no haya campo de agrupación, `rows.root.children` trae un hijo sin `value`.
Detectar small multiples por `children.length > 0` etiqueta mal la tarjeta.

```typescript
const hasGrouping = (rows?.levels?.length ?? 0) > 0
    && rows?.root?.children?.[0]?.value !== undefined;
```

## `allowInteractions` no está tipado

Existe en runtime pero no en los tipos de `powerbi-visuals-api` 5.x:

```typescript
if ((this.host as any).allowInteractions === false) return;
```

## El constructor no debe resetear `isPro`

Si el constructor hace `this.isPro = false`, sobrescribe el inicializador de campo
y el modo test no funciona nunca.

---

# ⚡ RENDIMIENTO

Patrones que han resuelto problemas reales de lentitud:

## Construir SVG como string, no nodo a nodo

Crear miles de nodos con `createElementNS` es órdenes de magnitud más lento que
construir un string y asignarlo a `innerHTML` en una sola operación.

## Delegación de eventos

Un listener en la raíz del SVG, no uno por celda. Identifica el elemento con
`e.target.closest("[data-x]")` o por hit-testing aritmético desde `offsetX/offsetY`.

## Cachear el escaneo de datos por `dataView`

El paso caro (filas → celdas, construcción de `selectionId`) solo debe re-ejecutarse
cuando Power BI entrega datos nuevos. Cambiar colores o fuentes debe reutilizar la
caché:

```typescript
if (dataView !== this._lastDataView || this._cache === null) {
    this._lastDataView = dataView;
    this._cache = this.buildExpensiveThing(dataView);
}
```

## Prefiltro por bounding box antes de geometría

En cualquier test punto-en-polígono, precalcula el bbox de cada polígono al
decodificar y descarta con cuatro comparaciones antes de entrar al ray-casting.
Elimina la gran mayoría de los tests caros.

```typescript
const [minX, maxX, minY, maxY] = feature.bbox;
if (x < minX || x > maxX || y < minY || y > maxY) continue;
if (pointInFeature(x, y, feature)) { /* ... */ }
```

## Estado de selección que sobrevive al re-render

`svg.innerHTML = ""` borra los atributos `data-selected`. Guarda la selección en
variables de instancia y restáurala tras cada render:

```typescript
private _selectedCell: {col:number,row:number} | null = null;

private restoreSelectionState(): void {
    if (!this.selectionManager.hasSelection()) return;
    // volver a marcar el elemento desde _selectedCell
}
```

---

# 🔀 UPDATES PARCIALES Y REPINTADO

Power BI envía updates donde solo llegan algunos roles, o donde el matrix viene sin
sources. Repintar con esos datos borra lo que ya se mostraba.

**Pon la invariante en `render()`, no en cada llamador.** Hay múltiples rutas
re-entrantes (reintento de layout, resize, callback de licencia).

```typescript
private render(data: Data[]): void {
    // INVARIANTE: si ya se pintaron datos reales, nunca repintar vacío
    if (data.length === 0 && this.hasRenderedData) return;
}
```

## Swap atómico

**Nunca** limpies el container al principio de `render()`. Si algo lanza después,
el visual queda en blanco. Construye en memoria y haz el swap al final:

```typescript
while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
this.container.appendChild(root);
```

No metas nada entre el `while` y el `appendChild`.

---

# 🔍 DEPURACIÓN — aísla antes de tocar código

**Ignorar esta sección costó una sesión entera de ocho intentos fallidos.**

Cuando un visual falle de forma rara (se vacía al cambiar de página, pierde valores,
se ve en blanco), lo primero **no** es leer el código.

## El test de las dos variables

Compila el mismo código dos veces, cambiando solo el sufijo del guid:

- **A (`guid`) falla y B (`guid_test`) funciona** → el problema no está en el código.
  Es del entorno: caché de Power BI, conflicto con la versión instalada desde
  AppSource, o control de derechos sobre el guid de una oferta publicada. **Deja de
  depurar código inmediatamente.**
- **Ambos fallan igual** → el bug es real. Sigue con la instrumentación.

## El test de la versión anterior

```bash
git stash && npx pbiviz package
```

Si una versión anterior, escrita antes de tocar nada, también falla, ningún cambio
que hagas ahora lo va a arreglar. Es ambiental.

> **Nota honesta:** la causa exacta del comportamiento distinto por guid no está
> confirmada. No la afirmes como demostrada. Lo accionable es la regla.

## Marcador de build

Antes de depurar nada, confirma que Power BI ejecuta el código recién compilado:

```typescript
const marker = document.createElement("div");
marker.textContent = "BUILD-X1";   // cambia el número en cada build
marker.style.cssText = `position:absolute;top:2px;left:4px;font:700 10px monospace;
  color:#fff;background:#C96442;padding:1px 5px;border-radius:3px;z-index:9999`;
root.appendChild(marker);
```

Si no aparece, estás mirando código viejo. Para forzar recarga: borra el visual del
lienzo, quítalo del panel, cierra Power BI Desktop por completo, reabre e importa.

**Quita todos los marcadores antes del build de producción.**

## Overlay de diagnóstico

El log debe verse dentro del visual, y a **nivel de módulo** (Power BI destruye el
contexto JS al cambiar de página; un log de instancia se pierde):

```typescript
const dbgLog: string[] = [];
let dbgN = 0;
function dbg(line: string): void {
    dbgLog.push(`${++dbgN}. ${line}`);
    if (dbgLog.length > 20) dbgLog.shift();
}
```

Si el contador reinicia a 1, Power BI recreó el módulo entero.

## ¿Quién vacía el contenedor?

```typescript
new MutationObserver(muts => {
    for (const m of muts) if (m.removedNodes.length > 0)
        dbg(`DEL by ${inOurRender ? "OUR render()" : "*** EXTERNAL ***"}`);
}).observe(this.container, { childList: true });
```

`EXTERNAL` significa que Power BI vacía el DOM por su cuenta: mira
`supportsLandingPage` y `supportsEmptyDataView`.

---

# 🔑 LICENCIAS — IVisualLicenseManager

**Regla de oro: la licencia nunca en el camino crítico del render.**

```typescript
private requestLicenseDeferred(): void {
    if (this.licenseRequested || this.isPro) return;
    this.licenseRequested = true;
    setTimeout(() => {
        try {
            resolveLicense(this.licenseManager).then(isPro => this.applyLicense(isPro));
        } catch (_) { /* stay on Free tier */ }
    }, 0);
}

/** Solo actúa Free → Pro. Si la licencia falla, no toca el DOM. */
private applyLicense(isPro: boolean): void {
    if (!isPro || this.isPro) return;
    this.isPro = true;
    if (this.lastDataView) {
        try { this.render(this.parseDataView(this.lastDataView)); } catch (_) { }
    }
}
```

Se invoca desde `update()` **tras** un render con datos.

Power BI recrea el contexto JS al cambiar de página: una caché a nivel de módulo no
sobrevive entre páginas.

---

# 🌐 PÁGINAS WEB (GitHub Pages)

En la **raíz** del repo, nunca en subcarpeta:

- `privacy.html` — sin cookies, sin datos externos. Debe documentar **todos** los
  accesos: `fetch` a URLs, lectura local de ficheros, persistencia en el `.pbix`.
- `terms.html` — Free vs Pro. **Las features Pro de pago deben estar listadas.** Si
  hay carga de ficheros de usuario, añadir cláusula de responsabilidad sobre los
  derechos de esos ficheros.
- `support.html` — quick start, field wells, format pane, FAQ, vídeo embebido,
  enlace a issues y a changelog.

Ruta: `https://<usuario>.github.io/<repo>/`

## Plantillas de issues

En `.github/ISSUE_TEMPLATE/`, formato **YAML form** (campos obligatorios), no
markdown:

- `bug_report.yml` — tier, entorno, versión del visual, versión de Desktop, pasos,
  datos, capturas, consola
- `feature_request.yml` — el problema antes que la solución, categoría, workaround
- `config.yml` — `blank_issues_enabled: false` + `contact_links` a docs, vídeo,
  licencias por email y changelog

Esto desvía las preguntas de uso y facturación fuera del tracker, y suma en la
puntuación de documentación de OKviz.

**Activar GitHub Issues** en Settings → Features, o el enlace de `support.html` da 404.

---

# 🎨 INFOGRAFÍA (`docs/infographic.html`)

## Especificaciones

- Ancho fijo `1366px`, sin `margin: auto`, sin centrado
- Alto visible `768px` (el contenido puede ser más alto)
- Todo dentro de `<div id="infographic">`; body con `background: #888`
- Botón de descarga PNG fijo arriba a la izquierda con
  `html2canvas` 1.4.1 desde cdnjs
- Fuentes: `'Segoe UI', system-ui, sans-serif` + Poppins 500/700 solo para el logo
- Iconos: Tabler `@tabler/icons-webfont@3.19.0`
- Print CSS: `@page { size: A4 landscape; margin: 0 }` con `print-color-adjust: exact`

## Paleta TCViz (obligatoria)

```css
--bg:#FAF9F5;  --bg2:#EDE9DE;  --bd:#F5F3ED;  --line:#DAD9D4;
--t1:#3D3929;  --t2:#535146;   --t3:#83827D;
--acc:#C96442; --accd:#B05730; --acc2:#9C87F5; --acc2l:#DBD3F0;
```

## Logo TCViz — SVG inline

Header con `id="g"`, footer con `id="gf"` para evitar conflictos de gradiente:

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 828 362" width="160" height="70">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#B05730"/>
    <stop offset="0.55" stop-color="#C96442"/>
    <stop offset="1" stop-color="#9C87F5"/>
  </linearGradient></defs>
  <g transform="translate(40,46)">
    <rect x="22" y="20" width="150" height="150" rx="30" fill="none" stroke="url(#g)" stroke-width="11"/>
    <g fill="url(#g)">
      <rect x="42" y="110" width="20" height="58" rx="5"/>
      <rect x="70" y="86" width="20" height="82" rx="5"/>
      <rect x="98" y="62" width="20" height="106" rx="5"/>
      <rect x="126" y="38" width="20" height="130" rx="5"/>
    </g>
  </g>
  <text x="258" y="246" font-family="Poppins,sans-serif" font-weight="700" font-size="196" letter-spacing="-4">
    <tspan fill="url(#g)">tc</tspan><tspan fill="#3D3929">viz</tspan>
  </text>
  <text x="264" y="306" font-family="Poppins,sans-serif" font-weight="500" font-size="31" letter-spacing="6.5" fill="#83827D">VISUALS TO POWER BI</text>
</svg>
```

## Estructura — 6 bloques verticales

1. **Header** — `auto 1fr auto`: logo | H1 (span naranja) + subtítulo | SVG ilustrativo 190×100
2. **Casos de uso** — "USE CASES" vertical + 6-8 iconos Tabler + callout naranja
3. **Cuerpo** — `1fr 200px 1fr`: Free (borde naranja) | círculo + 4 stat-pills | Pro (borde morado)
4. **Workflow** — 6-7 pasos con flechas + tagline en cursiva
5. **Grid inferior** — `1fr 1fr 1fr`: Key benefits | Tips | Format pane reference
6. **Footer** — logo pequeño 70×30 (`id="gf"`) + links Vídeo · Support · Privacy · Terms · GitHub

Si el usuario ya compartió el código del visual, extrae todo el contenido de ahí sin
preguntar.

---

# 🚀 CHECKLIST FINAL ANTES DE ENVIAR

- [ ] ¿Versión subida en `pbiviz.json` **y** `package.json`, por encima de la publicada?
- [ ] ¿GUID sin sufijo `_test`?
- [ ] ¿`isPro` resuelto por `licenseManager`, no forzado?
- [ ] ¿Rendering events en todos los caminos de `update()`?
- [ ] ¿Filter-in funciona (dimming)?
- [ ] ¿`SP_IDENTIFIER` coincide con el Plan ID de Partner Center?
- [ ] ¿Documentación auditada contra el código real?
- [ ] ¿Las tres URLs cargan en GitHub Pages?
- [ ] ¿GitHub Issues activado?
- [ ] ¿Rama `certification` actualizada, sin `node_modules`, `.tmp` ni `dist`?
- [ ] ¿`.gitignore` incluye esas tres rutas?
- [ ] ¿Sin instrumentación de debug ni marcadores de build?
- [ ] ¿Sin ficheros residuales (`*_old.ts`, `*_backup.*`)?
- [ ] ¿`.pbix` de muestra con página "Tips & Hints"?
- [ ] ¿Notas de certificación copiadas en Partner Center? (se borran solas)
- [ ] ¿Vídeo enlazado en support.html y en las notas?

---

# ❌ CAUSAS DE RECHAZO POR CÓDIGO

| Código | Causa | Solución |
|---|---|---|
| 1180.2.2 | Filter-in no funciona | Implementar highlight/dimming |
| 1200.1.4 | Error JS no controlado en `update()` | try/catch + `renderingFailed` |
| Auto-rechazo | Notas de certificación vacías | Rellenar antes de publicar |
| Auto-rechazo | Rama `certification` inexistente | `git checkout -b certification && git push` |
| Content policy | `.gitignore` sin `.tmp`/`dist`/`node_modules` | Añadir + `git rm -r --cached` |
| Soft failure | `.pbix` sin Tips & Hints | Añadir la página |
| Rechazo | Documentación describe features inexistentes | Auditoría de documentación |

---

# ⚠️ GOTCHAS DE ENTORNO

## `package.json` — versión debe ser semver estándar (3 dígitos)

`npm` exige semver estándar. Si `package.json` tiene `"version": "1.0.0.0"` (4 dígitos),
cualquier `npm install` falla con `"npm error Invalid Version"` sin más detalle.

- ✅ `package.json` → `"version": "1.0.0"` (3 dígitos, semver estándar)
- ✅ `pbiviz.json` → `"version": "1.0.0.0"` (4 dígitos, formato de Power BI)

Son ficheros distintos con formatos distintos. No sincronices el cuarto dígito en `package.json`.

**Síntoma delator:** `npm install <cualquier-paquete>` falla inmediatamente con
`"npm error Invalid Version"` sin mencionar qué paquete tiene el problema.

## OneDrive bloquea `git checkout`

Si el repo está en una carpeta sincronizada, `git checkout` puede entrar en bucle
con *"Deletion of directory 'X' failed. Should I try again? (y/n)"*.

Es OneDrive bloqueando la carpeta. Solución: pulsar `n`, pausar la sincronización
de OneDrive, cerrar ventanas del Explorador sobre esa carpeta, y reintentar. Si
persiste: `git checkout -f <rama>` o borrar la carpeta a mano.

## Timeout al empaquetar

`npx pbiviz package` puede tardar más de 3 minutos en entornos de sandbox. Si el
entorno tiene timeout corto, verifica la corrección con `npx tsc --noEmit`
(rápido) y deja que el usuario ejecute el empaquetado en su máquina, o usa
`timeout_ms: 600000` si el entorno lo permite.

---

# 📊 OKVIZ — puntuación independiente

Evalúa en 4 dimensiones: Adherence to Visual Type · Core Features · Design and
Performance · Documentation and Support.

**Patrón común:** Design suele ser lo más fuerte. Features y Docs son el cuello de
botella.

## Features que valora

| Feature | Impacto | Implementación |
|---|---|---|
| Tooltips estándar | Alto | `host.tooltipService` directamente (no usar ITooltipServiceWrapper) |
| Report tooltips | Alto | `supportsReportTooltips: true` + handler |
| Conditional formatting | Alto | `supportsConditionalFormatting: true` |
| Highlight behavior | Alto | `supportsHighlight: true` + dimming |
| Slicer sync (slicers) | Alto | `supportsSynchronizingFilterState: true` |
| Drilldown | Medio-Alto | `supportsHierarchicalView: true` + drill events |
| Dynamic format strings | Medio | Leer format string del dataView |
| Bookmarks | Medio | `supportsBookmarkActions: true` + persistencia |
| High contrast | Medio | `host.colorPalette.isHighContrast` |
| Keyboard focus | Medio | `supportsKeyboardFocus: true` + `tabIndex` |

## Interpretar una valoración

1. Extraer score global y por dimensión, Pros (no tocar) y Cons (el trabajo)
2. Mapear cada Con a una implementación técnica concreta
3. Priorizar: Features < 6 → tooltips + conditional formatting. Docs < 6 →
   changelog + issue tracker + FAQ (sin código, impacto inmediato). Design < 7 →
   espacio, accesibilidad, alineación con el tema
4. Presentar: score actual, gap al top, lista priorizada, impacto estimado, orden
   recomendado

| Score | Posición | Qué falta |
|---|---|---|
| < 5.0 | Cola | Features casi vacías, Docs pobres |
| 5.0 – 6.5 | Medio-bajo | Sin tooltips, sin conditional formatting |
| 6.5 – 7.5 | Medio-alto | Falta conditional formatting, accesibilidad |
| 7.5 – 8.5 | Top | Detalles de integración y Docs completas |
| > 8.5 | Líder | Features nativas completas, Docs excelentes |

---

# 🔧 CÓMO ACTUALIZAR ESTE SKILL

Cuando aparezca un problema nuevo, el usuario dirá:

> "Añade este problema al skill de Power BI AppSource: [descripción y solución]"

Añádelo a la sección que corresponda. Si es un error que rompe en silencio, incluye
**el síntoma delator**, no solo la solución: el síntoma es lo que permite
reconocerlo la próxima vez.

