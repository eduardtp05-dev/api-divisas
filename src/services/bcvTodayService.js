import axios from 'axios';
import { sendTelegramAlert } from '../Alert/telegramLogger.js';

const esValido = (n) => Number.isFinite(n) && n > 0;

// Espejo del BCV servido como JSON estático sobre TLS válido (tercer respaldo)
export async function obtenerBcvToday() {

    try {

        const respuesta = await axios.get('https://bcv.today/api/v1/rate.json');
        const data = respuesta.data;

        const cotizaciones = {
            dolar: data.USD,
            euro: data.EUR,
            actualizado: data.updated_at
        };

        if (!esValido(cotizaciones.dolar) || !esValido(cotizaciones.euro)) {
            sendTelegramAlert({
                context: "DATOS INVÁLIDOS EN BCV.TODAY",
                customMessage: `bcv.today respondió pero sin números válidos: dólar=${cotizaciones.dolar}, euro=${cotizaciones.euro}`,
                error: new Error("bcv.today no devolvió números mayores a cero (USD/EUR)")
            });
            console.log("⚠️ bcv.today devolvió datos inválidos:", cotizaciones);
            return null;
        }

        console.log("CONSULTADO DE BCV.TODAY.   \nmonedas: \nDolar: ", cotizaciones.dolar, "\nEuro: ", cotizaciones.euro);

        return cotizaciones;

    } catch (error) {

        sendTelegramAlert({
            context: "---EMERGENCIA---\n ERROR EN BCV.TODAY",
            customMessage: "bcv.today no está respondiendo la tasa del BCV",
            error: (error)
        });

        console.log("error al comunicarse con bcv.today. ERROR:", error.message);

        return null;

    }

}
