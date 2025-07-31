const prisma = require('../models/userModel');
const bcrypt = require('bcrypt');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
  const usuarios = await prisma.usuarios_muc.findMany();
  res.json(usuarios);
};

// Obtener usuario por ID
exports.getUserById = async (req, res) => {
  const user = await prisma.usuarios_muc.findUnique({
    where: { gid: Number(req.params.id) }
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
};

// Crear usuario
exports.createUser = async (req, res) => {
  const { nombre, apellidos, noempleado, correo, rol, password } = req.body;

  const existing = await prisma.usuarios_muc.findUnique({ where: { correo } });
  if (existing) return res.status(400).json({ error: 'Correo ya registrado' });

  const hashed = await bcrypt.hash(password, 10);

  const nuevo = await prisma.usuarios_muc.create({
    data: { nombre, apellidos, noempleado, correo, rol, password: hashed }
  });

  res.status(201).json(nuevo);
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  const { nombre, apellidos, noempleado, correo, rol, password } = req.body;

  const dataToUpdate = {};

  if (nombre) dataToUpdate.nombre = nombre;
  if (apellidos) dataToUpdate.apellidos = apellidos;
  if (noempleado) dataToUpdate.noempleado = noempleado;
  if (correo) dataToUpdate.correo = correo;
  if (rol) dataToUpdate.rol = rol;
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    dataToUpdate.password = hashed;
  }

  const user = await prisma.usuarios_muc.update({
    where: { gid: Number(req.params.id) },
    data: dataToUpdate
  });

  res.json(user);
};



// Eliminar usuario
exports.deleteUser = async (req, res) => {
  await prisma.usuarios_muc.delete({
    where: { gid: Number(req.params.id) }
  });
  res.json({ message: 'Usuario eliminado' });
};
