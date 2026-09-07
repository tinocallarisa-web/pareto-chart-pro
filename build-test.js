/**
 * build-test.js — Pareto Chart Pro
 *
 * Genera un .pbiviz de TEST que convive con la versión de AppSource:
 *   - GUID: ParetoChartPro1A2B3C4D5E6F7A8B9C0D_test
 *   - isPro = true (para probar funciones Pro sin licencia)
 *
 * Uso:  node build-test.js
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

    pbiviz.visual.guid = TEST_GUID;
    if (!cleanName) pbiviz.visual.displayName = "Pareto Chart Pro (TEST)";
    fs.writeFileSync(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 4), 'utf8');
    console.log(`📝  GUID         →  ${TEST_GUID}`);
    console.log(`📝  displayName  →  ${pbiviz.visual.displayName}${cleanName ? '  (--clean-name)' : ''}`);

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
    fs.writeFileSync(VISUAL_TS, visualOrig.replace(isProFalse, isProTrue), 'utf8');
    console.log('📝  isPro →  true');

    // ── Build ─────────────────────────────────────────────────────────────────
    console.log('\n🔨  Ejecutando pbiviz package...\n');
    execSync('npx pbiviz package', { stdio: 'inherit', cwd: ROOT, shell: true });

    console.log('\n✅  Build de TEST completado.');
    console.log(`    GUID del test: ${TEST_GUID}`);
    console.log('    Importa el .pbiviz de /dist/ en Power BI Desktop.');
    console.log('    Power BI lo verá como visual distinto al de AppSource.\n');

} catch (err) {
    console.error('\n❌  Error durante el build de test:');
    console.error('   ', err.message || err);
} finally {
    restore();
}
