const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function hashearPasswords() {
  const usuarios = await prisma.usuarios_muc.findMany();

  for (const usuario of usuarios) {
    if (!usuario.password.startsWith('$2')) {
      const hashed = await bcrypt.hash(usuario.password, 10);

      await prisma.usuarios_muc.update({
        where: { gid: usuario.gid },
        data: { password: hashed },
      });

      console.log(`Password hasheado para ${usuario.correo}`);
    }
  }

  console.log("Todos los passwords han sido hasheados");
  process.exit();
}

hashearPasswords();
