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
                    bc.ciudadanosfaltante,
                    SUM(bc.ascensos) AS total_ascensos,
                    SUM(bc.descensos) AS total_descensos
                FROM bitacora_cupos bc
                LEFT JOIN estaciones_poligonos_produccion epp 
                    ON epp.gid = bc.fk_estaciones
                WHERE epp.ruta IN ('EL ALAMO','VALLE','MIRADOR','SANTA LUCIA') 
                OR bc.fk_estaciones IS NULL
                GROUP BY 
                    epp.gid, epp.nombre, epp.ruta,epp.regreso,epp.ida,bc.fecha_hora, bc.longitud, bc.latitud, bc.ciudadanosfaltante
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
            ciudadanosfaltante: Number(r.ciudadanosfaltante),

        }));

        res.json(result); //enviamos los datos como JSON

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getBitacoraAgrupadaPorRuta = async (req, res) => {
  try {
    const bitacoras = await prisma.bitacora_cupos.findMany({
      select: {
        id: true,
        viaje_id: true,
        ascensos: true,
        descensos: true,
        fecha_hora: true,
        latitud: true,        
        ciudadanosfaltante: true,        
        longitud: true,       
        viajes: {
          select: {
            ruta_id: true,
            rutas: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: { fecha_hora: 'desc' },
    });

    const registros = bitacoras.map(b => ({
      bitacora_id: b.id,
      viaje_id: b.viaje_id,
      ruta_id: b.viajes?.ruta_id || null,
      nombre_ruta: b.viajes?.rutas?.nombre || 'SIN RUTA',
      ascensos: b.ascensos,
      descensos: b.descensos,
      fecha_hora: b.fecha_hora,
      latitud: b.latitud,      
      longitud: b.longitud, 
      ciudadanosfaltante: b.ciudadanosfaltante,      

    }));

    const agrupado = Object.values(
      registros.reduce((acc, r) => {
        const nombre = r.nombre_ruta || 'SIN RUTA';
        if (!acc[nombre]) {
          acc[nombre] = { nombre_ruta: nombre, registros: [] };
        }
        acc[nombre].registros.push({
          bitacora_id: r.bitacora_id,
          viaje_id: r.viaje_id,
          ascensos: r.ascensos,
          descensos: r.descensos,
          fecha_hora: r.fecha_hora,
          latitud: r.latitud,       
          longitud: r.longitud,     
          ciudadanosfaltante: r.ciudadanosfaltante,     
        });
        return acc;
      }, {})
    );

    res.json(agrupado);
  } catch (error) {
    console.error('Error al obtener bitácoras agrupadas:', error);
    res.status(500).json({ error: 'Error al obtener bitácoras agrupadas por ruta' });
  }
};
