const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');
const { sendResetCode } = require('../utils/emailSender');
const { sendRegistroCiudadanoEmail } = require('../utils/emailSender');

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

// Función  para subir a S3
async function subirAS3(file, email) {
  const key = `${process.env.AWS_FOLDER}/usuarios_ciudadanos/${email}/${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();
  // URL final accesible públicamente
  return `${process.env.AWS_URL}/${process.env.AWS_BUCKET}/${key}`;
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


exports.createCiudadano = [
  upload.any(),
  async (req, res) => {
    try {
      const {
        nombre,
        apellido,
        curp,
        email,
        telefono,
        password,
        telefono_emergencia,
        domicilio,
        edad
      } = req.body;

      console.log("BODY:", req.body);

      //  email único
      const existing = await prisma.usuarios_ciudadanos.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

      if (!password) {
        console.error(" No se la contraseña en el body");
        return res.status(400).json({ error: "La contraseña es requerida" });
      }
       const plainPassword = password;


      const hashed = await bcrypt.hash(password, 10);

      let fotoUrl = null;
      let cartaUrl = null;


        // Subir archivos (foto + carta)
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            if (file.fieldname === "foto_perfil") {
              fotoUrl = await subirAS3(file, email);
            } else if (file.fieldname === "carta_anuencia") {
              cartaUrl = await subirAS3(file, email);
            }
          }
        } else {
          // Si no se enviaron archivos, usar URLs del body (por ejemplo desde Postman)
          if (req.body.foto_perfil_url) fotoUrl = req.body.foto_perfil_url;
          if (req.body.carta_anuencia_url) cartaUrl = req.body.carta_anuencia_url;
        }

      // registro en la base de datos
      const nuevo = await prisma.usuarios_ciudadanos.create({
        data: {
          nombre,
          apellido,
          curp,
          email,
          telefono,
          telefono_emergencia,
          domicilio,
          edad: edad ? String(edad) : null,
          password_hash: hashed,
          rol: "ciudadano",
          foto_perfil_url: fotoUrl,
          carta_anuencia_url: cartaUrl
        }
      });

       try {
        await sendRegistroCiudadanoEmail(
            email,
            nombre,
            apellido,
            curp,
            telefono,
            domicilio,
            edad,
            fotoUrl,
            cartaUrl,
            plainPassword
          );

        console.log(` Correo enviado a ${email}`);
      } catch (mailError) {
        console.error(" Error al enviar el correo:", mailError);
      }

      //  Responder al frontend
      res.status(201).json({
        message: "Ciudadano registrado correctamente",
        ciudadano: nuevo
      });

    } catch (error) {
      console.error("Error en createCiudadano:", error);
      res.status(500).json({ error: 'Error al crear ciudadano', details: error.message });
    }
  }
];


// --- Actualizar ciudadano
exports.updateCiudadano = [
  upload.any(),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const ciudadano = await prisma.usuarios_ciudadanos.findUnique({ where: { id } });
      if (!ciudadano) return res.status(404).json({ error: "Ciudadano no encontrado" });

      const {
        nombre,
        apellido,
        curp,
        email,
        telefono,
        password,
        telefono_emergencia,
        domicilio,
        edad
      } = req.body;

      const dataToUpdate = {};

      if (nombre) dataToUpdate.nombre = nombre;
      if (apellido) dataToUpdate.apellido = apellido;
      if (curp) dataToUpdate.curp = curp;
      if (email) dataToUpdate.email = email;
      if (telefono) dataToUpdate.telefono = telefono;
      if (telefono_emergencia) dataToUpdate.telefono_emergencia = telefono_emergencia;
      if (domicilio) dataToUpdate.domicilio = domicilio;
      if (edad) dataToUpdate.edad = parseInt(edad);
      if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10);

      // Archivos (foto y carta)
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (file.fieldname === "foto_perfil") {
            dataToUpdate.foto_perfil_url = await subirAS3(file, email || ciudadano.email);
          } else if (file.fieldname === "carta_anuencia") {
            dataToUpdate.carta_anuencia_url = await subirAS3(file, email || ciudadano.email);
          }
        }
      }

      const actualizado = await prisma.usuarios_ciudadanos.update({
        where: { id },
        data: dataToUpdate,
      });

      // Devolver datos actualizados
      res.json(actualizado);
    } catch (error) {
      console.error("Error en updateCiudadano:", error);
      res.status(500).json({ error: "Error al actualizar ciudadano", details: error.message });
    }
  }
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
