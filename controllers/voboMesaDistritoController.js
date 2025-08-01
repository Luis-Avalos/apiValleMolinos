const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerVoboMesaDistrito = async (req, res) => {
    try {
        const resultado = await prisma.$queryRawUnsafe(`
            SELECT
  distrito, vobo_mesa,
  CASE
    WHEN vobo_mesa = 1 THEN 'Visto bueno'
    WHEN vobo_mesa = 0 THEN 'Requiere trabajo de campo'
    WHEN vobo_mesa = 2 THEN 'A tratar en mesa técnica'
    WHEN vobo_mesa = -1 THEN 'Sin revisar'
  END AS estado,
  COUNT(*) AS total_colonias
FROM gestion_ordenamiento_territorial.ot_colonias where distrito in (1,2,3,4,5,6,7,8,9,10,11,12)
GROUP BY distrito, vobo_mesa,estado
ORDER BY distrito, vobo_mesa, estado;
            `);

   

        const safeResult = resultado.map(row =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? Number(value) : value,
    ])
  )
);

res.json(safeResult);

    } catch (error) {
        console.log('Error al consultar los VoBo de la Mesa', error);
        res.status(500).json({error:'Error en el servidor'});
    }
};

module.exports = {
    obtenerVoboMesaDistrito
};