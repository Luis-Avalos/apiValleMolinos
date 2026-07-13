const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las vueltas
exports.getAllVueltas = async (req, res) => {
  try {
    const vueltas = await prisma.vueltas.findMany({
      include: { viajes: true, historial_pasajeros: true }
    });
    res.json(vueltas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vueltas', details: error.message });
  }
};

// Obtener vuelta por ID
exports.getVueltaById = async (req, res) => {
  try {
    const vuelta = await prisma.vueltas.findUnique({
      where: { id: Number(req.params.id) },
      include: { viajes: true, historial_pasajeros: true }
    });
    if (!vuelta) return res.status(404).json({ error: 'Vuelta no encontrada' });
    res.json(vuelta);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vuelta', details: error.message });
  }
};

// Crear vuelta
exports.createVuelta = async (req, res) => {
  try {
    const { viaje_id, numero_vuelta, hora_inicio_estimada, hora_fin_estimada, completada } = req.body;

    const nuevaVuelta = await prisma.vueltas.create({
      data: {
        viaje_id,
        numero_vuelta,
        hora_inicio_estimada: new Date(hora_inicio_estimada),
        hora_fin_estimada: new Date(hora_fin_estimada),
        completada
      }
    });

    res.status(201).json(nuevaVuelta);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear vuelta', details: error.message });
  }
};

// Actualizar vuelta
exports.updateVuelta = async (req, res) => {
  try {
    const { viaje_id, numero_vuelta, hora_inicio_estimada, hora_fin_estimada, completada } = req.body;

    const dataToUpdate = {};
    if (viaje_id) dataToUpdate.viaje_id = viaje_id;
    if (numero_vuelta !== undefined) dataToUpdate.numero_vuelta = numero_vuelta;
    if (hora_inicio_estimada) dataToUpdate.hora_inicio_estimada = new Date(hora_inicio_estimada);
    if (hora_fin_estimada) dataToUpdate.hora_fin_estimada = new Date(hora_fin_estimada);
    if (completada !== undefined) dataToUpdate.completada = completada;

    const vuelta = await prisma.vueltas.update({
      where: { id: Number(req.params.id) },
      data: dataToUpdate
    });

    res.json(vuelta);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar vuelta', details: error.message });
  }
};

// Eliminar vuelta
exports.deleteVuelta = async (req, res) => {
  try {
    await prisma.vueltas.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: 'Vuelta eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar vuelta', details: error.message });
  }
};

// ACTUALIZAR VUELTAS DEL VIAJE 
exports.actualizarVueltas = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { vueltas_completadas } = req.body; //  Solo necesitas esto

    if (vueltas_completadas === undefined) {
      return res.status(400).json({ error: 'Faltan datos: vueltas_completadas' });
    }

    // Verificar que el viaje existe
    const viajeExistente = await prisma.viajes.findUnique({
      where: { id }
    });

    if (!viajeExistente) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    //  Guardar el valor con decimal
    const vueltasConDecimal = parseFloat(vueltas_completadas);
    

    //  ACTUALIZAR SOLO vueltas_completadas
    const viaje = await prisma.viajes.update({
      where: { id },
      data: {
        vueltas_completadas: vueltasConDecimal
        // vueltascompletadasmanual NO se toca aquí
      },
      include: {
        unidades: true,
        conductores: true,
        rutas: true
      }
    });


    res.json({
      ...viaje,
      mensaje: `Vueltas actualizadas a ${vueltasConDecimal.toFixed(1)}`
    });

  } catch (error) {
    console.error('Error al actualizar vueltas:', error);
    res.status(500).json({ 
      error: 'Error al actualizar vueltas', 
      details: error.message 
    });
  }
};

// OBTENER VUELTAS DEL VIAJE
exports.getVueltas = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.findUnique({
      where: { id },
      select: {
        id: true,
        vueltas_completadas: true,
        total_vueltas_programadas: true,
        estado: true
      }
    });

    if (!viaje) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    //  Devolver el valor con decimal
    res.json({
      ...viaje,
      vueltas_completadas: viaje.vueltas_completadas || 0
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener vueltas', 
      details: error.message 
    });
  }
};
