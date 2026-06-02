const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');

const multer = require('multer');
const AWS = require('aws-sdk');

// Multer en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuración S3

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL),
  s3ForcePathStyle: true,
  signatureVersion: "v4",
  region: "us-east-1"
});


// Subir archivo a S3
async function subirAS3(file, email) {

  const nombreLimpio = limpiarNombreArchivo(file.originalname);

  const key = `vmprofile/conductores/${email}/${nombreLimpio}`;
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3.upload(params).promise();

  return key;
}


// Generar URL firmada
function generarUrlFirmada(key) {

  if (key.startsWith("http")) {
    key = key.split(`${process.env.AWS_BUCKET}/`)[1];
  }

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Expires: 60 * 60 * 4
  };

  return s3.getSignedUrl("getObject", params);
}

function limpiarNombreArchivo(nombre) {
  const ext = nombre.split(".").pop();

  return `${Date.now()}-${Math.random().toString(36).substring(2,8)}.${ext}`;
}

// Obtener todos los conductores activos
exports.getAllConductores = async (req, res) => {
  try {

    const conductores = await prisma.conductores.findMany({
      where: { estatus: true },
      include: { unidades: true }
    });

    const conductoresConUrl = conductores.map(c => ({
      ...c,
      foto_perfil_url: c.foto_perfil_url
        ? generarUrlFirmada(c.foto_perfil_url)
        : null
    }));

    res.json(conductoresConUrl);

  } catch (error) {
    res.status(500).json({ details: error.message });
  }
};


// Obtener conductor por ID
exports.getConductorById = async (req, res) => {
  try {

    const conductor = await prisma.conductores.findUnique({
      where: { id: Number(req.params.id) },
      include: { unidades: true }
    });

    if (!conductor)
      return res.status(404).json({ error: 'Conductor no encontrado' });

    const conductorConUrl = {
      ...conductor,
      foto_perfil_url: conductor.foto_perfil_url
        ? generarUrlFirmada(conductor.foto_perfil_url)
        : null
    };

    res.json(conductorConUrl);

  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener conductor',
      details: error.message
    });
  }
};
// Crear conductor
exports.createConductor = [
  upload.any(),
  async (req, res) => {
    try {

      const { nombre, apellido, email, password, telefono, curp } = req.body;

      const existing = await prisma.conductores.findUnique({ where: { email } });
      if (existing)
        return res.status(400).json({ error: 'El correo ya está registrado' });

      const hashed = await bcrypt.hash(password, 10);

      let fotoUrl = null;

      if (req.files && req.files.length > 0) {
        fotoUrl = await subirAS3(req.files[0], email);
      }

      const nuevo = await prisma.conductores.create({
        data: {
          nombre,
          apellido,
          email,
          telefono,
          curp,
          password_hash: hashed,
          rol: "conductor",
          foto_perfil_url: fotoUrl
        }
      });

      res.status(201).json(nuevo);

    } catch (error) {

      console.error("Error en createConductor:", error);

      res.status(500).json({
        error: 'Error al crear conductor',
        details: error.message
      });

    }
  }
];

// Actualizar conductor
exports.updateConductor = [
  upload.any(),
  async (req, res) => {
    try {

      const { nombre, apellido, email, password, telefono, curp } = req.body;

      const dataToUpdate = {};

      if (nombre) dataToUpdate.nombre = nombre;
      if (apellido) dataToUpdate.apellido = apellido;
      if (email) dataToUpdate.email = email;
      if (telefono) dataToUpdate.telefono = telefono;
      if (curp) dataToUpdate.curp = curp;

      if (password) {
        dataToUpdate.password_hash = await bcrypt.hash(password, 10);
      }

      if (req.files && req.files.length > 0) {
        const fotoUrl = await subirAS3(req.files[0], email);
        dataToUpdate.foto_perfil_url = fotoUrl;
      }

      const conductor = await prisma.conductores.update({
        where: { id: Number(req.params.id) },
        data: dataToUpdate
      });

      res.json(conductor);

    } catch (error) {

      console.error("Error en updateConductor:", error);

      res.status(500).json({
        error: 'Error al actualizar conductor',
        details: error.message
      });

    }
  }
];

// Eliminar conductor
exports.deleteConductor = async (req, res) => {
  try {
    await prisma.conductores.update({
      where: { id: Number(req.params.id) },
      data: { estatus: false }
    });

    res.json({ message: 'Conductor dado de baja correctamente' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al dar de baja conductor', 
      details: error.message 
    });
  }
};

//Solo actualizar foto de perfil
exports.uploadFotoPerfilConductor = [
  upload.any(),
  async (req, res) => {

    try {

      if (!req.files || req.files.length === 0)
        return res.status(400).json({ error: 'No se envió ninguna imagen' });

      const file = req.files[0];

      const fotoUrl = await subirAS3(file, req.params.id);

      const conductor = await prisma.conductores.update({
        where: { id: Number(req.params.id) },
        data: { foto_perfil_url: fotoUrl }
      });

      res.json({
        message: 'Foto actualizada',
        foto_perfil_url: generarUrlFirmada(conductor.foto_perfil_url)
      });

    } catch (err) {

      console.error('Error en uploadFotoPerfilConductor:', err);

      res.status(500).json({
        error: 'Error subiendo foto',
        details: err.message
      });

    }
  }
];

//Dar de alta administrador
exports.createAdmin = [
  upload.any(),
  async (req, res) => {
    try {

      const { nombre, apellido, email, password, telefono, curp } = req.body;

      const existing = await prisma.conductores.findUnique({ where: { email } });
      if (existing)
        return res.status(400).json({ error: 'El correo ya está registrado' });

      const hashed = await bcrypt.hash(password, 10);

      let fotoUrl = null;

      if (req.files && req.files.length > 0) {
        fotoUrl = await subirAS3(req.files[0], email);
      }

      const nuevo = await prisma.conductores.create({
        data: {
          nombre,
          apellido,
          email,
          telefono,
          curp,
          password_hash: hashed,
          rol: "admin",
          foto_perfil_url: fotoUrl
        }
      });

      res.status(201).json(nuevo);

    } catch (error) {

      console.error("Error en createConductor:", error);

      res.status(500).json({
        error: 'Error al crear conductor',
        details: error.message
      });

    }
  }
];
