const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.loginCiudadanos = async (req, res) => {
  try {
    const { email, password_hash } = req.body; 

    // Buscar conductor por email
    const user = await prisma.usuarios_ciudadanos.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Comparar contraseñas
    const valid = await bcrypt.compare(password_hash, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Crear token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    // Responder con datos del usuario
    res.json({
      token,
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      curp: user.curp,
      email: user.email,
      telefono: user.telefono,
      foto_perfil_url: user.foto_perfil_url,
      fecha_registro: user.fecha_registro
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
