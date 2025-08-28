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
  const { email } = req.body;

  const user = await prisma.conductores.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const codigo = generateCode();
  const expires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutos

  await prisma.password_resets_conductores.create({
    data: {
      email,
      codigo,
      expires_at: expires,
    },
  });

  await sendResetCode(email, codigo);
  res.json({ message: 'Código enviado al email' });
};

// Verificar código
exports.verifyCode = async (req, res) => {
  const { email, codigo } = req.body;

  const record = await prisma.password_resets_conductores.findFirst({
    where: {
      email,
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
  const { email, codigo, nuevaPassword } = req.body;

  const record = await prisma.password_resets_conductores.findFirst({
    where: {
      email,
      codigo,
      used: false,
      expires_at: { gt: new Date() },
    },
  });

  if (!record) return res.status(400).json({ error: 'Código inválido o expirado' });

  const hashed = await bcrypt.hash(nuevaPassword, 10);

  await prisma.conductores.update({
    where: { email },
    data: { password_hash: hashed },
  });

  await prisma.password_resets_conductores.update({
    where: { id: record.id },
    data: { used: true },
  });

  res.json({ message: 'Contraseña actualizada correctamente' });
};

