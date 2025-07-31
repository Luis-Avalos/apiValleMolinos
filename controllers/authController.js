const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { correo, password } = req.body;

const user = await prisma.usuarios_muc.findUnique({
  where: { correo },
});

  if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { userId: user.gid, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token, id:user.gid, nombre: user.nombre, apellidos: user.apellidos, noempleado: user.noempleado, correo: user.correo,  rol: user.rol });
};