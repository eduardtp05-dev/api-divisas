import { Router } from 'express';
import { mostrarP2PBinance } from '../services/binanceService.js';
import { obtenerDolarApi } from '../services/dolarApiService.js';
import { redis } from '../config/redis.js'; // Tu instancia de redis
import { obtenerBcvCotizave, obtenerUsdtCotizave } from '../services/cotizaveService.js';
import { obtenerBcvToday } from '../services/bcvTodayService.js';
import { obtenerBcvScraper } from '../services/bcvScraperService.js';

const router = Router();

router.get('/tasas', async (req, res) => {
    try{


        const tasas =  await ObtenerTasas();

        const datosBcv = tasas.bcv;
        const datosUsdt = tasas.usdt;

        // Tasa próxima del BCV: solo se expone en fin de semana/feriado, si no -> null
        const proximaBcv = await calcularProximaBcv(datosBcv);

        res.set('Cache-Control', 'public, max-age=200, s-maxage=300');

        return res.json({
            oficial: datosBcv,
            cripto: datosUsdt,
            proxima_bcv: proximaBcv,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.status(500).json({ error: `error: ${error}` });
    }
});






export default router;


// Fecha de HOY en hora de Venezuela (YYYY-MM-DD)
function hoyEnCaracas() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
}

// Extrae una fecha YYYY-MM-DD de un texto (ej. "2026-10-09T00:00:00-04:00" -> "2026-10-09")
function extraerFecha(texto) {
    const coincidencia = String(texto || '').match(/\d{4}-\d{2}-\d{2}/);
    return coincidencia ? coincidencia[0] : null;
}

// Fecha valor de la tasa oficial actual (cuándo entró en vigencia)
function fechaVigenteOficial(datosBcv) {
    if (!datosBcv) return null;
    return extraerFecha(datosBcv.vigente_desde) || extraerFecha(datosBcv.actualizado);
}

// Diferencia en días entre dos fechas YYYY-MM-DD (hasta - desde)
function diasEntre(desde, hasta) {
    const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
    return Math.round(ms / 86400000);
}

// Expone "proxima_bcv" SOLO durante el fin de semana/feriado:
//   1) la Fecha Valor del BCV todavía no entra en vigencia (es futura respecto a HOY)
//   2) hay un salto de 2+ días respecto a la tasa oficial vigente (finde/feriado)
// Fuera de eso devuelve null.
async function calcularProximaBcv(datosBcv) {

    try {

        const cache = await redis.get('tasas:bcv:proxima');
        if (!cache) return null;

        const proxima = JSON.parse(cache);
        if (!proxima || !proxima.vigente_desde) return null;

        const hoy = hoyEnCaracas();
        const fechaOficial = fechaVigenteOficial(datosBcv);

        const esFutura = diasEntre(hoy, proxima.vigente_desde) >= 1;
        const haySalto = fechaOficial ? diasEntre(fechaOficial, proxima.vigente_desde) >= 2 : false;

        if (esFutura && haySalto) {
            return {
                dolar: proxima.dolar,
                euro: proxima.euro,
                vigente_desde: proxima.vigente_desde
            };
        }

        return null;

    } catch (error) {
        console.log("⚠️ calcularProximaBcv:", error.message);
        return null;
    }

}


export async function ObtenerTasas(){

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
            let datosBcvDolarApi = await obtenerDolarApi();

            if (datosBcvDolarApi){
                console.log("\n\n\nDATOS ENCONTRADOS EN DOLAR API\n\n\n");
                await redis.set('tasas:bcv', JSON.stringify(datosBcvDolarApi), 'EX', 7200); // 2h
                datosBcv = datosBcvDolarApi;

            } 
            else if(!datosBcvDolarApi){

                console.log("🔄 DolarApi falló... Buscando en Cotizave");
                let datosBcvCotizave = await obtenerBcvCotizave();

                if(datosBcvCotizave){
                    await redis.set('tasas:bcv', JSON.stringify(datosBcvCotizave), 'EX', 7200); // 2h
                    datosBcv = datosBcvCotizave
                }
                else{

                    console.log("🔄 Cotizave falló... Buscando en bcv.today");
                    let datosBcvToday = await obtenerBcvToday();

                    if(datosBcvToday){
                        await redis.set('tasas:bcv', JSON.stringify(datosBcvToday), 'EX', 7200); // 2h
                        datosBcv = datosBcvToday
                    }
                    else{

                        console.log("🔄 bcv.today falló... Usando el scraper del BCV (última barrera)");
                        let datosBcvScraper = await obtenerBcvScraper();

                        if(datosBcvScraper){
                            await redis.set('tasas:bcv', JSON.stringify(datosBcvScraper), 'EX', 7200); // 2h
                            datosBcv = datosBcvScraper
                        }
                        else{
                            console.log("❌Error, ninguna fuente funcionó. TASA BCV NO DISPONIBLE");
                            datosBcv = null;
                        }

                    }

                }


            }

        }



        // 3. Si USDT expiró, buscar en Binance P2P y guardar
        if (!datosUsdt) {

            console.log("🔄 Cache USDT vacía. Buscando en Binance...");
            datosUsdt = await mostrarP2PBinance();


            console.log("\n\n\n\nLOS DATOS DE BINANCE USDT SON: \n\n\n\n", datosUsdt);

            if (datosUsdt){
                await redis.set('tasas:usdt', JSON.stringify(datosUsdt), 'EX', 900); // 15 min
            } else if(!datosUsdt){

                console.log("🔄 No funciono el endpoint de binance, consultando Cotizave");

                let datosUsdtCotizave = await obtenerUsdtCotizave();

                if(datosUsdtCotizave){
                    await redis.set('tasas:usdt', JSON.stringify(datosUsdtCotizave), 'EX', 900); // 15 min
                    datosUsdt = datosUsdtCotizave;
                } else{
                    console.log("APP CAIDA");
                }
            }
        }

        

        // 4. Responder unificado

        console.log("datos del bcv: ", datosBcv);


        return{
            bcv: datosBcv,
            usdt: datosUsdt
        }

        

    } catch(error){
        console.log(error);

    }
}

