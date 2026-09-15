const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ASIENTOS_DEFAULT = 16;


async function getViajeById(id) {
  return prisma.viajes.findUnique({
    where: { id },
    select: {
      id: true,
      ruta_id: true,
      fecha: true,
      turno: true,
      vueltas_completadas: true,
      vueltascompletadasmanual: true,
      unidades: {
        select: { capacidad: true },
      },
    },
  });
}

async function getSumaAscensosByViajeId(viajeId) {
  const result = await prisma.bitacora_cupos.aggregate({
    where: { viaje_id: viajeId },
    _sum: { ascensos: true },
  });
  return result._sum.ascensos ?? 0;
}

/** Ascensos y vueltas desde registrovueltas (enteros o medias: 0.5, 1.5, ...) */
async function getDatosRegistroVueltasByViajeId(viajeId) {
  const [sumaAscensos, maxVuelta] = await Promise.all([
    prisma.registrovueltas.aggregate({
      where: { viaje_id: viajeId },
      _sum: { ascensos: true },
    }),
    prisma.registrovueltas.aggregate({
      where: { viaje_id: viajeId },
      _max: { vuelta: true },
    }),
  ]);

  return {
    total_ascensos: sumaAscensos._sum.ascensos ?? 0,
    vueltas: maxVuelta._max.vuelta ?? 0,
  };
}

function getRutaId(viaje) {
  return viaje.ruta_id ?? null;
}

function getFechaViaje(viaje) {
  return viaje.fecha ?? null;
}

function getTurno(viaje) {
  return viaje.turno ?? null;
}

function getVueltasCompletadasManual(viaje) {
  return viaje.vueltascompletadasmanual ?? 0;
}

function getVueltasCompletadas(viaje) {
  return viaje.vueltas_completadas ?? 0;
}

function getAsientos(viaje) {
  return viaje.unidades?.capacidad ?? ASIENTOS_DEFAULT;
}

function calcularPromedioPorTurno(totalAscensos, vueltasManuales, asientos) {
  if (!vueltasManuales || !asientos) return 0;

  const promedioBruto = totalAscensos / vueltasManuales;
  return (promedioBruto / asientos) * 100;
}

function extraerDatosPromedio(viaje, totalAscensos) {
  return {
    viaje_id: viaje.id,
    ruta_id: getRutaId(viaje),
    fecha: getFechaViaje(viaje),
    turno: getTurno(viaje),
    vueltascompletadasmanual: getVueltasCompletadasManual(viaje),
    vueltas_completadas: getVueltasCompletadas(viaje),
    asientos: getAsientos(viaje),
    total_ascensos: totalAscensos,
  };
}

exports.getDatosPromedioByViajeId = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const [viaje, totalAscensos] = await Promise.all([
      getViajeById(id),
      getSumaAscensosByViajeId(id),
    ]);

    if (!viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const asientos = getAsientos(viaje);
    const vueltasManuales = getVueltasCompletadasManual(viaje);
    const promedioPorTurno = calcularPromedioPorTurno(
      totalAscensos,
      vueltasManuales,
      asientos
    );
    const promedio_redondeado = Math.round(promedioPorTurno / 5) * 5;

    res.json({
      ...extraerDatosPromedio(viaje, totalAscensos),
      promedio_por_turno: promedio_redondeado,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener datos de promedio',
      details: error.message,
    });
  }
};

/**
 * Promedio con vueltas completas / medias desde registrovueltas.
 * Misma fórmula: (totalAscensos / vueltas / asientos) * 100, redondeado a múltiplos de 5.
 */
exports.getDatosPromedioVueltasCompletasByViajeId = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const [viaje, datosRegistro] = await Promise.all([
      getViajeById(id),
      getDatosRegistroVueltasByViajeId(id),
    ]);

    if (!viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const asientos = getAsientos(viaje);
    const vueltas =
      datosRegistro.vueltas || getVueltasCompletadas(viaje) || 0;
    const totalAscensos = datosRegistro.total_ascensos;

    const promedioPorTurno = calcularPromedioPorTurno(
      totalAscensos,
      vueltas,
      asientos
    );
    const promedio_redondeado = Math.round(promedioPorTurno / 5) * 5;

    res.json({
      ...extraerDatosPromedio(viaje, totalAscensos),
      vueltas_para_promedio: vueltas,
      fuente_ascensos: 'registrovueltas',
      promedio_por_turno: promedio_redondeado,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener promedio de vueltas completas',
      details: error.message,
    });
  }
};

exports.getViajeById = getViajeById;
exports.getSumaAscensosByViajeId = getSumaAscensosByViajeId;
exports.getDatosRegistroVueltasByViajeId = getDatosRegistroVueltasByViajeId;
exports.getRutaId = getRutaId;
exports.getFechaViaje = getFechaViaje;
exports.getTurno = getTurno;
exports.getVueltasCompletadasManual = getVueltasCompletadasManual;
exports.getVueltasCompletadas = getVueltasCompletadas;
exports.getAsientos = getAsientos;
exports.calcularPromedioPorTurno = calcularPromedioPorTurno;
exports.extraerDatosPromedio = extraerDatosPromedio;