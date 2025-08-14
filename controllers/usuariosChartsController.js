const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUsuariosChart = async (req, res) => {
  try {
    const resultados = await prisma.ot_colonias.groupBy({
      by: ['usuario'],
      where: {
        usuario: {
          not: null,
        },
      },
      _count: {
        usuario: true,
      },
      orderBy: {
        _count: {
          usuario: 'desc', // 👈 Ordena por el conteo de 'usuario', que sí es válido
        },
      },
    });

    const data = resultados.map(item => ({
      usuario: item.usuario,
      cantidad: item._count.usuario,
    }));

    res.json(data);
  } catch (error) {
    console.error('🛑 ERROR REAL:', error);
    res.status(500).json({ error: 'Error al consultar los usuarios' });
  }
};

module.exports = {
  getUsuariosChart,
};
