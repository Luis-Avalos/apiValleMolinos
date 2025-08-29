const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- VIAJES ---

// Obtener todos los viajes
exports.getViajes = async (req, res) => {
  try {
    const viajes = await prisma.viajes.findMany({
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        vueltas: true
      }
    });
    res.json(viajes);
  } catch (error) {
    console.error(error);
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
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        vueltas: true
      }
    });

    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });

    res.json(viaje);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener viaje', details: error.message });
  }
};

// Crear un viaje
exports.createViaje = async (req, res) => {
  try {
    const { ruta_id, fecha, hora_inicio, hora_fin } = req.body;
    if (!ruta_id || !fecha || !hora_inicio || !hora_fin)
      return res.status(400).json({ error: 'Datos incompletos' });

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
    console.error(error);
    res.status(500).json({ error: 'Error al crear viaje', details: error.message });
  }
};

// Actualizar viaje (asignar conductor/unidad o campos generales)
exports.updateViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { conductorId, unidadId, estado } = req.body;

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const data = {};
    if (unidadId) data.unidad_id = unidadId;
    if (estado) data.estado = estado;

    // Asignar conductor a la unidad si se manda
    if (unidadId && conductorId) {
      await prisma.unidades.update({
        where: { id: unidadId },
        data: { conductor_id: conductorId }
      });
    }

    const viaje = await prisma.viajes.update({
      where: { id },
      data,
      include: { unidades: { include: { conductores: true } }, rutas: true, vueltas: true }
    });

    res.json(viaje);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar viaje', details: error.message });
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
      include: { unidades: { include: { conductores: true } }, rutas: true, vueltas: true }
    });

    res.json(viaje);
  } catch (error) {
    console.error(error);
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
      include: { unidades: { include: { conductores: true } }, rutas: true, vueltas: true }
    });

    res.json(viaje);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al finalizar viaje', details: error.message });
  }
};

// Obtener viajes de un conductor
exports.getViajesConductor = async (req, res) => {
  try {
    const conductorId = Number(req.params.id);
    if (isNaN(conductorId)) return res.status(400).json({ error: 'ID de conductor inválido' });

    const viajes = await prisma.viajes.findMany({
      where: { unidades: { conductor_id: conductorId } },
      include: { unidades: { include: { conductores: true } }, rutas: true, vueltas: true }
    });

    if (!viajes.length) return res.status(404).json({ error: 'No se encontraron viajes' });

    res.json(viajes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener viajes del conductor', details: error.message });
  }
};
