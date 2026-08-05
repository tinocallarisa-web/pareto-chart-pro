/**
 * build-test.js
 * Genera un .pbiviz con isPro=true y guid_test para grabar vídeos y demos.
 * Uso: node build-test.js
 *
 * Qué hace:
 *   1. Guarda copia de visual.ts y pbiviz.json
 *   2. Parchea isPro = true y DEV_MODE = true en visual.ts
 *   3. Añade _test al guid en pbiviz.json
 *   4. Ejecuta pbiviz package
 *   5. Restaura ambos ficheros al estado original
 */

const fs    = require("fs");
const path  = require("path");
const { execSync } = require("child_process");

const ROOT        = __dirname;
const VISUAL_PATH = path.join(ROOT, "src", "visual.ts");
const PBIVIZ_PATH = path.join(ROOT, "pbiviz.json");

// ── Backups ───────────────────────────────────────────────────────────────────
const visualOrig = fs.readFileSync(VISUAL_PATH, "utf8");
const pbivizOrig = fs.readFileSync(PBIVIZ_PATH, "utf8");

let restored = false;
function restore() {
    if (restored) return;
    restored = true;
    fs.writeFileSync(VISUAL_PATH, visualOrig, "utf8");
    fs.writeFileSync(PBIVIZ_PATH, pbivizOrig, "utf8");
    console.log("✅  Ficheros restaurados.");
}
process.on("exit",    restore);
process.on("SIGINT",  () => { restore(); process.exit(1); });
process.on("SIGTERM", () => { restore(); process.exit(1); });

// ── Patch visual.ts ───────────────────────────────────────────────────────────
const ISPRO_FROM   = "    private isPro:           boolean = false;";
const ISPRO_TO     = "    private isPro:           boolean = true;";
const DEVMODE_FROM = "    private readonly DEV_MODE        = false;";
const DEVMODE_TO   = "    private readonly DEV_MODE        = true;";

let visualPatched = visualOrig;

if (!visualOrig.includes(ISPRO_FROM)) {
    console.error("❌  No se encontró el bloque isPro en visual.ts.");
    console.error("    Actualiza ISPRO_FROM en build-test.js para que coincida.");
    process.exit(1);
}
if (!visualOrig.includes(DEVMODE_FROM)) {
    console.error("❌  No se encontró el bloque DEV_MODE en visual.ts.");
    console.error("    Actualiza DEVMODE_FROM en build-test.js para que coincida.");
    process.exit(1);
}

visualPatched = visualPatched.replace(ISPRO_FROM, ISPRO_TO);
visualPatched = visualPatched.replace(DEVMODE_FROM, DEVMODE_TO);
fs.writeFileSync(VISUAL_PATH, visualPatched, "utf8");
console.log("🔧  visual.ts parcheado → isPro=true, DEV_MODE=true");

// ── Patch pbiviz.json ─────────────────────────────────────────────────────────
const pbiviz = JSON.parse(pbivizOrig);
const realGuid = pbiviz.visual.guid;

if (realGuid.endsWith("_test")) {
    console.error("❌  El guid ya tiene sufijo _test. Restaura pbiviz.json primero.");
    restore();
    process.exit(1);
}

pbiviz.visual.guid = realGuid + "_test";
fs.writeFileSync(PBIVIZ_PATH, JSON.stringify(pbiviz, null, "\t"), "utf8");
console.log(`🔧  pbiviz.json parcheado → guid: ${pbiviz.visual.guid}`);

// ── Build ─────────────────────────────────────────────────────────────────────
console.log("\n🚀  Ejecutando pbiviz package...\n");
try {
    execSync("pbiviz package", { cwd: ROOT, stdio: "inherit" });
    console.log("\n✅  Build de test completado.");
    console.log("    Fichero: dist/" + pbiviz.visual.guid + "." + pbiviz.visual.version + ".pbiviz");
} catch (e) {
    console.error("\n❌  Error en pbiviz package.");
}

// restore() se llama automáticamente en process.on("exit")
