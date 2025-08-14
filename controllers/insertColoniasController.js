const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const insertColoniaGeom = async (req, res) => {
  try {
    const { nombre, coordenadas } = req.body;

    if (!nombre || !coordenadas) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }

    const wkt = coordenadas; // Ya es texto WKT

  await prisma.$queryRaw`
  SELECT gestion_ordenamiento_territorial.fn_insertar_colonia(${wkt}, ${nombre});
`;

    return res.json({ message: "Colonia insertada correctamente" });
  } catch (error) {
    console.error("Error al insertar colonia:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { insertColoniaGeom };