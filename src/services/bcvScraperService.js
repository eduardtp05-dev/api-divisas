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

// La "Fecha Valor" es la fecha en que entra en vigencia la tasa publicada.
// La página trae varios <meta property="dc:date"> (el widget de archivo tiene los suyos):
// el PRIMERO es el de la tasa vigente/próxima, los demás son del archivo de meses.
function parsearFechaValor(texto) {
    const coincidencia = String(texto || '').match(/\d{4}-\d{2}-\d{2}/);
    return coincidencia ? coincidencia[0] : null;
}

// Lee la página del BCV una sola vez: tasas + Fecha Valor.
// Lanza si falla la petición HTTP (lo maneja cada función exportada).
async function leerPaginaBcv() {

    const respuesta = await axios.get('https://www.bcv.org.ve/', {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(respuesta.data);

    return {
        dolar: parsearNumero($('#dolar .centrado strong').text()),
        euro: parsearNumero($('#euro .centrado strong').text()),
        vigente_desde: parsearFechaValor($('[property="dc:date"]').first().attr('content'))
    };

}

// Última barrera: acceso directo al sitio del BCV
export async function obtenerBcvScraper() {

    try {

        const { dolar, euro, vigente_desde } = await leerPaginaBcv();

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
            // Fecha valor: la fecha en que rige esta tasa (no la de consulta)
            vigente_desde,
            actualizado: new Date().toISOString()
        };

        console.log("CONSULTADO DEL SCRAPER DEL BCV.   \nmonedas: \nDolar: ", dolar, "\nEuro: ", euro, "\nVigente desde: ", vigente_desde);

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

// Tasa PRÓXIMA (aún no vigente) que el BCV ya publica en su página.
// Alimenta el campo "proxima_bcv" durante el fin de semana / feriados.
// Job NO crítico: si falla, NO alerta (solo loguea) y devuelve null.
export async function obtenerBcvProxima() {

    try {

        const { dolar, euro, vigente_desde } = await leerPaginaBcv();

        if (!esValido(dolar) || !esValido(euro) || !vigente_desde) {
            console.log("⚠️ obtenerBcvProxima: datos inválidos o sin Fecha Valor:", { dolar, euro, vigente_desde });
            return null;
        }

        return { dolar, euro, vigente_desde };

    } catch (error) {

        console.log("obtenerBcvProxima: error al leer la página del BCV. ERROR:", error.message);

        return null;

    }

}
