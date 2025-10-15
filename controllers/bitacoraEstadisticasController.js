const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSubidasEstadisticas = async (req, res) => {
    try {
        const estatQuery = await prisma.$queryRaw`
                SELECT 
                e.id AS estacion_id,
                COALESCE(e.nombre, 'SIN ESTACION') AS estacion,
                e.ruta_asignada,
                bc.fecha_hora,
                bc.latitud,
                bc.longitud,
                SUM(bc.ascensos) AS total_ascensos,
                SUM(bc.descensos) AS total_descensos
            FROM bitacora_cupos bc
            LEFT JOIN estaciones e
                ON e.id = bc.fk_estaciones
            WHERE e.ruta_asignada IN ('VALLE','TESISTAN') OR bc.fk_estaciones IS NULL
            GROUP BY e.id, e.nombre, e.ruta_asignada, bc.fecha_hora, DATE(bc.fecha_hora), bc.latitud,bc.longitud
            ORDER BY estacion, fecha_hora;
        `;
        // Convertir posibles BigInt para serializar 
        const result = estatQuery.map(r => ({
            estacion_id: Number(r.estacion_id),
            fecha_hora: r.fecha_hora,
            ruta_asignada: r.ruta_asignada,
            estacion: r.estacion,
            total_ascensos: Number(r.total_ascensos),
            total_descensos: Number(r.total_descensos),
        }));

        res.json(result); //enviamos los datos como JSON

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
