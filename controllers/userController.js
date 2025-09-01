const prisma = require('../models/userModel'); // importa tu prisma client
const bcrypt = require('bcrypt');

const multer = require('multer');
const AWS = require('aws-sdk');

// Configuración de Multer (archivos en memoria)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuración de AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL),
  s3ForcePathStyle: true,
});

// Función auxiliar para subir a S3
async function subirAS3(file, userId, folder = 'conductores') {
  const fileName = `vmprofile/${folder}/${userId}/${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; // URL pública
}


// Obtener todos los conductores
exports.getAllConductores = async (req, res) => {
  try {
    const conductores = await prisma.conductores.findMany({
      include: { unidades: true } // opcional, si quieres traer también las unidades relacionadas
    });
    res.json(conductores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener conductores', details: error.message });
  }
};

// Obtener conductor por ID
exports.getConductorById = async (req, res) => {
  try {
    const conductor = await prisma.conductores.findUnique({
      where: { id: Number(req.params.id) },
      include: { unidades: true }
    });
    if (!conductor) return res.status(404).json({ error: 'Conductor no encontrado' });
    res.json(conductor);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener conductor', details: error.message });
  }
};

// Crear conductor
exports.createConductor = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, curp, foto_perfil_url } = req.body;

    // Validar email único
    const existing = await prisma.conductores.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

    // Hashear password
    const hashed = await bcrypt.hash(password, 10);

    const nuevo = await prisma.conductores.create({
      data: { 
        nombre, 
        apellido, 
        email, 
        password_hash: hashed,
        telefono, 
        curp, 
        foto_perfil_url 
      }
    });

    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear conductor', details: error.message });
  }
};

// Actualizar conductor
exports.updateConductor = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, curp, foto_perfil_url } = req.body;

    const dataToUpdate = {};

    if (nombre) dataToUpdate.nombre = nombre;
    if (apellido) dataToUpdate.apellido = apellido;
    if (email) dataToUpdate.email = email;
    if (telefono) dataToUpdate.telefono = telefono;
    if (curp) dataToUpdate.curp = curp;
    if (foto_perfil_url) dataToUpdate.foto_perfil_url = foto_perfil_url;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      dataToUpdate.password_hash = hashed;
    }

    const conductor = await prisma.conductores.update({
      where: { id: Number(req.params.id) },
      data: dataToUpdate
    });

    res.json(conductor);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar conductor', details: error.message });
  }
};

// Eliminar conductor
exports.deleteConductor = async (req, res) => {
  try {
    await prisma.conductores.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: 'Conductor eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar conductor', details: error.message });
  }
};


// --- Solo actualizar foto de perfil
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
        data: { foto_perfil_url: fotoUrl },
      });

      res.json({ message: 'Foto actualizada', foto_perfil_url: conductor.foto_perfil_url });
    } catch (err) {
      console.error('Error en uploadFotoPerfilConductor:', err);
      res.status(500).json({ error: 'Error subiendo foto', details: err.message });
    }
  },
];
