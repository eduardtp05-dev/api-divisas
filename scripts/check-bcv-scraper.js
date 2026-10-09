import 'dotenv/config';
import { obtenerBcvScraper } from '../src/services/bcvScraperService.js';

// Script de comprobación de la última barrera (scraper al BCV).
// Uso:  node scripts/check-bcv-scraper.js
const datos = await obtenerBcvScraper();

const valido = datos
    && Number.isFinite(datos.dolar) && datos.dolar > 0
    && Number.isFinite(datos.euro) && datos.euro > 0;

if (!valido) {
    console.error('\n❌ La última barrera FALLÓ: el scraper del BCV no devolvió datos válidos.');
    process.exit(1);
}

// Formato estándar del proyecto para la tasa oficial del BCV
const salida = {
    dolar: datos.dolar,
    euro: datos.euro,
    actualizado: datos.actualizado
};

console.log('\n✅ La última barrera FUNCIONA. Formato estándar del proyecto:\n');
console.log(JSON.stringify(salida, null, 2));

process.exit(0);
