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
//  ACTUALIZAR VUELTAS DEL VIAJE - MEJORADO
exports.actualizarVueltas = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { vueltas_completadas } = req.body;

    if (vueltas_completadas === undefined) {
      return res.status(400).json({ error: 'Faltan datos: vueltas_completadas' });
    }

    // ✅ Validar que sea un número válido
    const vueltasConDecimal = parseFloat(vueltas_completadas);
    if (isNaN(vueltasConDecimal)) {
      return res.status(400).json({ error: 'vueltas_completadas debe ser un número válido' });
    }

    // ✅ Redondear a 1 decimal para consistencia
    const vueltasRedondeadas = Math.round(vueltasConDecimal * 10) / 10;

    console.log(`🔄 Actualizando viaje ${id}: vueltas_completadas = ${vueltasRedondeadas}`);

    // Verificar que el viaje existe
    const viajeExistente = await prisma.viajes.findUnique({
      where: { id }
    });

    if (!viajeExistente) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    // ✅ ACTUALIZAR SOLO vueltas_completadas
    const viaje = await prisma.viajes.update({
      where: { id },
      data: {
        vueltas_completadas: vueltasRedondeadas
      },
      include: {
        unidades: true,
        conductores: true,
        rutas: true
      }
    });

    console.log(`✅ Viaje ${id} actualizado: ${vueltasRedondeadas.toFixed(1)} vueltas`);

    res.json({
      ...viaje,
      mensaje: `Vueltas actualizadas a ${vueltasRedondeadas.toFixed(1)}`
    });

  } catch (error) {
    console.error('❌ Error al actualizar vueltas:', error);
    res.status(500).json({ 
      error: 'Error al actualizar vueltas', 
      details: error.message 
    });
  }
};

//  OBTENER VUELTAS DEL VIAJE - MEJORADO
exports.getVueltas = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    console.log(`📊 Obteniendo vueltas del viaje ${id}`);

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

    // ✅ Devolver el valor con decimal
    const vueltas = viaje.vueltas_completadas || 0;
    console.log(`📊 Viaje ${id}: ${vueltas.toFixed(1)} vueltas`);

    res.json({
      id: viaje.id,
      vueltas_completadas: vueltas,
      total_vueltas_programadas: viaje.total_vueltas_programadas || 0,
      estado: viaje.estado
    });
  } catch (error) {
    console.error('❌ Error al obtener vueltas:', error);
    res.status(500).json({ 
      error: 'Error al obtener vueltas', 
      details: error.message 
    });
  }
};