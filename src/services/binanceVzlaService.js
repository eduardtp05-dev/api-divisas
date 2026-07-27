import axios from 'axios';
import {sendTelegramAlert} from '../Alert/telegramLogger.js'

export async function ObtenerBinanceVzla() {
    
  
       
    try {
        
        const response = await axios.get("https://dolar-vzla.rafnixg.dev/api/v1/binance/realtime_ves");
        const data = response.data
        
        const compraPromedioUsdt = data.average_price;
        const promedioUsdt = data.median_price;
        console.log("DATA: ",response.data)
        

        console.log("📊 RESULTADOS DE EMERGENCIA DE BINANCE P2P:");
        console.log("VALOR DE VZLA BINANCE: ",promedioUsdt);
       
        

        const usdt  = {
            usdtCompra: compraPromedioUsdt,
            usdtVenta: null,
            promedioUsdt: promedioUsdt,
            actualizado: new Date().toISOString()
        };

        return usdt;

    } catch (error) {
        
        sendTelegramAlert({
            context: "ERROR EN LA API DE VZLA DE BINANCE",
            customMessage: "Ni el endpoint ni la API de VZLA estan funcionando, App caída",
            error:(error)
        });


        console.log("error al obtener binance: ", error)

        return null;
    }
}
