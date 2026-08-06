import { DatabaseSync } from 'node:sqlite';

import {ObtenerTasas} from '../src/routes/divisas.js'

import { redis } from '../src/config/redis.js';


const db = new DatabaseSync('tasas.db');

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
    const dolarRate = oficiales.dolar || 0;
    const euroRate = oficiales.euro || 0;
    const usdtRate = usdtData.promedioUsdt || 0;

    const fechaHoy = new Date().toISOString().split('T')[0]; // '2026-07-26'

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