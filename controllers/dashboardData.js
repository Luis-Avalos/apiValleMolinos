const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ASCENSOS / DESCENSOS

exports.getAllSubidasbajadas = async (req, res) => {
  try {
    const result = await prisma.bitacora_cupos.aggregate({
      _sum: {
        ascensos: true,
        descensos: true
      }
    });

    res.json({
      total_ascensos: result._sum.ascensos || 0,
      total_descensos: result._sum.descensos || 0
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener la data', 
      details: error.message 
    });
  }
};

// TOTAL DE UNIDADES POR ESTADO
exports.getUnidadesStats = async (req, res) => {
  try {
    const total = await prisma.unidades.count();

    const estados = await prisma.unidades.groupBy({
      by: ['estado'],
      _count: { estado: true }
    });

    res.json({
      total_unidades: total,
      estados: estados.map(e => ({
        estado: e.estado,
        total: e._count.estado
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener las unidades', 
      details: error.message 
    });
  }
};

// TOTAL DE CONDUCTORES
exports.getConductoresStats = async (req, res) => {
  try {
    const total = await prisma.conductores.count({
where: {
  rol: 'conductor'
}
});

    res.json({
      total_conductores: total
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener los conductores', 
      details: error.message 
    });
  }
};

// TOTAL DE VIAJES POR ESTADO
exports.getViajesStats = async (req, res) => {
  try {
    const total = await prisma.viajes.count();

    const estados = await prisma.viajes.groupBy({
      by: ['estado'],
      _count: { estado: true }
    });

    res.json({
      total_viajes: total,
      estados: estados.map(e => ({
        estado: e.estado,
        total: e._count.estado
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener los viajes', 
      details: error.message 
    });
  }
};


// TOTAL DE ASCENSOS Y DESCENSOS POR RUTA

exports.getAscensosDescensosPorRuta = async (req, res) => {
  try {
    //  Agrupar  ascensos y descensos por viaje_id
    const agrupadoPorViaje = await prisma.bitacora_cupos.groupBy({
      by: ['viaje_id'],
      _sum: {
        ascensos: true,
        descensos: true,
      },
    });

    // Si no hay data devolvemos vacío
    if (agrupadoPorViaje.length === 0) {
      return res.json({ data: [] });
    }

    // Buscamos los nombres de las rutas de cada viaje
    const viajesConRuta = await prisma.viajes.findMany({
      where: {
        id: { in: agrupadoPorViaje.map(v => v.viaje_id) },
      },
      select: {
        id: true,
        rutas: {
          select: { nombre: true },
        },
      },
    });

    // Información del viaje con ruta y su info total
    const resultados = agrupadoPorViaje.map(item => {
      const viaje = viajesConRuta.find(v => v.id === item.viaje_id);
      const nombreRuta = viaje?.rutas?.nombre || 'Ruta no encontrada';
      return {
        ruta: nombreRuta,
        total_ascensos: item._sum.ascensos || 0,
        total_descensos: item._sum.descensos || 0,
      };
    });

    // Agrupamos por nombre de ruta 
    const resumenPorRuta = Object.values(
      resultados.reduce((acc, item) => {
        if (!acc[item.ruta]) {
          acc[item.ruta] = {
            ruta: item.ruta,
            total_ascensos: 0,
            total_descensos: 0,
          };
        }
        acc[item.ruta].total_ascensos += item.total_ascensos;
        acc[item.ruta].total_descensos += item.total_descensos;
        return acc;
      }, {})
    );
    res.json({ data: resumenPorRuta });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener la info de ascensos y descensos por ruta',
      details: error.message,
    });
  }
};
