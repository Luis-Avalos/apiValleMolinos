const prisma = require('../models/userModel');


// Obtener todas las unidades
exports.getAllUnidades = async (req, res) => {
  try {
    const unidades = await prisma.unidades.findMany({
      include: { conductores: true } 
    });
    res.json(unidades);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener unidades', details: error.message });
  }
};

// Obtener unidad por ID
exports.getUnidadById = async (req, res) => {
  try {
    const unidad = await prisma.unidades.findUnique({
      where: { id: Number(req.params.id) },
      include: { conductores: true }
    });
    if (!unidad) return res.status(404).json({ error: 'Unidad no encontrada' });
    res.json(unidad);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener unidad', details: error.message });
  }
};

// Crear unidad
exports.createUnidad = async (req, res) => {
  try {
    const { numero_economico, placas, capacidad, estado, conductor_id, foto_url } = req.body;

    const nuevo = await prisma.unidades.create({
      data: { numero_economico, placas, capacidad, estado, conductor_id, foto_url }
    });

    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear unidad', details: error.message });
  }
};

// Actualizar unidad
exports.updateUnidad = async (req, res) => {
  try {
    const { numero_economico, placas, capacidad, estado, conductor_id, foto_url } = req.body;

    const dataToUpdate = {};
    if (numero_economico) dataToUpdate.numero_economico = numero_economico;
    if (placas) dataToUpdate.placas = placas;
    if (capacidad) dataToUpdate.capacidad = capacidad;
    if (estado) dataToUpdate.estado = estado;
    if (conductor_id !== undefined) dataToUpdate.conductor_id = conductor_id;
    if (foto_url) dataToUpdate.foto_url = foto_url;

    const unidad = await prisma.unidades.update({
      where: { id: Number(req.params.id) },
      data: dataToUpdate
    });

    res.json(unidad);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar unidad', details: error.message });
  }
};

// Eliminar unidad
exports.deleteUnidad = async (req, res) => {
  try {
    await prisma.unidades.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: 'Unidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar unidad', details: error.message });
  }
};
