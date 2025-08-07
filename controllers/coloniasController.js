const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.updateColonia = async (req, res) => {
  const {
    ngid, // ID de la colonia
    nombre,
    distrito,
    dependencia,
    expediente,
    antecedentes,
    urlplano,
    vobomesa,
    observaciones,
    correo,
    ultima_edicion,
  } = req.body;

  if (!ngid) {
    return res.status(400).json({ success: false, message: 'Faltan datos necesarios: ngid' });
  }

  try {
    const updated = await prisma.ot_colonias_edit.update({
      where: { gid: parseInt(ngid) },
      data: {
        nombre: nombre || null,
        distrito: distrito ? parseFloat(distrito) : null,
        dependencia: dependencia || null,
        expediente: expediente || null,
        antecedentes: antecedentes || null,
        url_plano: urlplano || null,
        vobo_mesa: vobomesa ? parseInt(vobomesa) : null,
        observaciones_mesa: observaciones || null,
        usuario: correo || null,
        fecha_edicion_mesa: ultima_edicion ? new Date(ultima_edicion) : null,
      },
    });

    res.json({ success: true, message: 'Registro actualizado correctamente.', data: updated });
  } catch (error) {
    console.error('Error actualizando:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el registro.' });
  }
};
