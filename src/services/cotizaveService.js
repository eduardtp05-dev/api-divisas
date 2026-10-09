import axios from 'axios';
import { sendTelegramAlert } from '../Alert/telegramLogger.js';

const esValido = (n) => Number.isFinite(n) && n > 0;

// Cotizave nos da la tasa oficial del BCV y el P2P de Binance en un proveedor con
// API key y status page (reemplaza a dolar-vzla.rafnixg.dev)
const BASE_URL = 'https://api.cotizave.com/v1/fx';

function cabeceras() {
    return {
        'X-API-Key': process.env.COTIZAVE_KEY,
        'Accept': 'application/json'
    };
}

// Respaldo de la tasa oficial del BCV (dólar y euro)
export async function obtenerBcvCotizave() {

    try {

        const [respuestaDolar, respuestaEuro] = await Promise.all([
            axios.get(`${BASE_URL}/rates/reference`, { headers: cabeceras() }),
            axios.get(`${BASE_URL}/rates/eur_reference`, { headers: cabeceras() })
        ]);

        const cotizaciones = {
            dolar: respuestaDolar.data.mid,
            euro: respuestaEuro.data.mid,
            actualizado: respuestaDolar.data.updated_at
        };

        if (!esValido(cotizaciones.dolar) || !esValido(cotizaciones.euro)) {
            sendTelegramAlert({
                context: "DATOS INVÁLIDOS EN COTIZAVE (BCV)",
                customMessage: `Cotizave respondió pero sin números válidos: dólar=${cotizaciones.dolar}, euro=${cotizaciones.euro}`,
                error: new Error("Cotizave (BCV) no devolvió números mayores a cero")
            });
            console.log("⚠️ Cotizave (BCV) devolvió datos inválidos:", cotizaciones);
            return null;
        }

        console.log("CONSULTADO DE COTIZAVE (BCV).   \nmonedas: \nDolar: ", cotizaciones.dolar, "\nEuro: ", cotizaciones.euro);

        return cotizaciones;

    } catch (error) {

        sendTelegramAlert({
            context: "---EMERGENCIA---\n ERROR EN COTIZAVE (BCV)",
            customMessage: "Cotizave no está respondiendo la tasa oficial del BCV",
            error: (error)
        });

        console.log("error al comunicarse con cotizave (BCV). ERROR:", error.message);

        return null;

    }

}

// Respaldo de la tasa USDT P2P (Binance)
export async function obtenerUsdtCotizave() {

    try {

        const respuesta = await axios.get(`${BASE_URL}/rates/binance`, { headers: cabeceras() });
        const data = respuesta.data;

        const usdt = {
            usdtCompra: data.bid,
            usdtVenta: data.ask,
            promedioUsdt: data.mid,
            actualizado: data.updated_at
        };

        if (!esValido(usdt.usdtCompra) || !esValido(usdt.usdtVenta) || !esValido(usdt.promedioUsdt)) {
            sendTelegramAlert({
                context: "DATOS INVÁLIDOS EN COTIZAVE (USDT)",
                customMessage: `Cotizave respondió pero sin números válidos: compra=${usdt.usdtCompra}, venta=${usdt.usdtVenta}, promedio=${usdt.promedioUsdt}`,
                error: new Error("Cotizave (USDT) no devolvió números mayores a cero")
            });
            console.log("⚠️ Cotizave (USDT) devolvió datos inválidos:", usdt);
            return null;
        }

        console.log("CONSULTADO DE COTIZAVE (USDT). Promedio: ", usdt.promedioUsdt);

        return usdt;

    } catch (error) {

        sendTelegramAlert({
            context: "ERROR EN COTIZAVE (USDT)",
            customMessage: "Cotizave no está respondiendo la tasa USDT P2P",
            error: (error)
        });

        console.log("error al comunicarse con cotizave (USDT). ERROR:", error.message);

        return null;

    }

}
