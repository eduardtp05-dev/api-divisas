import dotenv from 'dotenv';
import path from 'path';

// Forzamos a Node a buscar el .env exactamente en la raíz del proyecto actual
dotenv.config({ path: path.resolve(process.cwd(), '..','.env') });








/**
 * Envia una alerta personalizada a Telegram
 * @param {string} context - Dónde ocurrió (ej: "Pagos", "Auth", "Base de Datos")
 * @param {string} customMessage - Tu mensaje personalizado de lo que intentaba hacer
 * @param {Error|unknown} error - El objeto del error capturado en el catch
 */
export async function sendTelegramAlert({ context, customMessage, error }) {


    // telegramLogger.js
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;


  
  
  
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack ? error.stack.substring(0, 300) : '';

  const message = `
⚠️ <b>ALERTA: ${context.toUpperCase()}</b> ⚠️

📌 <b>Detalle:</b> ${customMessage}
💥 <b>Error:</b> <code>${errorMessage}</code>
🕒 <b>Fecha:</b> ${new Date().toLocaleString('es-VE')}

${errorStack ? `<pre>${errorStack}</pre>` : ''}
  `.trim();

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Error enviando notificación a Telegram:', err);
  }
}