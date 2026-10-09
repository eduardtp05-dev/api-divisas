import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import {ObtenerTasas} from '../src/routes/divisas.js'

import { redis } from '../src/config/redis.js';

import { sendTelegramAlert } from '../src/Alert/telegramLogger.js';

    
// Ruta a la BD: se puede sobreescribir con DB_PATH (ej. en VPS donde el cron corre desde la raíz del sistema)
const dbPath = process.env.DB_PATH || fileURLToPath(new URL('../tasas.db', import.meta.url));

const db = new DatabaseSync(dbPath);

// Tabla con historial por ID único de la API
db.exec(`
  CREATE TABLE IF NOT EXISTS historial (
    fecha TEXT PRIMARY KEY,    
    dolar REAL NOT NULL,
    euro REAL NOT NULL,
    usdt REAL NOT NULL,
    yuan REAL DEFAULT 0,
    creado_en TEXT DEFAULT (datetime('now', 'localtime'))
  );

  
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_fecha ON historial(fecha);
`)


async function ejecutarCierreDiario() {
  try {
    console.log('[CRON] Obteniendo datos de Redis...');

    // 3. Traer los strings JSON guardados en Redis
    let jsonOficialesTasas = await redis.get('tasas:bcv'); 
    let jsonUsdtTasas = await redis.get('tasas:usdt');    
    
    if(!jsonOficialesTasas || !jsonUsdtTasas){

      await ObtenerTasas();

      jsonOficialesTasas = await redis.get('tasas:bcv'); 
      jsonUsdtTasas = await redis.get('tasas:usdt'); 

      

    }

    // 4. Parsear los JSONs
    const oficiales = jsonOficialesTasas ? JSON.parse(jsonOficialesTasas) : {};
    const usdtData = jsonUsdtTasas ? JSON.parse(jsonUsdtTasas) : {};

    // Extraer las tasas numéricas de las propiedades
    const dolarRate = oficiales.dolar;
    const euroRate = oficiales.euro;
    const usdtRate = usdtData.promedioUsdt;

    // Fecha en hora de Venezuela (toISOString usa UTC y a las 23:00 ya sería el día siguiente)
    const fechaHoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());

    // Validar que las 3 tasas sean números mayores a cero antes de guardar.
    // Si alguna falla, se alerta a Telegram y NO se guarda ese día.
    const esValido = (n) => Number.isFinite(n) && n > 0;

    if (!esValido(dolarRate) || !esValido(euroRate) || !esValido(usdtRate)) {

      await sendTelegramAlert({
        context: "CIERRE DIARIO NO GUARDADO",
        customMessage: `No se guardó el cierre de ${fechaHoy} porque alguna tasa no es un número mayor a cero: dólar=${dolarRate}, euro=${euroRate}, usdt=${usdtRate}`,
        error: new Error("Datos inválidos al intentar guardar el cierre diario en SQLite")
      });

      console.error(`[CRON] Datos inválidos, NO se guarda el cierre de ${fechaHoy} ->`, { dolarRate, euroRate, usdtRate });
      return;
    }

    // 5. Guardar en SQLite con UPSERT (por si corre dos veces hoy)
    const stmt = db.prepare(`
      INSERT INTO historial (fecha, dolar, euro, usdt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(fecha) DO UPDATE SET
        dolar = excluded.dolar,
        euro = excluded.euro,
        usdt = excluded.usdt
    `);

    stmt.run(fechaHoy, dolarRate, euroRate, usdtRate);

    console.log(`[CRON] Exito: Cierre de ${fechaHoy} guardado -> Dólar: ${dolarRate}, Euro: ${euroRate}, USDT: ${usdtRate}`);

  } catch (error) {
    console.error('[CRON] Error procesando el cierre:', error);
  } finally {
    db.close();
    if (redis.quit) await redis.quit();
    process.exit(0);
  }
}

ejecutarCierreDiario();