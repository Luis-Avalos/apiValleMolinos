const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

// --- Configuración de Multer (archivos en memoria)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
}).single('file'); // solo un archivo, clave "file"

// --- Configuración AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL),
  s3ForcePathStyle: true,
});

// --- Función auxiliar para subir a S3
async function subirAS3(fileBuffer, userId, originalName, mimetype) {
  // Normalizar nombre: quitar espacios y caracteres especiales
  const safeName = originalName
    .normalize('NFD') // separa acentos
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\s+/g, '_') // reemplaza espacios
    .replace(/[^a-zA-Z0-9_-]/g, ''); // quita caracteres raros

  const extension = path.extname(originalName) || '.jpg';
  const fileName = `vmprofile/${userId}/${Date.now()}-${safeName}${extension}`;

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ciudadano', details: error.message });
  }
};

// --- Crear ciudadano
exports.createCiudadano = [
  upload,
  async (req, res) => {
    try {
      const { nombre, apellido, curp, email, telefono, password_hash } = req.body;

      // Validar email único
      const existing = await prisma.usuarios_ciudadanos.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

      // Hashear password
      const hashed = await bcrypt.hash(password_hash, 10);

      // Crear registro
      const nuevo = await prisma.usuarios_ciudadanos.create({
        data: { nombre, apellido, curp, email, telefono, password_hash: hashed }
      });

      let fotoUrl = null;
      if (req.file) {
        // Resize con Sharp
        const resizedBuffer = await sharp(req.file.buffer)
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .toFormat('jpeg')
          .toBuffer();

        fotoUrl = await subirAS3(resizedBuffer, nuevo.id, req.file.originalname, req.file.mimetype);

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
  upload,
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
        const resizedBuffer = await sharp(req.file.buffer)
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .toFormat('jpeg')
          .toBuffer();

        const fotoUrl = await subirAS3(resizedBuffer, req.params.id, req.file.originalname, req.file.mimetype);
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

// --- Subir solo foto de perfil
exports.uploadFotoPerfil = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ninguna imagen' });
      }

      const { buffer, originalname, mimetype } = req.file;

      // --- Resize con Sharp
      const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg')
        .toBuffer();

      // --- Subir a S3
      const url = await subirAS3(resizedBuffer, req.params.id, originalname, mimetype);

      // --- Actualizar en Prisma
      const ciudadano = await prisma.usuarios_ciudadanos.update({
        where: { id: Number(req.params.id) },
        data: { foto_perfil_url: url },
      });

      res.json({ message: 'Foto actualizada', foto_perfil_url: ciudadano.foto_perfil_url });
    } catch (error) {
      console.error('Error en uploadFotoPerfil:', error);
      res.status(500).json({ error: 'Error subiendo foto', details: error.message });
    }
  });
};

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
