const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');
const { sendResetCode } = require('../utils/emailSender');

// Generar código resetPswd
function generateCode(length = 6) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

//Solicitar recuperación
exports.requestReset = async (req, res) => {
  const { correo } = req.body;

  const user = await prisma.usuarios_muc.findUnique({ where: { correo } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const codigo = generateCode();
  const expires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutos

  await prisma.password_resets_muc.create({
    data: {
      correo,
      codigo,
      expires_at: expires,
    },
  });

  await sendResetCode(correo, codigo);
  res.json({ message: 'Código enviado al correo' });
};

// Verificar código
exports.verifyCode = async (req, res) => {
  const { correo, codigo } = req.body;

  const record = await prisma.password_resets.findFirst({
    where: {
      correo,
      codigo,
      used: false,
      expires_at: { gt: new Date() },
    },
  });

  if (!record) return res.status(400).json({ error: 'Código inválido o expirado' });

  res.json({ message: 'Código válido' });
};

// Cambiar contraseña
exports.resetPassword = async (req, res) => {
  const { correo, codigo, nuevaPassword } = req.body;

  const record = await prisma.password_resets.findFirst({
    where: {
      correo,
      codigo,
      used: false,
      expires_at: { gt: new Date() },
    },
  });

  if (!record) return res.status(400).json({ error: 'Código inválido o expirado' });

  const hashed = await bcrypt.hash(nuevaPassword, 10);

  await prisma.usuarios_muc.update({
    where: { correo },
    data: { password: hashed },
  });

  await prisma.password_resets.update({
    where: { id: record.id },
    data: { used: true },
  });

  res.json({ message: 'Contraseña actualizada correctamente' });
};

