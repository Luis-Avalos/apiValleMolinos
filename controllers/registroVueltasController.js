const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CAMPOS_PERMITIDOS = new Set([
  'id',
  'viaje_id',
  'vuelta',
  'ascensos',
  'fecha_hora',
]);

function esVueltaValida(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return false;
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

function esVueltaEntera(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n - Math.round(n)) < 1e-9;
}

function esVueltaMedia(valor) {
  return esVueltaValida(valor) && !esVueltaEntera(valor);
}

/** enteros | medias | todas | null (sin filtro) | undefined (inválido) */
function resolverTipoVuelta(valor) {
  if (valor === undefined || valor === null || valor === '') return null;

  const v = String(valor).toLowerCase().trim();
  if (v === 'enteros' || v === 'entero') return 'enteros';
  if (v === 'medias' || v === 'media') return 'medias';
  if (v === 'todas' || v === 'todos') return 'todas';
  return undefined;
}

function filtrarPorTipoVuelta(registros, tipo) {
  if (!tipo) return registros;

  return registros.filter((r) => {
    const v = r.vuelta;
    if (tipo === 'enteros') return esVueltaEntera(v);
    if (tipo === 'medias') return esVueltaMedia(v);
    // todas: enteros + .5
    return esVueltaValida(v);
  });
}

function normalizarVuelta(valor) {
  return Math.round(Number(valor) * 10) / 10;
}

function inicioFinDelDia(fechaStr) {
  const inicio = new Date(fechaStr);
  if (Number.isNaN(inicio.getTime())) return null;

  // Si solo mandan YYYY-MM-DD, cubrir todo ese día en UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 1);
    return { gte: inicio, lt: fin };
  }

  return { gte: inicio, lte: inicio };
}

function buildSelect(camposQuery) {
  if (!camposQuery) return undefined;

  const select = {};
  for (const campo of String(camposQuery).split(',')) {
    const key = campo.trim();
    if (CAMPOS_PERMITIDOS.has(key)) select[key] = true;
  }

  return Object.keys(select).length ? select : undefined;
}

function buildWhere(query) {
  const {
    id,
    viaje_id,
    vuelta,
    ascensos,
    fecha,
    fecha_desde,
    fecha_hasta,
    tipo_vuelta,
  } = query;

  const where = {};
  const errores = [];

  const tipoVuelta = resolverTipoVuelta(tipo_vuelta);
  if (tipo_vuelta !== undefined && tipo_vuelta !== null && tipo_vuelta !== '' && tipoVuelta === undefined) {
    errores.push('tipo_vuelta inválido (use enteros, medias o todas)');
  }

  if (tipoVuelta && vuelta !== undefined) {
    errores.push('no combines vuelta y tipo_vuelta en la misma solicitud');
  }

  if (id !== undefined) {
    const n = Number(id);
    if (Number.isNaN(n)) errores.push('id inválido');
    else where.id = n;
  }

  if (viaje_id !== undefined) {
    const n = Number(viaje_id);
    if (Number.isNaN(n)) errores.push('viaje_id inválido');
    else where.viaje_id = n;
  }

  if (vuelta !== undefined) {
    const n = Number(vuelta);
    if (Number.isNaN(n)) errores.push('vuelta inválida');
    else where.vuelta = normalizarVuelta(n);
  }

  if (ascensos !== undefined) {
    const n = Number(ascensos);
    if (!Number.isInteger(n) || n < 0) errores.push('ascensos inválido');
    else where.ascensos = n;
  }

  if (fecha !== undefined) {
    const rango = inicioFinDelDia(fecha);
    if (!rango) errores.push('fecha inválida');
    else where.fecha_hora = rango;
  } else if (fecha_desde || fecha_hasta) {
    where.fecha_hora = {};
    if (fecha_desde) {
      const d = new Date(fecha_desde);
      if (Number.isNaN(d.getTime())) errores.push('fecha_desde inválida');
      else where.fecha_hora.gte = d;
    }
    if (fecha_hasta) {
      const d = new Date(fecha_hasta);
      if (Number.isNaN(d.getTime())) errores.push('fecha_hasta inválida');
      else {
        // Si es solo día (YYYY-MM-DD), incluir ese día completo
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha_hasta)) {
          d.setUTCDate(d.getUTCDate() + 1);
          where.fecha_hora.lt = d;
        } else {
          where.fecha_hora.lte = d;
        }
      }
    }
  }

  return { where, errores, tipoVuelta };
}

async function getRegistroById(id) {
  return prisma.registrovueltas.findUnique({
    where: { id },
  });
}

async function getRegistrosByViajeId(viajeId) {
  return prisma.registrovueltas.findMany({
    where: { viaje_id: viajeId },
    orderBy: { fecha_hora: 'asc' },
  });
}

