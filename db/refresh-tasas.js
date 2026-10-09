import 'dotenv/config';
import { redis } from '../src/config/redis.js';
import { ObtenerTasas } from '../src/routes/divisas.js';

// Precalienta la caché de Redis con la tasa nueva del día (BCV + USDT).
// Pensado para cron a las 00:01 (hora Venezuela).
// NO toca la base de datos: solo escribe/lee Redis.
// Uso:  cd /root/apps/api-divisas && node db/refresh-tasas.js


await redis.del('tasas:bcv', 'tasas:usdt'); // forzar re-consulta de las fuentes

const tasas = await ObtenerTasas();

console.log('[REFRESH] Caché actualizada:', JSON.stringify(tasas));

await redis.quit();
process.exit(0);
