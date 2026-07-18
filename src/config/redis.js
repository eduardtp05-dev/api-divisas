import Redis from 'ioredis';

// 1. Configurar la URL de conexión usando variables de entorno (.env)
// En desarrollo local suele ser redis://127.0.0.1:6379
// En producción (ej. Render, Railway, Supabase) te darán una URL larga
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// 2. Crear la instancia de conexión
const redis = new Redis(REDIS_URL, {
    // Configuraciones opcionales pero recomendadas:
    maxRetriesPerRequest: 3, // Evita bucles infinitos intentando conectar si Redis muere
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true; // Reconecta si cambia el estado del clúster
        }
        return false;
    }
});

// 3. Monitorear los estados de la conexión en la consola
redis.on('connect', () => {
    console.log('📶 Conectando a Redis...');
});

redis.on('ready', () => {
    console.log('✅ ¡Redis está listo y conectado exitosamente!');
});

redis.on('error', (err) => {
    console.error('❌ Error crítico en la conexión de Redis:', err.message);
});

redis.on('end', () => {
    console.log('📴 Conexión con Redis finalizada.');
});

// 4. Exportar la instancia única (Singleton) para usarla en tus rutas o servicios
export { redis };