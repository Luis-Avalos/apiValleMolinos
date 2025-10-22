const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSubidasEstadisticas = async (req, res) => {

    try {

        const estatQuery = await prisma.$queryRaw`
                SELECT 
                    COALESCE(epp.gid, 0) AS estacion_id,                 -- Si no hay estación, 0
                    COALESCE(epp.nombre, 'SIN ESTACION') AS estacion,    -- Si no hay nombre, 'SIN ESTACION'
                    bc.latitud,
                    bc.longitud,
                    COALESCE(epp.ruta, 'SIN RUTA') AS ruta,             -- Si no hay ruta, 'SIN RUTA'
                    epp.regreso,
                    epp.ida,
                    bc.fecha_hora,
                    SUM(bc.ascensos) AS total_ascensos,
                    SUM(bc.descensos) AS total_descensos
                FROM bitacora_cupos bc
                LEFT JOIN estaciones_poligonos_produccion epp 
                    ON epp.gid = bc.fk_estaciones
                WHERE epp.ruta IN ('EL ALAMO','VALLE','MIRADOR','SANTA LUCIA') 
                OR bc.fk_estaciones IS NULL
                GROUP BY 
                    epp.gid, epp.nombre, epp.ruta,epp.regreso,epp.ida,bc.fecha_hora, bc.longitud, bc.latitud 
                ORDER BY bc.fecha_hora DESC;
        `;
        // Convertir posibles BigInt para serializar 
        const result = estatQuery.map(r => ({
            estacion_id: Number(r.estacion_id),
            fecha_hora: r.fecha_hora,
            ruta_asignada: r.ruta,
            latitud: r.latitud,
            longitud: r.longitud,
            regreso: r.regreso,
            ida: r.ida,
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
