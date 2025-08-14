const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const updateColoniaGeom = async (req, res) => {
  try {
    const { id, coordenadas } = req.body;

    if (!id || !coordenadas) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }

    // Parsear coordenadas si vienen como string
    let coordsArray = typeof coordenadas === "string" ? JSON.parse(coordenadas) : coordenadas;

    if (!Array.isArray(coordsArray) || !Array.isArray(coordsArray[0])) {
      return res.status(400).json({ error: "Formato de coordenadas inválido" });
    }

    // Asegurar que el anillo esté cerrado
    let ring = coordsArray[0];
    if (
      ring.length > 0 &&
      (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
    ) {
      ring.push(ring[0]);
    }

    // Crear WKT para MULTIPOLYGON
    const wktPoints = ring.map(coord => `${coord[0]} ${coord[1]}`).join(",");
    const wkt = `MULTIPOLYGON(((${wktPoints})))`;

    // Ejecutar update con parámetros seguros
    const result = await prisma.$executeRaw`
      UPDATE gestion_ordenamiento_territorial.ot_colonias_edit
      SET geom = ST_Transform(ST_GeomFromText(${wkt}, 4326), 32613)
      WHERE gid = ${id};
    `;

    return res.json({ message: `Actualización gid: ${id}`, result });
  } catch (error) {
    console.error("Error al actualizar geometría:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { updateColoniaGeom };
