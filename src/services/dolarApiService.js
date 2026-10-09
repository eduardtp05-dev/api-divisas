import axios from 'axios';
import {sendTelegramAlert} from '../Alert/telegramLogger.js'

const esValido = (n) => Number.isFinite(n) && n > 0;
        

export async function obtenerDolarApi() {
    try {
        // Consultamos el endpoint global de monedas
        const respuesta = await axios.get('https://ve.dolarapi.com/v1/cotizaciones');
        const todasLasMonedas = respuesta.data; // Esto es un Array []

        // Filtramos o buscamos el dólar y el euro por su código de moneda
        const datosDolar = todasLasMonedas.find(m => m.moneda === 'USD');
        const datosEuro = todasLasMonedas.find(m => m.moneda === 'EUR');

        // Estructuramos el objeto final que va para Redis
        const cotizaciones = {
            dolar: datosDolar ? datosDolar.promedio : null,
            euro: datosEuro ? datosEuro.promedio : null,
            actualizado: datosDolar ? datosDolar.fechaActualizacion : new Date().toISOString()
        };

        if (!esValido(cotizaciones.dolar) || !esValido(cotizaciones.euro)) {
            sendTelegramAlert({
                context: "DATOS INVÁLIDOS EN DOLAR API",
                customMessage: `DolarApi respondió pero sin números válidos: dólar=${cotizaciones.dolar}, euro=${cotizaciones.euro}`,
                error: new Error("DolarApi no devolvió números mayores a cero (USD/EUR)")
            });
            console.log("⚠️ DolarApi devolvió datos inválidos:", cotizaciones);
            return null;
        }

        console.log("📍 Cotizaciones listas para Redis:", cotizaciones);
        return cotizaciones;

    } catch (error) {
        console.error("Error al consultar las monedas en DolarApi:", error.message);

        
        sendTelegramAlert({
            context: "ERROR EN DOLAR API",
            customMessage: "Dolar API no está funcionando correctamente",
            error:(error)
        });

        return null;
    }
}




