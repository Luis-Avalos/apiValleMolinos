const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ===============================
    OBTENER TODOS LOS VIAJES
   =============================== */
exports.getViajes = async (req, res) => {
  try {
    const viajes = await prisma.viajes.findMany({
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        bitacora_cupos: true,
      },
    });
    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes', details: error.message });
  }
};

/* ===============================
    OBTENER VIAJE POR ID
   =============================== */
exports.getViajeById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.findUnique({
      where: { id },
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        bitacora_cupos: true,
      },
    });

    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viaje', details: error.message });
  }
};

/* ===============================
    CREAR UN NUEVO VIAJE
   =============================== */
exports.createViaje = async (req, res) => {
  try {
    const {
      ruta_id,
      fecha,
      hora_inicio,
      hora_fin,
      unidad_id,
      conductor_id,
      total_vueltas_programadas,
      estado,
    } = req.body;

    if (!ruta_id || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Faltan datos necesarios' });
    }

    const viaje = await prisma.viajes.create({
      data: {
        ruta_id: parseInt(ruta_id),
        fecha: new Date(fecha),
        hora_inicio: new Date(hora_inicio),
        hora_fin: new Date(hora_fin),
        unidad_id: unidad_id ? parseInt(unidad_id) : null,
        estado: estado || 'pendiente',
        total_vueltas_programadas: total_vueltas_programadas
          ? parseInt(total_vueltas_programadas)
          : 1,
      },
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
      },
    });

    // Si se asigna conductor y unidad, actualiza conductor en unidad
    if (conductor_id && unidad_id) {
      await prisma.unidades.update({
        where: { id: parseInt(unidad_id) },
        data: { conductor_id: parseInt(conductor_id) },
      });
    }

    res.status(201).json(viaje);
  } catch (error) {
    console.error('Error al crear viaje:', error);
    res.status(500).json({ error: 'Error al crear viaje', details: error.message });
  }
};

/* ===============================
    ASIGNAR CONDUCTOR / UNIDAD
   =============================== */
exports.asignarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { conductorId, unidadId } = req.body;

    if (isNaN(id) || !conductorId || !unidadId) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    await prisma.unidades.update({
      where: { id: unidadId },
      data: { conductor_id: conductorId },
    });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { unidad_id: unidadId },
      include: { unidades: { include: { conductores: true } }, rutas: true },
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar viaje', details: error.message });
  }
};

/* ===============================
    INICIAR VIAJE
   =============================== */
exports.iniciarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { estado: 'en_curso' },
      include: { unidades: { include: { conductores: true } }, rutas: true },
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar viaje', details: error.message });
  }
};

/* ===============================
    FINALIZAR VIAJE
   =============================== */
exports.finalizarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { estado: 'finalizado' },
      include: { unidades: { include: { conductores: true } }, rutas: true },
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al finalizar viaje', details: error.message });
  }
};

/* ===============================
    VIAJES POR CONDUCTOR
   =============================== */
exports.getViajesConductor = async (req, res) => {
  try {
    const conductorId = Number(req.params.id);
    if (isNaN(conductorId)) return res.status(400).json({ error: 'ID conductor inválido' });

    const viajes = await prisma.viajes.findMany({
      where: { unidades: { conductor_id: conductorId } },
      include: { unidades: { include: { conductores: true } }, rutas: true },
    });

    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes', details: error.message });
  }
};

/* ===============================
    ACTUALIZAR VIAJE
   =============================== */
exports.updateViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const {
      fecha,
      hora_inicio,
      hora_fin,
      unidad_id,
      conductor_id,
      ruta_id,
      estado,
      pasajeros_actuales,
      latitud,
      longitud,
    } = req.body;


    // Verifica existencia del viaje
    const viajeActual = await prisma.viajes.findUnique({
      where: { id },
      select: { pasajeros_actuales: true },
    });
    if (!viajeActual) return res.status(404).json({ error: 'Viaje no encontrado' });

    // Datos dinámicos a actualizar
    const dataToUpdate = {};
    if (fecha) dataToUpdate.fecha = new Date(fecha);
    if (hora_inicio) dataToUpdate.hora_inicio = new Date(hora_inicio);
    if (hora_fin) dataToUpdate.hora_fin = new Date(hora_fin);
    if (estado) dataToUpdate.estado = estado;

    //Asegurar que pasajeros_actuales se interprete como número
    const nuevosPasajeros =
      pasajeros_actuales !== undefined && pasajeros_actuales !== null
        ? Number(pasajeros_actuales)
        : undefined;

    if (!isNaN(nuevosPasajeros)) {
      dataToUpdate.pasajeros_actuales = nuevosPasajeros;
    }

    if (unidad_id) dataToUpdate.unidad_id = parseInt(unidad_id);
    if (ruta_id) dataToUpdate.ruta_id = parseInt(ruta_id);

    //Actualizar conductor si se manda
    if (conductor_id && unidad_id) {
      await prisma.unidades.update({
        where: { id: parseInt(unidad_id) },
        data: { conductor_id: parseInt(conductor_id) },
      });
    }

    // Actualizar el viaje
    const viaje = await prisma.viajes.update({
      where: { id },
      data: dataToUpdate,
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        bitacora_cupos: true,
      },
    });

    // Registrar en bitácora si cambia pasajeros_actuales
    if (!isNaN(nuevosPasajeros)) {
      const anterior = Number(viajeActual.pasajeros_actuales) || 0;
      const diferencia = nuevosPasajeros - anterior;

      console.log(`👥 Pasajeros antes: ${anterior}, ahora: ${nuevosPasajeros}, diferencia: ${diferencia}`);

      if (diferencia !== 0) {
        await prisma.bitacora_cupos.create({
          data: {
            viaje_id: id,
            latitud: latitud ? String(latitud) : '0.0',
            longitud: longitud ? String(longitud) : '0.0',
            ascensos: diferencia > 0 ? diferencia : 0,
            descensos: diferencia < 0 ? Math.abs(diferencia) : 0,
            fecha_hora: new Date(),
          },
        });

        console.log('Bitácora de cupos registrada correctamente');
      } else {
        console.log('No hubo cambio en pasajeros, no se registró bitácora');
      }
    } else {
      console.log('pasajeros_actuales no enviado o no es un número válido');
    }

    res.json(viaje);
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    res.status(500).json({ error: 'Error al actualizar viaje', details: error.message });
  }
};

/* ===============================
   OBTENER BITÁCORA DE CUPOS
   =============================== */
exports.getSubidas = async (req, res) => {
  try {
    const bitacoracupos = await prisma.bitacora_cupos.findMany({
      select: {
        id: true,
        viaje_id: true,
        latitud: true,
        longitud: true,
        ascensos: true,
        descensos: true,
        fecha_hora: true,
      },
      orderBy: { fecha_hora: 'desc' },
    });
    res.json(bitacoracupos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bitácora', details: error.message });
  }
};
