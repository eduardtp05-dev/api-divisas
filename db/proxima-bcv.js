import 'dotenv/config';
import { redis } from '../src/config/redis.js';
import { obtenerBcvProxima } from '../src/services/bcvScraperService.js';

// Job diario: lee la "Fecha Valor" que el BCV publica en su página (la tasa que
// entrará en vigencia) y la guarda en Redis para el campo "proxima_bcv" del /tasas.
// Pensado para cron a las 19:00 (hora Venezuela).
// NO es crítico: si falla, no rompe nada (el campo simplemente queda null).
// Uso:  cd /root/apps/api-divisas && node db/proxima-bcv.js

const CUATRO_DIAS = 60 * 60 * 24 * 4; // 345600 s

try {

    const proxima = await obtenerBcvProxima();

    if (!proxima) {
        console.log('[PROXIMA] No se obtuvo una Fecha Valor válida. No se guarda nada (el campo quedará null).');
    } else {
        await redis.set('tasas:bcv:proxima', JSON.stringify(proxima), 'EX', CUATRO_DIAS);
        console.log('[PROXIMA] Guardado en Redis ->', JSON.stringify(proxima));
    }

} catch (error) {
    console.error('[PROXIMA] Error inesperado:', error.message);
} finally {
    if (redis.quit) await redis.quit();
    process.exit(0);
}
