const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const prisma = new PrismaClient();

const CAMPOS_PERMITIDOS = new Set([
  'id',
  'viaje_id',
  'vuelta',
  'ascensos',
  'fecha_hora',
]);

const ASIENTOS_FIJOS = 16;
const ZONA_MX = 'America/Mexico_City';
// Matutino [05:00, 13:00] — Vespertino [14:00, 21:00] — gap 13:00–14:00
const MIN_MATUTINO_INI = 5 * 60;
const MIN_MATUTINO_FIN = 13 * 60;
const MIN_VESPERTINO_INI = 14 * 60;
const MIN_VESPERTINO_FIN = 21 * 60;

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

function toMexicoDt(date) {
  return DateTime.fromJSDate(date instanceof Date ? date : new Date(date), {
    zone: 'utc',
  }).setZone(ZONA_MX);
}

function esFinDeSemanaMx(dt) {
  return dt.weekday === 6 || dt.weekday === 7;
}

function minutosDelDia(dt) {
  return dt.hour * 60 + dt.minute;
}

/** matutino | vespertino | null (fuera de ventana / gap) */
function resolverTurnoPorHora(dt) {
  const mins = minutosDelDia(dt);
  if (mins >= MIN_MATUTINO_INI && mins <= MIN_MATUTINO_FIN) return 'matutino';
  if (mins >= MIN_VESPERTINO_INI && mins <= MIN_VESPERTINO_FIN) return 'vespertino';
  return null;
}

/**
 * Prioridad: turno del viaje; si no hay, inferir por hora del registro.
 * matutino | vespertino | null
 */
function resolverTurnoRegistro(viajeTurno, fechaHora) {
  const delViaje = resolverTurnoQuery(viajeTurno);
  if (delViaje) return delViaje;
  return resolverTurnoPorHora(toMexicoDt(fechaHora));
}

function redondearMultiploDe5(valor) {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor / 5) * 5;
}

/**
 * (sumaAscensos / ultimaVuelta / 16) * 100, redondeado a múltiplos de 5.
 */
function calcularPromedioOcupacion(totalAscensos, ultimaVuelta, asientos = ASIENTOS_FIJOS) {
  if (!ultimaVuelta || !asientos) {
    return {
      total_ascensos: totalAscensos || 0,
      ultima_vuelta: ultimaVuelta || 0,
      promedio_raw: 0,
      promedio: 0,
    };
  }

  const promedioRaw = (totalAscensos / ultimaVuelta / asientos) * 100;
  return {
    total_ascensos: totalAscensos,
    ultima_vuelta: ultimaVuelta,
    promedio_raw: Math.round(promedioRaw * 100) / 100,
    promedio: redondearMultiploDe5(promedioRaw),
  };
}

function agregarRegistros(registros) {
  let totalAscensos = 0;
  let ultimaVuelta = 0;

  for (const r of registros) {
    totalAscensos += Number(r.ascensos) || 0;
    const v = Number(r.vuelta);
    if (Number.isFinite(v) && v > ultimaVuelta) ultimaVuelta = v;
  }

  return calcularPromedioOcupacion(totalAscensos, ultimaVuelta);
}

function parseMes(mesStr) {
  if (!mesStr || !/^\d{4}-\d{2}$/.test(String(mesStr))) return null;
  const start = DateTime.fromISO(`${mesStr}-01`, { zone: ZONA_MX });
  if (!start.isValid) return null;
  return {
    inicio: start.startOf('day'),
    fin: start.endOf('month').endOf('day'),
  };
}

function parseRangoFechasQuery({ fecha, fecha_desde, fecha_hasta, mes }) {
  if (mes) {
    const rangoMes = parseMes(mes);
    if (!rangoMes) return { error: 'mes inválido (use YYYY-MM)' };
    return {
      gte: rangoMes.inicio.toUTC().toJSDate(),
      lte: rangoMes.fin.toUTC().toJSDate(),
      meta: {
        fecha_desde: rangoMes.inicio.toISODate(),
        fecha_hasta: rangoMes.fin.toISODate(),
        mes: String(mes),
      },
    };
  }

  if (fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return { error: 'fecha inválida (use YYYY-MM-DD)' };
    }
    const dia = DateTime.fromISO(fecha, { zone: ZONA_MX });
    if (!dia.isValid) return { error: 'fecha inválida' };
    return {
      gte: dia.startOf('day').toUTC().toJSDate(),
      lte: dia.endOf('day').toUTC().toJSDate(),
      meta: {
        fecha_desde: dia.toISODate(),
        fecha_hasta: dia.toISODate(),
      },
    };
  }

  if (!fecha_desde && !fecha_hasta) {
    return { error: 'indica fecha, fecha_desde/fecha_hasta o mes' };
  }

  let inicio;
  let fin;

  if (fecha_desde) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_desde)) {
      return { error: 'fecha_desde inválida (use YYYY-MM-DD)' };
    }
    inicio = DateTime.fromISO(fecha_desde, { zone: ZONA_MX }).startOf('day');
    if (!inicio.isValid) return { error: 'fecha_desde inválida' };
  }

  if (fecha_hasta) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_hasta)) {
      return { error: 'fecha_hasta inválida (use YYYY-MM-DD)' };
    }
    fin = DateTime.fromISO(fecha_hasta, { zone: ZONA_MX }).endOf('day');
    if (!fin.isValid) return { error: 'fecha_hasta inválida' };
  }

  if (inicio && !fin) fin = inicio.endOf('day');
  if (fin && !inicio) inicio = fin.startOf('day');

  if (inicio > fin) return { error: 'fecha_desde no puede ser posterior a fecha_hasta' };

  return {
    gte: inicio.toUTC().toJSDate(),
    lte: fin.toUTC().toJSDate(),
    meta: {
      fecha_desde: inicio.toISODate(),
      fecha_hasta: fin.toISODate(),
    },
  };
}

