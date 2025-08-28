const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function hashearPasswords() {
  const usuarios = await prisma.conductores.findMany();

  for (const usuario of usuarios) {
    // Revisamos si la contraseña ya está hasheada
    if (!usuario.password_hash.startsWith('$2')) {
      const hashed = await bcrypt.hash(usuario.password_hash, 10);

      await prisma.conductores.update({
        where: { id: usuario.id },
        data: { password_hash: hashed },
      });

      console.log(`Password hasheado para ${usuario.email}`);
    }
  }

  console.log("Todos los passwords de conductores han sido hasheados");
  process.exit();
}

hashearPasswords()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
