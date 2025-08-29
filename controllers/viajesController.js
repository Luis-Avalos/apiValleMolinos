const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los viajes
exports.getViajes = async (req, res) => {
  try {
    const viajes = await prisma.viajes.findMany({
      include: { unidades: { include: { conductores: true } }, rutas: true }
    });
    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes', details: error.message });
  }
};

// Obtener viaje por ID
exports.getViajeById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.findUnique({
      where: { id },
      include: { unidades: { include: { conductores: true } }, rutas: true }
    });

    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viaje', details: error.message });
  }
};

// Crear un nuevo viaje
exports.createViaje = async (req, res) => {
  try {
    const { ruta_id, fecha, hora_inicio, hora_fin } = req.body;
    if (!ruta_id || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Faltan datos necesarios' });
    }

    const viaje = await prisma.viajes.create({
      data: {
        ruta_id,
        fecha: new Date(fecha),
        hora_inicio: new Date(hora_inicio),
        hora_fin: new Date(hora_fin),
        estado: 'pendiente'
      }
    });

    res.status(201).json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear viaje', details: error.message });
  }
};

// Asignar conductor/unidad a un viaje
exports.asignarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { conductorId, unidadId } = req.body;

    if (isNaN(id) || !conductorId || !unidadId) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    await prisma.unidades.update({ where: { id: unidadId }, data: { conductor_id: conductorId } });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { unidad_id: unidadId },
      include: { unidades: { include: { conductores: true } }, rutas: true }
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar viaje', details: error.message });
  }
};

// Iniciar viaje
exports.iniciarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { estado: 'en_curso' },
      include: { unidades: { include: { conductores: true } }, rutas: true }
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar viaje', details: error.message });
  }
};

// Finalizar viaje
exports.finalizarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { estado: 'finalizado' },
      include: { unidades: { include: { conductores: true } }, rutas: true }
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al finalizar viaje', details: error.message });
  }
};

// Obtener viajes por conductor
exports.getViajesConductor = async (req, res) => {
  try {
    const conductorId = Number(req.params.id);
    if (isNaN(conductorId)) return res.status(400).json({ error: 'ID conductor inválido' });

    const viajes = await prisma.viajes.findMany({
      where: { unidades: { conductor_id: conductorId } },
      include: { unidades: { include: { conductores: true } }, rutas: true }
    });

    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes', details: error.message });
  }
};


// Actualizar viaje
exports.updateViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const dataToUpdate = {};
    const { fecha, hora_inicio, hora_fin, unidad_id, conductor_id, estado, pasajeros_actuales } = req.body;

    if (fecha) dataToUpdate.fecha = new Date(fecha);
    if (hora_inicio) dataToUpdate.hora_inicio = new Date(hora_inicio);
    if (hora_fin) dataToUpdate.hora_fin = new Date(hora_fin);
    if (unidad_id) dataToUpdate.unidad_id = unidad_id;
    if (conductor_id) dataToUpdate.conductor_id = conductor_id;
    if (estado) dataToUpdate.estado = estado;
    if (pasajeros_actuales !== undefined) dataToUpdate.pasajeros_actuales = pasajeros_actuales; 

    const viaje = await prisma.viajes.update({
      where: { id },
      data: dataToUpdate,
      include: {
        unidades: { include: { conductores: true } },
        rutas: true
      }
    });

    res.json(viaje);
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    res.status(500).json({ error: 'Error al actualizar viaje', details: error.message });
  }
};
