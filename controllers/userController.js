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


// Obtener todos los conductores activos
exports.getAllConductores = async (req, res) => {
  try {
    const conductores = await prisma.conductores.findMany({
      where: {
        estatus: true
      },
      include: { unidades: true }
    });

    res.json(conductores);
  } catch (error) {
    res.status(500).json({ 
      details: error.message 
    });
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
exports.createConductor = [
  upload.any(),
  async (req, res) => {
    try {
      const { nombre, apellido, email, password, telefono, curp } = req.body;

      // Validar email único
      const existing = await prisma.conductores.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

      // Hashear password
      const hashed = await bcrypt.hash(password, 10);

      // Subir foto si viene
      let fotoUrl = null;
      if (req.files && req.files.length > 0) {
        fotoUrl = await subirAS3(req.files[0], email, 'conductores');
      }

      const nuevo = await prisma.conductores.create({
        data: { 
          nombre, 
          apellido, 
          email, 
          password_hash: hashed,
          telefono, 
          curp, 
          rol : "conductor", 
          foto_perfil_url: fotoUrl
        }
      });

      res.status(201).json(nuevo);
    } catch (error) {
      console.error("Error en createConductor:", error);
      res.status(500).json({ error: 'Error al crear conductor', details: error.message });
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

      // Si viene nueva contraseña
      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        dataToUpdate.password_hash = hashed;
      }

      // Si viene archivo, subir a S3
      if (req.files && req.files.length > 0) {
        const fotoUrl = await subirAS3(req.files[0], req.params.id, 'conductores');
        dataToUpdate.foto_perfil_url = fotoUrl;
      }

      const conductor = await prisma.conductores.update({
        where: { id: Number(req.params.id) },
        data: dataToUpdate
      });

      res.json(conductor);
    } catch (error) {
      console.error("Error en updateConductor:", error);
      res.status(500).json({ error: 'Error al actualizar conductor', details: error.message });
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
        data: { foto_perfil_url: fotoUrl },
      });

      res.json({ message: 'Foto actualizada', foto_perfil_url: conductor.foto_perfil_url });
    } catch (err) {
      console.error('Error en uploadFotoPerfilConductor:', err);
      res.status(500).json({ error: 'Error subiendo foto', details: err.message });
    }
  },
];
