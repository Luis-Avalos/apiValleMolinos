const prisma = require('../models/userModel');

const multer = require('multer');
const AWS = require('aws-sdk');

// Configuración de Multer 
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuración de AWS S3 
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL),
  s3ForcePathStyle: true,
});

// funcin para S3
async function subirAS3(file, unidadId, folder = 'unidades') {
  const fileName = `vmprofile/${folder}/${unidadId}/${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; 
}

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
exports.createUnidad = [
  upload.any(),
  async (req, res) => {
    try {
      const { numero_economico, placas, capacidad, estado, conductor_id, id_geotab } = req.body;

      let fotoUrl = null;

      if (req.files && req.files.length > 0) {
        fotoUrl = await subirAS3(req.files[0], numero_economico, 'unidades');
      }

      const nuevo = await prisma.unidades.create({
        data: { 
          numero_economico, 
          placas, 
          capacidad: capacidad ? Number(capacidad) : null, 
          estado, 
          conductor_id: conductor_id ? Number(conductor_id) : null,
          id_geotab,
          foto_url: fotoUrl
        }
      });

      res.status(201).json(nuevo);
    } catch (error) {
      console.error("Error en createUnidad:", error);
      res.status(500).json({ error: 'Error al crear unidad', details: error.message });
    }
  }
];

// Actualizar unidad
exports.updateUnidad = [
  upload.any(),
  async (req, res) => {
    try {
      const { numero_economico, placas, capacidad, estado, conductor_id, id_geotab } = req.body;

      const dataToUpdate = {};
      if (numero_economico) dataToUpdate.numero_economico = numero_economico;
      if (placas) dataToUpdate.placas = placas;
      if (capacidad) dataToUpdate.capacidad = Number(capacidad);
      if (estado) dataToUpdate.estado = estado;
      if (conductor_id !== undefined) dataToUpdate.conductor_id = Number(conductor_id);
      if (id_geotab) dataToUpdate.id_geotab = id_geotab;

      if (req.files && req.files.length > 0) {
        //foto
        const fotoUrl = await subirAS3(req.files[0], req.params.id, 'unidades');
        dataToUpdate.foto_url = fotoUrl;
      }

      const unidad = await prisma.unidades.update({
        where: { id: Number(req.params.id) },
        data: dataToUpdate
      });

      res.json(unidad);
    } catch (error) {
      console.error("Error en updateUnidad:", error);
      res.status(500).json({ error: 'Error al actualizar unidad', details: error.message });
    }
  }
];


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
