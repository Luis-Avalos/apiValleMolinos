const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk');
const multer = require('multer');

// --- Configuración de Multer (archivos en memoria)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Configuración de AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL), // usar AWS.Endpoint
  s3ForcePathStyle: true,
});

// --- Función auxiliar para subir a S3
async function subirAS3(file, userId) {
  const now = new Date();
  const dateStr = now.toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' }).replace(/[: ]/g, '-');
  const originalName = file.originalname.split('.')[0];
  const extension = file.originalname.split('.').pop();
const fileName = `vmprofile/${req.params.id}/${file.originalname}`;


const params = {
  Bucket: process.env.AWS_BUCKET, // 'geomatica'
  Key: fileName,
  Body: file.buffer,
  ContentType: file.mimetype,
  ACL: 'public-read',
};


  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; // URL pública
}

// --- Obtener todos los ciudadanos
exports.getAllCiudadanos = async (req, res) => {
  try {
    const ciudadanos = await prisma.usuarios_ciudadanos.findMany({});
    res.json(ciudadanos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ciudadanos', details: error.message });
  }
};

// --- Obtener ciudadano por ID
exports.getCiudadanoById = async (req, res) => {
  try {
    const ciudadano = await prisma.usuarios_ciudadanos.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!ciudadano) return res.status(404).json({ error: 'Ciudadano no encontrado' });
    res.json(ciudadano);
    } 
    catch (error) {
    res.status(500).json({ error: 'Error al obtener ciudadano', details: error.message });
  }
};

// --- Crear Ciudadano
exports.createCiudadano = [
  upload.any(),
    async (req, res) => {
    try {
      const { nombre, apellido, curp, email, telefono, password_hash } = req.body;

      // Validar email único
      const existing = await prisma.usuarios_ciudadanos.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

      // Hashear password
      const hashed = await bcrypt.hash(password_hash, 10);

      // Subir imagen si viene en el request
     const nuevo = await prisma.usuarios_ciudadanos.create({
  data: { nombre, apellido, curp, email, telefono, password_hash: hashed }
});

let fotoUrl = null;
if (req.file) {
  fotoUrl = await subirAS3(req.file, nuevo.id);
  await prisma.usuarios_ciudadanos.update({
    where: { id: nuevo.id },
    data: { foto_perfil_url: fotoUrl }
  });
}

res.status(201).json({ ...nuevo, foto_perfil_url: fotoUrl });
    } catch (error) {
      res.status(500).json({ error: 'Error al crear ciudadano', details: error.message });
    }
  },
];

// --- Actualizar ciudadano
exports.updateCiudadano = [
    upload.any(),

  async (req, res) => {
    try {
      const { nombre, apellido, curp, email, telefono, password_hash } = req.body;
      const dataToUpdate = {};

      if (nombre) dataToUpdate.nombre = nombre;
      if (apellido) dataToUpdate.apellido = apellido;
      if (curp) dataToUpdate.curp = curp;
      if (email) dataToUpdate.email = email;
      if (telefono) dataToUpdate.telefono = telefono;
      if (password_hash) {
        const hashed = await bcrypt.hash(password_hash, 10);
        dataToUpdate.password_hash = hashed;
      }

      if (req.file) {
        const fotoUrl = await subirAS3(req.file, req.params.id);
        dataToUpdate.foto_perfil_url = fotoUrl;
      }

      const ciudadano = await prisma.usuarios_ciudadanos.update({
        where: { id: Number(req.params.id) },
        data: dataToUpdate,
      });

      res.json(ciudadano);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar ciudadano', details: error.message });
    }
  },
];

// --- Solo actualizar foto de perfil
exports.uploadFotoPerfil = [
  upload.any(),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0)
        return res.status(400).json({ error: 'No se envió ninguna imagen' });

      const file = req.files[0]; // <-- usar req.files[0] en vez de req.file
      const fileName = `vmprofile/${req.params.id}/${file.originalname}`;

      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      const uploadResult = await s3.upload(params).promise();

      // Actualizar registro en Prisma
      const ciudadano = await prisma.usuarios_ciudadanos.update({
        where: { id: Number(req.params.id) },
        data: { foto_perfil_url: uploadResult.Location },
      });

      res.json({ message: 'Foto actualizada', foto_perfil_url: ciudadano.foto_perfil_url });
    } catch (err) {
      console.error('Error en uploadFotoPerfil:', err);
      res.status(500).json({ error: 'Error subiendo foto', details: err.message });
    }
  },
];



// --- Eliminar ciudadano
exports.deleteCiudadano = async (req, res) => {
  try {
    await prisma.usuarios_ciudadanos.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: 'Ciudadano eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ciudadano', details: error.message });
  }
};
