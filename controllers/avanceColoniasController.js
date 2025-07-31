const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerAvanceColonias = async (req, res) => {
  try {
    const resultado = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_colonias,
        COUNT(*) FILTER (WHERE vobo_mesa = 1) AS colonias_con_avance,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE vobo_mesa = 1) / COUNT(*),
          2
        ) AS porcentaje_avance_total
      FROM gestion_ordenamiento_territorial.ot_archivos_planos_certificados_mesa
      WHERE distrito IN (1,2,3,4,5,6,7,8,9,10,11,12);
    `);

    const safeResult = Object.fromEntries(
      Object.entries(resultado[0]).map(([key, value]) => [
        key,
        typeof value === 'bigint' ? Number(value) : value,
      ])
    );

    res.json(safeResult);
  } catch (error) {
    console.error('Error al consultar avance de colonias:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = {
  obtenerAvanceColonias,
};
