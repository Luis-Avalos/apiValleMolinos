const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; 

    // Buscar conductor por email
    const user = await prisma.conductores.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Comparar contraseñas
    const valid = await bcrypt.compare(password, user.password_hash);
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
      email: user.email,
      telefono: user.telefono,
      curp: user.curp,
      rol: user.rol,
      foto_perfil_url: user.foto_perfil_url,
      fecha_registro: user.fecha_registro
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
