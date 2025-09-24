const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear incidencia
const createIncidencia = async (req, res) => {
  try {
    const { conductor_id, unidad_id, viaje_id, descripcion, tipo } = req.body;

    if (!conductor_id || !unidad_id || !descripcion) {
      return res.status(400).json({ error: 'Campos obligatorios: conductor_id, unidad_id, descripcion' });
    }

    const incidencia = await prisma.incidencias.create({
      data: { conductor_id, unidad_id, viaje_id, descripcion, tipo }
    });

    // Emitir evento a todos los clientes conectados
    req.app.get("io").emit("nueva_incidencia", incidencia);

    res.json(incidencia);
  } catch (error) {
    console.error('Error al crear incidencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};


// Listar todas
const getIncidencias = async (req, res) => {
  try {
    const incidencias = await prisma.incidencias.findMany({
      include: {
        conductores: true,
        unidades: true,
        viajes: true
      },
      orderBy: { creado_en: 'desc' }
    });
    res.json(incidencias);
  } catch (error) {
    console.error('Error al obtener incidencias:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// Obtener por ID
const getIncidenciaById = async (req, res) => {
  try {
    const { id } = req.params;
    const incidencia = await prisma.incidencias.findUnique({
      where: { id: Number(id) },
      include: { conductores: true, unidades: true, viajes: true }
    });

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    res.json(incidencia);
  } catch (error) {
    console.error('Error al obtener incidencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = {
  createIncidencia,
  getIncidencias,
  getIncidenciaById
};
