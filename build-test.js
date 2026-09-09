/**
 * build-test.js — Pareto Chart Pro
 *
 * Genera un .pbiviz de TEST que convive con la versión de AppSource:
 *   - GUID: ParetoChartPro1A2B3C4D5E6F7A8B9C0D_test
 *   - isPro = true (para probar funciones Pro sin licencia)
 *
 * Uso:
 *   node build-test.js                  Pro forzado, se llama "(TEST)"
 *   node build-test.js --free           tier Free real — el licenseManager no
 *                                       encuentra plan para el GUID de test, asi que
 *                                       resuelve a Free sin forzar nada. Es la unica
 *                                       forma de probar Free: con el GUID real, Power
 *                                       BI sirve la version de AppSource y no la tuya.
 *   node build-test.js --clean-name     conserva el nombre real, para grabar video
 *
 * El fuente queda SIEMPRE en estado producción (el script restaura al final).
 */

const fs            = require('fs');
const path          = require('path');
const { execSync }  = require('child_process');

const ROOT          = __dirname;
const PBIVIZ_JSON   = path.join(ROOT, 'pbiviz.json');
const VISUAL_TS     = path.join(ROOT, 'src', 'visual.ts');

const ORIGINAL_GUID = 'ParetoChartPro1A2B3C4D5E6F7A8B9C0D';
const TEST_GUID     = 'ParetoChartPro1A2B3C4D5E6F7A8B9C0D_test';
// The Free build needs its OWN guid. Sharing _test makes Power BI treat both builds
// as the same visual, so importing the second one does not show up as anything new
// and you keep looking at the first. Distinct guids let them coexist side by side.
const FREE_GUID     = 'ParetoChartPro1A2B3C4D5E6F7A8B9C0D_testfree';
const MARKER        = '// ISPRO_MARKER';

// ── Backup ────────────────────────────────────────────────────────────────────
const pbivizOrig = fs.readFileSync(PBIVIZ_JSON, 'utf8');
const visualOrig = fs.readFileSync(VISUAL_TS,   'utf8');

function restore() {
    fs.writeFileSync(PBIVIZ_JSON, pbivizOrig, 'utf8');
    fs.writeFileSync(VISUAL_TS,   visualOrig,  'utf8');
    console.log('✅  Ficheros restaurados al estado de producción.');
}

try {
    // ── Patch pbiviz.json ─────────────────────────────────────────────────────
    const pbiviz = JSON.parse(pbivizOrig);
    if (pbiviz.visual.guid !== ORIGINAL_GUID) {
        throw new Error(
            `GUID inesperado en pbiviz.json: "${pbiviz.visual.guid}"\n` +
            `Se esperaba:                     "${ORIGINAL_GUID}"`
        );
    }
    // --clean-name keeps the real display name, for screen recording: the visuals
    // panel would otherwise show "Pareto Chart Pro (TEST)" on camera. The GUID
    // suffix still applies, so it never collides with the AppSource version.
    const cleanName = process.argv.includes('--clean-name');

    // --free leaves isPro alone. The GUID suffix still applies, so Power BI does not
    // resolve the visual to the published AppSource version — which is what makes it
    // impossible to test the real Free tier with the production package. With a test
    // GUID the licence manager finds no plan for it, so it resolves to Free honestly
    // instead of being forced either way.
    const freeMode = process.argv.includes('--free');

    const guid = freeMode ? FREE_GUID : TEST_GUID;
    pbiviz.visual.guid = guid;

    // The Free build always announces itself. --clean-name exists for recording a
    // Pro demo; a Free build you cannot tell apart from the Pro one is a trap.
    if (freeMode) {
        pbiviz.visual.displayName = "Pareto Chart Pro (TEST FREE)";
    } else if (!cleanName) {
        pbiviz.visual.displayName = "Pareto Chart Pro (TEST)";
    }

    fs.writeFileSync(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 4), 'utf8');
    console.log(`📝  GUID         →  ${guid}`);
    console.log(`📝  displayName  →  ${pbiviz.visual.displayName}`);

    // ── Patch visual.ts (ISPRO_MARKER) ────────────────────────────────────────
    const isProFalse = `private isPro:           boolean = false; ${MARKER}`;
    const isProTrue  = `private isPro:           boolean = true;  ${MARKER}`;

    if (!visualOrig.includes(isProFalse)) {
        throw new Error(
            `No se encontró la línea ${MARKER} en src/visual.ts.\n` +
            `Busco: "${isProFalse}"\n` +
            `Actualiza este script para que coincida con el fuente actual.`
        );
    }

    if (freeMode) {
        console.log('📝  isPro →  false  (--free: tier Free real, sin forzar)');
    } else {
        fs.writeFileSync(VISUAL_TS, visualOrig.replace(isProFalse, isProTrue), 'utf8');
        console.log('📝  isPro →  true');
    }

    // ── Build ─────────────────────────────────────────────────────────────────
    console.log('\n🔨  Ejecutando pbiviz package...\n');
    execSync('npx pbiviz package', { stdio: 'inherit', cwd: ROOT, shell: true });

    console.log('\n✅  Build de TEST completado.');
    console.log(`    GUID del test: ${guid}`);
    console.log('    Importa el .pbiviz de /dist/ en Power BI Desktop.');
    console.log('    Power BI lo verá como visual distinto al de AppSource.\n');

} catch (err) {
    console.error('\n❌  Error durante el build de test:');
    console.error('   ', err.message || err);
} finally {
    restore();
}
