import axios from 'axios';

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

        console.log("📍 Cotizaciones listas para Redis:", cotizaciones);
        return cotizaciones;

    } catch (error) {
        console.error("Error al consultar las monedas en DolarApi:", error.message);
        return null;
    }
}

