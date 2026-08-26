import { Router } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const router = Router();

// Ruta absoluta a la BD SQLite (tasas.db en la raíz del proyecto)
const dbPath = fileURLToPath(new URL('../../tasas.db', import.meta.url));

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
        return res.status(500).json({ error: `error: ${error}` });
    }
});

export default router;