function resolverTurnoQuery(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const v = String(valor).toLowerCase().trim();
  if (v === 'matutino' || v === 'matutina') return 'matutino';
  if (v === 'vespertino' || v === 'vespertina') return 'vespertino';
  return undefined;
}

function excluirFinesSemanaQuery(valor) {
  if (valor === undefined || valor === null || valor === '') return true;
  const v = String(valor).toLowerCase().trim();
  if (v === 'false' || v === '0' || v === 'no') return false;
  return true;
}

/**
 * Promedio por día (y turno) desde registrovueltas.
 *
 * GET /promedio?tipo=enteros|medias|todos
 *   &viaje_id= | &ruta_id=
 *   &fecha= | &fecha_desde=&fecha_hasta= | &mes=YYYY-MM
 *   &turno=matutino|vespertino
 *   &excluir_fines_semana=true|false  (default true)
 */
exports.getPromedio = async (req, res) => {
  try {
    const {
      tipo,
      tipo_vuelta,
      viaje_id,
      ruta_id,
      fecha,
      fecha_desde,
      fecha_hasta,
      mes,
      turno,
      excluir_fines_semana,
    } = req.query;

    const tipoResuelto = resolverTipoVuelta(tipo ?? tipo_vuelta);
    if (tipoResuelto === undefined || tipoResuelto === null) {
      return res.status(400).json({
        error: 'tipo inválido o faltante (use enteros, medias o todos)',
      });
    }

    const turnoFiltro = resolverTurnoQuery(turno);
    if (turno !== undefined && turno !== null && turno !== '' && turnoFiltro === undefined) {
      return res.status(400).json({
        error: 'turno inválido (use matutino o vespertino)',
      });
    }

    const tieneViaje = viaje_id !== undefined && viaje_id !== null && viaje_id !== '';
    const tieneRuta = ruta_id !== undefined && ruta_id !== null && ruta_id !== '';

    if (!tieneViaje && !tieneRuta) {
      return res.status(400).json({
        error: 'indica viaje_id o ruta_id',
      });
    }
    if (tieneViaje && tieneRuta) {
      return res.status(400).json({
        error: 'no combines viaje_id y ruta_id en la misma solicitud',
      });
    }

    let viajeIdNum;
    let rutaIdNum;

    if (tieneViaje) {
      viajeIdNum = Number(viaje_id);
      if (Number.isNaN(viajeIdNum)) {
        return res.status(400).json({ error: 'viaje_id inválido' });
      }
    }
    if (tieneRuta) {
      rutaIdNum = Number(ruta_id);
      if (Number.isNaN(rutaIdNum)) {
        return res.status(400).json({ error: 'ruta_id inválido' });
      }
    }

    const rango = parseRangoFechasQuery({ fecha, fecha_desde, fecha_hasta, mes });
    if (rango.error) {
      return res.status(400).json({ error: rango.error });
    }

    const omitirFines = excluirFinesSemanaQuery(excluir_fines_semana);

    const whereViaje = tieneViaje
      ? { id: viajeIdNum }
      : { ruta_id: rutaIdNum };

    const registros = await prisma.registrovueltas.findMany({
      where: {
        fecha_hora: { gte: rango.gte, lte: rango.lte },
        viajes: whereViaje,
      },
      select: {
        id: true,
        viaje_id: true,
        vuelta: true,
        ascensos: true,
        fecha_hora: true,
        viajes: {
          select: {
            id: true,
            ruta_id: true,
            turno: true,
          },
        },
      },
      orderBy: { fecha_hora: 'asc' },
    });

    // Agrupar: fecha|turno|viaje_id → registros
    const gruposViaje = new Map();

    for (const reg of registros) {
      const dt = toMexicoDt(reg.fecha_hora);
      if (omitirFines && esFinDeSemanaMx(dt)) continue;

      const turnoReg = resolverTurnoRegistro(reg.viajes?.turno, reg.fecha_hora);
      if (!turnoReg) continue;
      if (turnoFiltro && turnoReg !== turnoFiltro) continue;

      const fechaKey = dt.toISODate();
      const key = `${fechaKey}|${turnoReg}|${reg.viaje_id}`;

      if (!gruposViaje.has(key)) {
        gruposViaje.set(key, {
          fecha: fechaKey,
          turno: turnoReg,
          viaje_id: reg.viaje_id,
          ruta_id: reg.viajes?.ruta_id ?? null,
          registros: [],
        });
      }
      gruposViaje.get(key).registros.push(reg);
    }

    // Por día+turno: promedio de los promedios de cada viaje
    const gruposDia = new Map();

    for (const g of gruposViaje.values()) {
      const enterosRegs = g.registros.filter((r) => esVueltaEntera(r.vuelta));
      const mediasRegs = g.registros.filter((r) => esVueltaMedia(r.vuelta));

      const datosEnteros =
        tipoResuelto === 'enteros' || tipoResuelto === 'todas'
          ? agregarRegistros(enterosRegs)
          : null;
      const datosMedias =
        tipoResuelto === 'medias' || tipoResuelto === 'todas'
          ? agregarRegistros(mediasRegs)
          : null;

      // Sin datos útiles para el tipo pedido → omitir viaje
      const sinEnteros =
        datosEnteros && datosEnteros.ultima_vuelta === 0 && datosEnteros.total_ascensos === 0;
      const sinMedias =
        datosMedias && datosMedias.ultima_vuelta === 0 && datosMedias.total_ascensos === 0;

      if (tipoResuelto === 'enteros' && sinEnteros) continue;
      if (tipoResuelto === 'medias' && sinMedias) continue;
      if (tipoResuelto === 'todas' && sinEnteros && sinMedias) continue;

      const diaKey = `${g.fecha}|${g.turno}`;
      if (!gruposDia.has(diaKey)) {
        gruposDia.set(diaKey, {
          fecha: g.fecha,
          turno: g.turno,
          viajes: [],
        });
      }

      gruposDia.get(diaKey).viajes.push({
        viaje_id: g.viaje_id,
        ruta_id: g.ruta_id,
        ...(datosEnteros ? { enteros: datosEnteros } : {}),
        ...(datosMedias ? { medias: datosMedias } : {}),
      });
    }

    function promedioTurnoDesdeViajes(viajes, campo) {
      const vals = viajes
        .map((v) => v[campo])
        .filter((e) => e && e.ultima_vuelta > 0);
      const avgRaw =
        vals.length > 0
          ? vals.reduce((s, e) => s + e.promedio_raw, 0) / vals.length
          : 0;
      return {
        viajes_con_datos: vals.length,
        promedio_raw: Math.round(avgRaw * 100) / 100,
        promedio: redondearMultiploDe5(avgRaw),
      };
    }

    function armarItemTurno(dia) {
      const item = {
        fecha: dia.fecha,
        turno: dia.turno,
        viajes_contados: dia.viajes.length,
        detalle_viajes: dia.viajes,
      };

      if (tipoResuelto === 'enteros' || tipoResuelto === 'todas') {
        item.enteros = promedioTurnoDesdeViajes(dia.viajes, 'enteros');
      }
      if (tipoResuelto === 'medias' || tipoResuelto === 'todas') {
        item.medias = promedioTurnoDesdeViajes(dia.viajes, 'medias');
      }
      return item;
    }

    /** (matutino + vespertino) / N turnos con dato → promedio del día completo */
    function promedioDiaCompleto(mat, vesp) {
      const partes = [mat, vesp].filter(
        (p) => p && p.viajes_con_datos > 0
      );
      if (partes.length === 0) {
        return { turnos_contados: 0, promedio_raw: 0, promedio: 0 };
      }
      const avgRaw =
        partes.reduce((s, p) => s + p.promedio_raw, 0) / partes.length;
      return {
        turnos_contados: partes.length,
        promedio_raw: Math.round(avgRaw * 100) / 100,
        promedio: redondearMultiploDe5(avgRaw),
      };
    }

    const porTurno = [...gruposDia.values()]
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return a.turno.localeCompare(b.turno);
      })
      .map(armarItemTurno);

    let porDia;
    let promedio_final = {};

    if (turnoFiltro) {
      // Filtro matutino/vespertino: se mantiene el desglose por turno
      porDia = porTurno;

      function promedioFinalDeTurnos(campo) {
        const diasConDato = porDia.filter(
          (d) => d[campo] && d[campo].viajes_con_datos > 0
        );
        if (diasConDato.length === 0) {
          return { dias_contados: 0, promedio_raw: 0, promedio: 0 };
        }
        const suma = diasConDato.reduce((s, d) => s + d[campo].promedio_raw, 0);
        const avgRaw = suma / diasConDato.length;
        return {
          dias_contados: diasConDato.length,
          promedio_raw: Math.round(avgRaw * 100) / 100,
          promedio: redondearMultiploDe5(avgRaw),
        };
      }

      if (tipoResuelto === 'enteros' || tipoResuelto === 'todas') {
        promedio_final.enteros = promedioFinalDeTurnos('enteros');
      }
      if (tipoResuelto === 'medias' || tipoResuelto === 'todas') {
        promedio_final.medias = promedioFinalDeTurnos('medias');
      }
    } else {
      // Sin filtro de turno: unificar matutino + vespertino por fecha
      // día_completo = (promedio_matutino + promedio_vespertino) / turnos_con_dato
      const porFecha = new Map();

      for (const item of porTurno) {
        if (!porFecha.has(item.fecha)) {
          porFecha.set(item.fecha, {
            fecha: item.fecha,
            matutino: null,
            vespertino: null,
          });
        }
        const slot = porFecha.get(item.fecha);
        if (item.turno === 'matutino') slot.matutino = item;
        if (item.turno === 'vespertino') slot.vespertino = item;
      }

      porDia = [...porFecha.values()]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((dia) => {
          const out = {
            fecha: dia.fecha,
            turno: 'dia_completo',
            matutino: dia.matutino
              ? {
                  viajes_contados: dia.matutino.viajes_contados,
                  detalle_viajes: dia.matutino.detalle_viajes,
                  ...(dia.matutino.enteros
                    ? { enteros: dia.matutino.enteros }
                    : {}),
                  ...(dia.matutino.medias
                    ? { medias: dia.matutino.medias }
                    : {}),
                }
              : null,
            vespertino: dia.vespertino
              ? {
                  viajes_contados: dia.vespertino.viajes_contados,
                  detalle_viajes: dia.vespertino.detalle_viajes,
                  ...(dia.vespertino.enteros
                    ? { enteros: dia.vespertino.enteros }
                    : {}),
                  ...(dia.vespertino.medias
                    ? { medias: dia.vespertino.medias }
                    : {}),
                }
              : null,
          };

          if (tipoResuelto === 'enteros' || tipoResuelto === 'todas') {
            out.enteros = promedioDiaCompleto(
              dia.matutino?.enteros,
              dia.vespertino?.enteros
            );
          }
          if (tipoResuelto === 'medias' || tipoResuelto === 'todas') {
            out.medias = promedioDiaCompleto(
              dia.matutino?.medias,
              dia.vespertino?.medias
            );
          }

          return out;
        });

      function promedioFinalDeDiasCompletos(campo) {
        const diasConDato = porDia.filter(
          (d) => d[campo] && d[campo].turnos_contados > 0
        );
        if (diasConDato.length === 0) {
          return { dias_contados: 0, promedio_raw: 0, promedio: 0 };
        }
        const suma = diasConDato.reduce((s, d) => s + d[campo].promedio_raw, 0);
        const avgRaw = suma / diasConDato.length;
        return {
          dias_contados: diasConDato.length,
          promedio_raw: Math.round(avgRaw * 100) / 100,
          promedio: redondearMultiploDe5(avgRaw),
        };
      }

      if (tipoResuelto === 'enteros' || tipoResuelto === 'todas') {
        promedio_final.enteros = promedioFinalDeDiasCompletos('enteros');
      }
      if (tipoResuelto === 'medias' || tipoResuelto === 'todas') {
        promedio_final.medias = promedioFinalDeDiasCompletos('medias');
      }
    }

    res.json({
      filtros: {
        tipo: tipoResuelto === 'todas' ? 'todos' : tipoResuelto,
        ...(tieneViaje ? { viaje_id: viajeIdNum } : {}),
        ...(tieneRuta ? { ruta_id: rutaIdNum } : {}),
        ...rango.meta,
        turno: turnoFiltro,
        excluir_fines_semana: omitirFines,
        asientos: ASIENTOS_FIJOS,
        ventana_matutino: '05:00-13:00',
        ventana_vespertino: '14:00-21:00',
        fuente_turno: 'viaje.turno (fallback: hora del registro)',
      },
      por_dia: porDia,
      promedio_final,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al calcular promedio',
      details: error.message,
    });
  }
};

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
exports.calcularPromedioOcupacion = calcularPromedioOcupacion;
exports.agregarRegistros = agregarRegistros;
exports.resolverTurnoPorHora = resolverTurnoPorHora;
exports.resolverTurnoRegistro = resolverTurnoRegistro;
exports.redondearMultiploDe5 = redondearMultiploDe5;
exports.ASIENTOS_FIJOS = ASIENTOS_FIJOS;