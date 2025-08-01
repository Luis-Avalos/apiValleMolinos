const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const avancePorcentajeColonias = async (req, res) => {
    try {
        const resultado = await prisma.$queryRawUnsafe(`
           WITH estados AS (
 SELECT * FROM (VALUES
   (0, 'Requiere trabajo de campo'),
   (1, 'Visto bueno'),
   (2, 'A tratar en mesa técnica'),
   (-1, 'Sin revisar')
 ) AS e(vobo_mesa, estado)
),
combinaciones AS (
 SELECT d AS distrito, e.vobo_mesa, e.estado
 FROM unnest(ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]) AS d
 CROSS JOIN estados e
),
conteo AS (
 SELECT
   distrito,
   COALESCE(vobo_mesa, -1) AS vobo_mesa,
   COUNT(*) AS total_colonias
 FROM gestion_ordenamiento_territorial.ot_colonias
 GROUP BY distrito, COALESCE(vobo_mesa, -1)
)
SELECT
 c.distrito,
 c.vobo_mesa,
 c.estado,
 COALESCE(ct.total_colonias, 0) AS total_colonias
FROM combinaciones c
LEFT JOIN conteo ct
 ON c.distrito = ct.distrito AND c.vobo_mesa = ct.vobo_mesa
ORDER BY c.distrito, c.vobo_mesa;

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
    avancePorcentajeColonias
};