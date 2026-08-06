import { Router } from 'express';
import { mostrarP2PBinance } from '../services/binanceService.js';
import { obtenerDolarApi } from '../services/dolarApiService.js';
import { redis } from '../config/redis.js'; // Tu instancia de redis
import { obtenerVzlaApi } from '../services/dolarVzlaService.js';
import {ObtenerBinanceVzla} from '../services/binanceVzlaService.js'

const router = Router();

router.get('/tasas', async (req, res) => {
    try{


        const tasas =  await ObtenerTasas();

        const datosBcv = tasas.bcv;
        const datosUsdt = tasas.usdt;


        res.set('Cache-Control', 'public, max-age=200, s-maxage=300');

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

                console.log("🔄 DolarApi falló... Buscando en dolarVzla");
                let datosBcvDolarVzla = await obtenerVzlaApi();

                if(datosBcvDolarVzla){
                    await redis.set('tasas:bcv', JSON.stringify(datosBcvDolarVzla), 'EX', 7200); // 2h
                    datosBcv = datosBcvDolarVzla
                } 
                else{
                    console.log("❌Error, ninguna fuente anterior funcionó. TASA BCV NO DISPONIBLE");
                    datosBcv = null;
                }


            }

        }



        // 3. Si USDT expiró, buscar en Binance P2P y guardar
        if (!datosUsdt) {

            console.log("🔄 Cache USDT vacía. Buscando en Binance...");
            datosUsdt = await mostrarP2PBinance();


            console.log("\n\n\n\nLOS DATOS DE BINANCE USDT SON: \n\n\n\n", datosUsdt);

            if (datosUsdt){
                await redis.set('tasas:usdt', JSON.stringify(datosUsdt), 'EX', 7200); // 2h
            } else if(!datosUsdt){

                console.log("🔄 No funciono el endpoint de binance, consultando API de emergencia");

                let datosUsdtEmergencia = await  ObtenerBinanceVzla();

                if(datosUsdtEmergencia){
                    datosUsdt = datosUsdtEmergencia;
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

