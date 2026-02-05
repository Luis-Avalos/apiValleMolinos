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
      by: ['viaje_id', 'fecha'],
      _sum: {
        ascensos: true,
        descensos: true,
        ciudadanosfaltante: true,
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
        total_sin_cupo: item._sum.ciudadanosfaltante || 0,
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
            total_sin_cupo: 0,
          };
        }
        acc[item.ruta].total_ascensos += item.total_ascensos;
        acc[item.ruta].total_descensos += item.total_descensos;
        acc[item.ruta].total_sin_cupo += item.total_sin_cupo;
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

// TOTAL DE VUELTAS POR RUTA
// exports.getTotalPorVuelta = async (req, res) => {
//   try {
//     //  Agrupar  ascensos y descensos por viaje_id
//     const agrupadoPorViaje = await prisma.viajes.groupBy({
//       by: ['ruta_id', 'fecha'], 
//       _sum: {
//         vueltas_completadas: true,
//         vueltascompletadasmanual: true,
//       },
//     });

//     // Si no hay data devolvemos vacío
//     if (agrupadoPorViaje.length === 0) {
//       return res.json({ data: [] });
//     }

//     //nombres de rutas de cada viaje
//     const viajesConRuta = await prisma.rutas.findMany({
//       where: {
//         id: { in: agrupadoPorViaje.map(v => v.ruta_id) },
//       },
//       select: {
//         id: true,
//         nombre: true ,
//       },
//     });

//     // Información del viaje con ruta y su info 
//     const resultados = agrupadoPorViaje.map(item => {
//     const ruta = viajesConRuta.find(r => r.id === item.ruta_id); 
//     return {
//       ruta: ruta?.nombre || 'Ruta no encontrada',
//        fecha: item.fecha,
//       vueltas_completadas: item._sum.vueltas_completadas || 0,
//       vueltascompletadasmanual: item._sum.vueltascompletadasmanual || 0,
//     };
//   });


//     // Agrupamos nombre ruta 
//     const resumenPorRuta = Object.values(
//       resultados.reduce((acc, item) => {
//         if (!acc[item.ruta]) {
//           acc[item.ruta] = {
//             ruta: item.ruta,
//              fecha: item.fecha,
//             vueltas_completadas: 0,
//             vueltascompletadasmanual: 0,
//           };
//         }
//         acc[item.ruta].vueltas_completadas += item.vueltas_completadas;
//         acc[item.ruta].vueltascompletadasmanual += item.vueltascompletadasmanual;
//         return acc;
//       }, {})
//     );
//     res.json({ data: resumenPorRuta });
//   } catch (error) {
//     res.status(500).json({
//       error: 'Error al obtener la info de vueltas por ruta',
//       details: error.message,
//     });
//   }
// };
// TOTAL DE VUELTAS POR RUTA
exports.getTotalPorVuelta = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    // where dinámico (fechas opcionales)
    const where = {};

    if (fechaInicio && fechaFin) {
      where.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    const agrupado = await prisma.viajes.groupBy({
      by: ['ruta_id'],
      where,
      _sum: {
        vueltas_completadas: true,
        vueltascompletadasmanual: true,
      },
    });

    if (!agrupado.length) {
      return res.json({ data: [] });
    }

    // Traer nombres de rutas
    const rutas = await prisma.rutas.findMany({
      where: {
        id: { in: agrupado.map(v => v.ruta_id) },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const data = agrupado.map(item => {
      const ruta = rutas.find(r => r.id === item.ruta_id);

      return {
        ruta: ruta?.nombre || 'Ruta no encontrada',
        vueltas_completadas: item._sum.vueltas_completadas ?? 0,
        vueltascompletadasmanual: item._sum.vueltascompletadasmanual ?? 0,
      };
    });

    res.json({ data });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error al obtener la info de vueltas por ruta',
      details: error.message,
    });
  }
};


exports.addVueltaManual = async (req, res) => {
  try {
    const viajeId = Number(req.params.id);
    const conductorId = req.body.conductor_id;

    if (isNaN(viajeId)) {
      return res.status(400).json({ error: 'ID de viaje inválido' });
    }

    const viaje = await prisma.viajes.findUnique({
      where: { id: viajeId }
    });

    if (!viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    if (viaje.estado !== 'en_curso') {
      return res.status(400).json({ error: 'El viaje no está en curso' });
    }

    const actualizado = await prisma.viajes.update({
      where: { id: viajeId },
      data: {
        vueltascompletadasmanual: { increment: 1 }
      }
    });

    res.json({
      id: actualizado.id,
      vueltascompletadasmanual: actualizado.vueltascompletadasmanual
    });

  } catch (error) {
    console.error('Error addVueltaManual:', error);
    res.status(500).json({
      error: 'Error al registrar vuelta manual',
      details: error.message
    });
  }
};

