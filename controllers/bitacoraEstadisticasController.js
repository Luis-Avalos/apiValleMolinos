const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSubidasEstadisticas = async (req, res) => {

    try {
        
        const estatQuery = await prisma.$queryRaw`
                SELECT 
            e.id AS estacion_id,
            e.nombre AS estacion,
            e.ruta_asignada ,
            bc.fecha_hora ,
            SUM(bc.ascensos) AS total_ascensos,
            SUM(bc.descensos) AS total_descensos
            FROM bitacora_cupos bc
            INNER JOIN estaciones e 
            ON e.id = bc.fk_estaciones
            WHERE e.ruta_asignada  IN ('VALLE','TESISTAN')
            GROUP BY e.id, e.nombre,bc.fecha_hora ,  DATE(bc.fecha_hora)
            ORDER BY e.nombre;
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
