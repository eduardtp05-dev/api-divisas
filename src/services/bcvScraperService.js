import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rootCertificates } from 'node:tls';
import { sendTelegramAlert } from '../Alert/telegramLogger.js';

const esValido = (n) => Number.isFinite(n) && n > 0;

// El BCV no envía el certificado intermedio de Sectigo en su handshake (cadena incompleta),
// por eso lo agregamos a mano para mantener la verificación TLS encendida.
const intermedioSectigo = readFileSync(fileURLToPath(new URL('../certs/sectigo-r36.pem', import.meta.url)));

const httpsAgent = new https.Agent({
    ca: [...rootCertificates, intermedioSectigo]
});

// El BCV usa punto para miles y coma para decimales (ej: "1.234,56")
function parsearNumero(texto) {
    return parseFloat(texto.trim().replace(/\./g, '').replace(',', '.'));
}

// Última barrera: acceso directo al sitio del BCV
export async function obtenerBcvScraper() {

    try {

        const respuesta = await axios.get('https://www.bcv.org.ve/', {
            httpsAgent,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(respuesta.data);

        const dolar = parsearNumero($('#dolar .centrado strong').text());
        const euro = parsearNumero($('#euro .centrado strong').text());

        if (!esValido(dolar) || !esValido(euro)) {
            sendTelegramAlert({
                context: "DATOS INVÁLIDOS EN EL SCRAPER DEL BCV",
                customMessage: `El scraper respondió pero no pudo leer números válidos: dólar=${dolar}, euro=${euro}`,
                error: new Error("El scraper no encontró números mayores a cero en el HTML del BCV")
            });
            console.log("⚠️ El scraper del BCV devolvió datos inválidos:", { dolar, euro });
            return null;
        }

        const cotizaciones = {
            dolar,
            euro,
            actualizado: new Date().toISOString()
        };

        console.log("CONSULTADO DEL SCRAPER DEL BCV.   \nmonedas: \nDolar: ", dolar, "\nEuro: ", euro);

        return cotizaciones;

    } catch (error) {

        sendTelegramAlert({
            context: "---EMERGENCIA CRITICA---\n TODAS LAS FUENTES DEL BCV FALLARON",
            customMessage: "Se agotó la cadena (dolarapi, Cotizave y bcv.today). La barrera final, el scraper del BCV, tampoco respondió.",
            error: (error)
        });

        console.log("error en el scraper del BCV. ERROR:", error.message);

        return null;

    }

}
