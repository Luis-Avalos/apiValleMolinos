const prisma = require('../models/userModel');
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
async function subirAS3(file, userId, folder = 'ciudadanos') {
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


// --- Obtener todos los ciudadanos
exports.getAllCiudadanos = async (req, res) => {
  try {
    const ciudadanos = await prisma.usuarios_ciudadanos.findMany();
    res.json(ciudadanos);
  } catch (error) {
    console.error('Error en getAllCiudadanos:', error);
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
    console.error('Error en getCiudadanoById:', error);
    res.status(500).json({ error: 'Error al obtener ciudadano', details: error.message });
  }
};

// --- Crear ciudadano
// exports.createCiudadano = [
//   upload.any(),
//   async (req, res) => {
//     try {
//       const { nombre, apellido, curp, email, telefono, password, password_hash } = req.body;
//       const plainPassword = password || password_hash;

//       if (!plainPassword) {
//         return res.status(400).json({ error: 'La contraseña es requerida' });
//       }

//       const existing = await prisma.usuarios_ciudadanos.findUnique({ where: { email } });
//       if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

//       const hashed = await bcrypt.hash(plainPassword, 10);

//       let fotoUrl = null;
//       if (req.files && req.files.length > 0) {
//         fotoUrl = await subirAS3(req.files[0], email, 'ciudadanos');
//       }

//       const nuevo = await prisma.usuarios_ciudadanos.create({
//         data: {
//           nombre,
//           apellido,
//           curp,
//           email,
//           telefono,
//           password_hash: hashed,
//           rol: 'ciudadano',
//           foto_perfil_url: fotoUrl,
//         },
//       });

//       res.status(201).json(nuevo);
//     } catch (error) {
//       console.error('Error en createCiudadano:', error);
//       res.status(500).json({ error: 'Error al crear ciudadano', details: error.message });
//     }
//   },
// ];


exports.createCiudadano = [
  upload.any(),
  async (req, res) => {
    try {
      const { nombre, apellido, curp, email, telefono, password } = req.body;

      // Validar email único
      const existing = await prisma.usuarios_ciudadanos.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

      // Hashear password
      const hashed = await bcrypt.hash(password, 10);

      // Subir foto si viene
      let fotoUrl = null;
      if (req.files && req.files.length > 0) {
        fotoUrl = await subirAS3(req.files[0], email, 'usuarios_ciudadanos');
      }

      const nuevo = await prisma.usuarios_ciudadanos.create({
        data: { 
          nombre, 
          apellido, 
          curp, 
          email, 
          telefono, 
          password_hash: hashed,
          rol : "ciudadano", 
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


// --- Actualizar ciudadano
exports.updateCiudadano = [
  upload.any(),
  async (req, res) => {
    try {
      const { nombre, apellido, curp, email, telefono, password } = req.body;

      const dataToUpdate = {};
      if (nombre) dataToUpdate.nombre = nombre;
      if (apellido) dataToUpdate.apellido = apellido;
      if (curp) dataToUpdate.curp = curp;
      if (email) dataToUpdate.email = email;
      if (telefono) dataToUpdate.telefono = telefono;

      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        dataToUpdate.password_hash = hashed;
      }

      if (req.files && req.files.length > 0) {
        const fotoUrl = await subirAS3(req.files[0], req.params.id, 'ciudadanos');
        dataToUpdate.foto_perfil_url = fotoUrl;
      }

      const ciudadano = await prisma.usuarios_ciudadanos.update({
        where: { id: Number(req.params.id) },
        data: dataToUpdate,
      });

      res.json(ciudadano);
    } catch (error) {
      console.error('Error en updateCiudadano:', error);
      res.status(500).json({ error: 'Error al actualizar ciudadano', details: error.message });
    }
  },
];

// --- Solo actualizar foto de perfil
exports.uploadFotoPerfilCiudadano = [
  upload.any(),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0)
        return res.status(400).json({ error: 'No se envió ninguna imagen' });

      const file = req.files[0];
      const fotoUrl = await subirAS3(file, req.params.id, 'ciudadanos');

      const ciudadano = await prisma.usuarios_ciudadanos.update({
        where: { id: Number(req.params.id) },
        data: { foto_perfil_url: fotoUrl },
      });

      res.json({ message: 'Foto actualizada', foto_perfil_url: ciudadano.foto_perfil_url });
    } catch (err) {
      console.error('Error en uploadFotoPerfilCiudadano:', err);
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
    console.error('Error en deleteCiudadano:', error);
    res.status(500).json({ error: 'Error al eliminar ciudadano', details: error.message });
  }
};
