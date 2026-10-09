import 'dotenv/config'; // mismo cargue que hace index.js (api-divisas/.env)
import { existsSync } from 'node:fs';
import path from 'node:path';
import { sendTelegramAlert } from '../src/Alert/telegramLogger.js';

// --- Diagnóstico de rutas (solo informativo) ---
const envProyecto = path.resolve(process.cwd(), '.env');
const envPadre = path.resolve(process.cwd(), '..', '.env'); // ruta que usa telegramLogger
console.log('cwd               :', process.cwd());
console.log('.env del proyecto :', envProyecto, existsSync(envProyecto) ? '(existe)' : '(NO existe)');
console.log('.env del padre    :', envPadre, existsSync(envPadre) ? '(existe)' : '(NO existe)');
console.log('TELEGRAM_TOKEN    :', process.env.TELEGRAM_TOKEN ? 'cargado' : 'NO cargado');
console.log('TELEGRAM_CHAT_ID  :', process.env.TELEGRAM_CHAT_ID ? 'cargado' : 'NO cargado');

console.log('\nEnviando alerta de prueba a Telegram...');

await sendTelegramAlert({
    context: 'PRUEBA DE ALERTA',
    customMessage: 'Prueba manual: si ves este mensaje, las alertas a Telegram funcionan.',
    error: new Error('Error de prueba (ignorar)')
});

console.log('Función ejecutada. Revisá tu Telegram.');
process.exit(0);
