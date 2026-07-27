import axios from 'axios';
import {sendTelegramAlert} from '../Alert/telegramLogger.js'

export async function obtenerVzlaApi() {

    try {
        
        const respuesta = await axios.get("https://dolar-vzla.rafnixg.dev/api/v1/bcv/all");
        const monedas = respuesta.data;

        const valorDolar = monedas.dolar.rate;
        const valorEuro = monedas.euro.rate;
        const actualizacion =  monedas.dolar.date;

        const cotizaciones = {
            dolar: valorDolar,
            euro: valorEuro,
            actualizado: actualizacion
        }


        console.log("CONSULTADO DE  VZLA API.   \nmonedas: \nDolar: ",valorDolar,"\nEuro: ",valorEuro);

        return cotizaciones;

    } catch (error) {

        return null

        sendTelegramAlert({
            context: "---EMERGENCIA---\n ERROR EN DOLAR VZLA",
            customMessage: "Dolar VZLA no está funcionando correctamente",
            error:(error)
        });

        console.log("error al comunicarse con dolar-vzla. ERROR:", error );
    }
    
}
