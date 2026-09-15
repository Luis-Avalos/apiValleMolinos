const prisma = require('../models/userModel');
const multer = require('multer');
const AWS = require('aws-sdk');

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL),
  s3ForcePathStyle: true,
  signatureVersion: "v4",
  region: "us-east-1"
});

// SUBIR ARCHIVO A S3
async function subirAS3(file, unidadId, folder = "unidades") {

  const nombreLimpio = file.originalname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  const key = `vmprofile/${folder}/${unidadId}/${Date.now()}-${nombreLimpio}`;

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3.upload(params).promise();

  return key; 
}

// GENERAR URL FIRMADA
function generarUrlFirmada(key) {

  if (!key) return null;

  try {

    // Limpiezade primeras URLs S3 
    if (key.startsWith("http")) {
      const url = new URL(key);

      key = url.pathname
        .replace(`/${process.env.AWS_BUCKET}/`, "")
        .replace(/^\/+/, "");
    }

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Expires: 60 * 60 * 4
    };

    return s3.getSignedUrl("getObject", params);

  } catch (error) {

    console.error("Error generando URL firmada:", error);
    return null;

  }

}

// OBTENER TODAS LAS UNIDADES
exports.getAllUnidades = async (req, res) => {

  try {

    const unidades = await prisma.unidades.findMany();

    const unidadesConUrl = unidades.map(u => ({
      ...u,
      foto_url: generarUrlFirmada(u.foto_url)
    }));

    res.json(unidadesConUrl);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error al obtener unidades',
      details: error.message
    });

  }

};

// OBTENER UNIDAD POR ID
exports.getUnidadById = async (req, res) => {

  try {

  const unidad = await prisma.unidades.findUnique({
  where: {
    id: Number(req.params.id)
  }
});

    if (!unidad)
      return res.status(404).json({ error: 'Unidad no encontrada' });

    const unidadConUrl = {
      ...unidad,
      foto_url: generarUrlFirmada(unidad.foto_url)
    };

    res.json(unidadConUrl);

  } catch (error) {

    res.status(500).json({
      error: 'Error al obtener unidad',
      details: error.message
    });

  }

};

// CREAR UNIDAD
exports.createUnidad = [
  upload.any(),
  async (req, res) => {

    try {

      const { numero_economico, placas, capacidad, estado, id_geotab } = req.body;

      let fotoUrl = null;

      if (req.files && req.files.length > 0) {
        fotoUrl = await subirAS3(req.files[0], numero_economico, "unidades");
      }

      const nuevo = await prisma.unidades.create({
        data: {
          numero_economico,
          placas,
          capacidad: capacidad ? Number(capacidad) : null,
          estado,
          id_geotab,
          foto_url: fotoUrl
        }
      });

      res.status(201).json(nuevo);

    } catch (error) {

      console.error("Error en createUnidad:", error);

      res.status(500).json({
        error: 'Error al crear unidad',
        details: error.message
      });

    }

  }
];

// ACTUALIZAR UNIDAD
exports.updateUnidad = [
  upload.any(),
  async (req, res) => {

    try {

      const { numero_economico, placas, capacidad, estado, id_geotab } = req.body;

      const dataToUpdate = {};

      if (numero_economico) dataToUpdate.numero_economico = numero_economico;
      if (placas) dataToUpdate.placas = placas;
      if (capacidad) dataToUpdate.capacidad = Number(capacidad);
      if (estado) dataToUpdate.estado = estado;
      if (id_geotab) dataToUpdate.id_geotab = id_geotab;

      if (req.files && req.files.length > 0) {

        const fotoUrl = await subirAS3(req.files[0], req.params.id, "unidades");

        dataToUpdate.foto_url = fotoUrl;

      }

      const unidad = await prisma.unidades.update({
        where: { id: Number(req.params.id) },
        data: dataToUpdate
      });

      res.json(unidad);

    } catch (error) {

      console.error("Error en updateUnidad:", error);

      res.status(500).json({
        error: 'Error al actualizar unidad',
        details: error.message
      });

    }

  }
];

// ELIMINAR UNIDAD
exports.deleteUnidad = async (req, res) => {

  try {

    await prisma.unidades.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({
      message: 'Unidad eliminada correctamente'
    });

  } catch (error) {

    res.status(500).json({
      error: 'Error al eliminar unidad',
      details: error.message
    });

  }

};