import { Router } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import path from 'path';


// Forzamos a Node a buscar el .env exactamente en la raíz del proyecto actual
dotenv.config({ path: path.resolve(process.cwd(), '..','.env') });

const router = Router();

// Ruta a la BD: se puede sobreescribir con DB_PATH (ej. en VPS donde el cron crea la DB en la raíz del sistema)
const dbPath = process.env.DB_PATH || fileURLToPath(new URL('../../tasas.db', import.meta.url));

router.get('/historial', async (req, res) => {
    try {
        const db = new DatabaseSync(dbPath, { readOnly: true });

        const filas = db
            .prepare('SELECT fecha, dolar, euro, usdt FROM historial ORDER BY fecha DESC LIMIT 60')
            .all();

        db.close();

        // Invertir para devolver los 60 últimos en orden ascendente de fecha
        const historial = filas
            .reverse()
            .map(({ fecha, dolar, euro, usdt }) => ({
                fecha,
                usd: dolar,
                eur: euro,
                usdt
            }));

        res.set('Cache-Control', 'public, max-age=200, s-maxage=300');

        return res.json(historial);

    } catch (error) {
        return res.status(500).json({ error: `error: ${error} (intentó abrir: ${dbPath})` });
    }
});

export default router;
