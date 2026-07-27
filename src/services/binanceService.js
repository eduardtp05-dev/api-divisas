import axios from 'axios';
import {sendTelegramAlert} from '../Alert/telegramLogger.js'

async function obtenerP2PBinance(tipoOperacion) {
    try {
        // El endpoint interno que usa la web de Binance para el P2P
        const url = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';


        console.log("tipo", tipoOperacion)

        // Los filtros exactos que necesita Binance para responder
        const payload = {
            asset: 'USDT',            // La cripto que buscas
            fiat: 'VES',             // Tu moneda local (Bolívares)
            merchantCheck: false,    // true si solo quieres comerciantes verificados
            page: 1,                 // Primera página de resultados
            rows: 10,                // Traer los primeros 10 anuncios
            transAmount: "20000",
            payTypes: [],            // Puedes filtrar por banco, ej: ['Banesco']
            publisherType: null,
            tradeType: tipoOperacion // 'BUY' para ver a cuánto compran, 'SELL' para venta
        };

        const respuesta = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari-537.36'
            }
        });

        // Binance devuelve un array con los anuncios activos en 'data'
        const anuncios = respuesta.data.data;

        if (!anuncios || anuncios.length === 0) {
            throw new Error("No se encontraron anuncios activos.");
        }

        // Extraemos los precios de los primeros 5 anuncios para promediar
        const precios = anuncios.slice(0, 5).map(item => parseFloat(item.adv.price));
        
        // Calculamos el promedio
        const suma = precios.reduce((acc, precio) => acc + precio, 0);
        const promedio = suma / precios.length;

        return {
            operacion: tipoOperacion,
            precioMasBarato: precios[0], // El primer anuncio siempre es el mejor precio
            promedioTop5: parseFloat(promedio.toFixed(2))
        };

    } catch (error) {
        console.error(`Error consultando P2P (${tipoOperacion}):`, error.message);

        sendTelegramAlert({
            context: "ERROR EN BINANCE",
            customMessage: "EL endpoint de Binance no esta funcionando... revisar cuanto antes!",
            error:(error)
        });


        return null;
    }
}


export async function mostrarP2PBinance() {
    
    try {
        
        console.log("Consultando Binance P2P directo...");
        
        // Al pasar 'BUY', ves los anuncios de compra (el precio que paga el usuario para adquirir USDT)
        const compra = await obtenerP2PBinance('BUY');
        
        // Al pasar 'SELL', ves los anuncios de venta (a cuánto puedes cambiar tus USDT a bolívares)
        const venta = await obtenerP2PBinance('SELL');

        if(!compra || !venta){
            return null;

        }

        const compraPromedioUsdt = compra?.promedioTop5;
        const ventaPromedioUsdt = venta?.promedioTop5
        const promedioUsdt = (compraPromedioUsdt + ventaPromedioUsdt) / 2;

        console.log("📊 RESULTADOS REALES DE BINANCE P2P:");
        console.log("Compra (Top 5 Promedio):", compraPromedioUsdt, "Bs");
        console.log("Venta (Top 5 Promedio):", ventaPromedioUsdt, "Bs");

        

        const usdt  = {
            usdtCompra: compraPromedioUsdt,
            usdtVenta: ventaPromedioUsdt,
            promedioUsdt: promedioUsdt,
            actualizado: new Date().toISOString()
        };

        return usdt;

    } catch (error) {
        
        console.log("error al obtener binance: ", error)

        return null;
    }

}

