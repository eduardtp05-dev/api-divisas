import { Router } from 'express';
import { mostrarP2PBinance } from '../services/binanceService.js';
import { obtenerDolarApi } from '../services/dolarApiService.js';
import { redis } from '../config/redis.js'; // Tu instancia de redis

const router = Router();

router.get('/tasas', async (req, res) => {
    try {
        // 1. Intentar leer ambas claves de Redis en paralelo
        const [cacheBcv, cacheUsdt] = await Promise.all([
            redis.get('tasas:bcv'),
            redis.get('tasas:usdt')
        ]);

        let datosBcv = cacheBcv ? JSON.parse(cacheBcv) : null;
        let datosUsdt = cacheUsdt ? JSON.parse(cacheUsdt) : null;

        // 2. Si BCV expiró, buscar en DolarApi y guardar
        if (!datosBcv) {
            console.log("🔄 Cache BCV vacía. Buscando en DolarApi...");
            datosBcv = await obtenerDolarApi();
            if (datosBcv) await redis.set('tasas:bcv', JSON.stringify(datosBcv), 'EX', 7200); // 2h
        }

        // 3. Si USDT expiró, buscar en Binance P2P y guardar
        if (!datosUsdt) {
            console.log("🔄 Cache USDT vacía. Buscando en Binance...");
            datosUsdt = await mostrarP2PBinance();
            if (datosUsdt) await redis.set('tasas:usdt', JSON.stringify(datosUsdt), 'EX', 3600); // 1h
        }

        // 4. Responder unificado
        return res.json({
            oficial: datosBcv,
            cripto: datosUsdt,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.status(500).json({ error: `error: ${error}` });
    }
});

export default router;