exports.createRegistroVuelta = async (req, res) => {
  try {
    const { viaje_id, vuelta, ascensos, fecha_hora } = req.body;

    
    if (viaje_id === undefined || vuelta === undefined || ascensos === undefined) {
      return res.status(400).json({
        error: 'Faltan datos: viaje_id, vuelta y ascensos son requeridos',
      });
    }

    const viajeId = Number(viaje_id);
    const ascensosNum = Number(ascensos);

    if (Number.isNaN(viajeId)) {
      return res.status(400).json({ error: 'viaje_id inválido' });
    }

    if (!esVueltaValida(vuelta)) {
      return res.status(400).json({
        error: 'vuelta debe ser un entero o media vuelta (ej. 0.5, 1, 1.5, 2.5)',
      });
    }

    if (!Number.isInteger(ascensosNum) || ascensosNum < 0) {
      return res.status(400).json({ error: 'ascensos debe ser un entero >= 0' });
    }

    const viaje = await prisma.viajes.findUnique({ where: { id: viajeId } });
    if (!viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const vueltaNorm = normalizarVuelta(vuelta);

    const registro = await prisma.$transaction(async (tx) => {
      const creado = await tx.registrovueltas.create({
        data: {
          viaje_id: viajeId,
          vuelta: vueltaNorm,
          ascensos: ascensosNum,
          ...(fecha_hora ? { fecha_hora: new Date(fecha_hora) } : {}),
        },
      });

      // Mantener sincronizado el contador del viaje con la última vuelta registrada
      const actualVueltas = viaje.vueltas_completadas ?? 0;
      if (vueltaNorm >= actualVueltas) {
        await tx.viajes.update({
          where: { id: viajeId },
          data: { vueltas_completadas: vueltaNorm },
        });
      }

      return creado;
    });

    res.status(201).json(registro);
  } catch (error) {
    res.status(500).json({
      error: 'Error al crear registro de vuelta',
      details: error.message,
    });
  }
};

/**
 * GET flexible — filtra por query params  opcionalmente proyecta columnas.
 * Ejemplos:
 *   GET /?viaje_id=12
 *   GET /?vuelta=1.5
 *   GET /?tipo_vuelta=enteros&viaje_id=12
 *   GET /?tipo_vuelta=medias&viaje_id=12
 *   GET /?tipo_vuelta=todas&viaje_id=12
 *   GET /?ascensos=10
 *   GET /?fecha=2026-09-07
 *   GET /?fecha_desde=2026-09-01&fecha_hasta=2026-09-15
 *   GET /?viaje_id=12&vuelta=1.5&campos=vuelta,ascensos,fecha_hora
 */
exports.getRegistrosVueltas = async (req, res) => {

  try {
    const { where, errores, tipoVuelta } = buildWhere(req.query);
    if (errores.length) {
      return res.status(400).json({ error: errores.join(', ') });
    }

    const select = buildSelect(req.query.campos);
    const order =
      req.query.order === 'asc' ? 'asc' : 'desc';

    // Si se filtra por tipo, necesitamos el campo vuelta aunque no esté en campos
    const selectConVuelta =
      tipoVuelta && select && !select.vuelta
        ? { ...select, vuelta: true }
        : select;

    const registros = await prisma.registrovueltas.findMany({
      where,
      ...(selectConVuelta ? { select: selectConVuelta } : {}),
      orderBy: { fecha_hora: order },
    });

    const filtrados = filtrarPorTipoVuelta(registros, tipoVuelta);

    // Si el cliente no pidió vuelta en campos, quitarla del resultado
    if (tipoVuelta && select && !select.vuelta) {
      for (const r of filtrados) delete r.vuelta;
    }

    res.json(filtrados);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener registros de vueltas',
      details: error.message,
    });
  }
};

// GET — por id de registro
exports.getRegistroVueltaById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const registro = await getRegistroById(id);
    if (!registro) {
      return res.status(404).json({ error: 'Registro de vuelta no encontrado' });
    }

    res.json(registro);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener registro de vuelta',
      details: error.message,
    });
  }
};

// GET — todos los registros de un viaje (/viaje/:viajeId)
exports.getRegistrosByViaje = async (req, res) => {
  try {
    const viajeId = Number(req.params.viajeId);
    if (Number.isNaN(viajeId)) {
      return res.status(400).json({ error: 'viaje_id inválido' });
    }

    const viaje = await prisma.viajes.findUnique({ where: { id: viajeId } });
    if (!viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const registros = await getRegistrosByViajeId(viajeId);
    res.json(registros);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener registros del viaje',
      details: error.message,
    });
  }
};



exports.esVueltaValida = esVueltaValida;
exports.esVueltaEntera = esVueltaEntera;
exports.esVueltaMedia = esVueltaMedia;
exports.resolverTipoVuelta = resolverTipoVuelta;
exports.filtrarPorTipoVuelta = filtrarPorTipoVuelta;
exports.normalizarVuelta = normalizarVuelta;
exports.buildWhere = buildWhere;
exports.buildSelect = buildSelect;
exports.getRegistroById = getRegistroById;
exports.getRegistrosByViajeId = getRegistrosByViajeId;