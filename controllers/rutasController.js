const prisma = require('../models/userModel'); // tu prisma client

// Obtener todas las rutas
exports.getAllRutas = async (req, res) => {
  try {
    const rutas = await prisma.rutas.findMany();
    res.json(rutas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rutas', details: error.message });
  }
};

// Obtener ruta por ID
exports.getRutaById = async (req, res) => {
  try {
    const ruta = await prisma.rutas.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });
    res.json(ruta);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ruta', details: error.message });
  }
};

// Crear ruta
exports.createRuta = async (req, res) => {
  try {
    const { nombre, descripcion, puntos_json } = req.body;

    const nuevaRuta = await prisma.rutas.create({
      data: {
        nombre,
        descripcion,
        puntos_json: typeof puntos_json === 'string' ? JSON.parse(puntos_json) : puntos_json
      }
    });

    res.status(201).json(nuevaRuta);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear ruta', details: error.message });
  }
};

// Actualizar ruta
exports.updateRuta = async (req, res) => {
  try {
    const { nombre, descripcion, puntos_json } = req.body;

    const dataToUpdate = {};
    if (nombre) dataToUpdate.nombre = nombre;
    if (descripcion) dataToUpdate.descripcion = descripcion;
    if (puntos_json) {
      dataToUpdate.puntos_json = typeof puntos_json === 'string' ? JSON.parse(puntos_json) : puntos_json;
    }

    const ruta = await prisma.rutas.update({
      where: { id: Number(req.params.id) },
      data: dataToUpdate
    });

    res.json(ruta);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ruta', details: error.message });
  }
};


// Eliminar ruta
exports.deleteRuta = async (req, res) => {
  try {
    await prisma.rutas.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: 'Ruta eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ruta', details: error.message });
  }
};
