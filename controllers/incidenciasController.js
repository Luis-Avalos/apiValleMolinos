const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});



// Crear incidencia
const createIncidencia = async (req, res) => {
  try {
    const { conductor_id, unidad_id, viaje_id, descripcion, tipo, latitud, longitud } = req.body;

    if (!conductor_id || !unidad_id || !descripcion) {
      return res.status(400).json({ error: 'Campos obligatorios: conductor_id, unidad_id, descripcion' });
    }

    const query = `
      INSERT INTO vallemolinostest.incidencias 
      (conductor_id, unidad_id, viaje_id, descripcion, tipo, latitud, longitud, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
    `;

    const values = [conductor_id, unidad_id, viaje_id, descripcion, tipo, latitud, longitud];
    const result = await pool.query(query, values);
    const incidencia = result.rows[0];

    // Emitir evento en tiempo real (Socket.IO)
    req.app.get('io').emit('nueva_incidencia', incidencia);

    res.json(incidencia);
  } catch (error) {
    console.error(' Error al crear incidencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

//  Obtener todas las incidencias
const getIncidencias = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id,
        i.conductor_id,
        i.unidad_id,
        i.viaje_id,
        i.descripcion,
        i.tipo,
        i.latitud,
        i.longitud,
        i.creado_en,
        c.nombre AS nombre_conductor,
        c.apellido AS apellido_conductor,
        c.email AS email_conductor,
        c.telefono AS telefono_conductor,
        c.curp AS curp_conductor,
        c.foto_perfil_url AS foto_conductor,
        u.numero_economico AS numero_unidad,
        u.placas AS placas_unidad,
        u.foto_url AS foto_unidad,
        v.hora_inicio,
        v.hora_fin,
        v.estado AS estado_viaje

      FROM vallemolinostest.incidencias i
      LEFT JOIN vallemolinostest.conductores c ON i.conductor_id = c.id
      LEFT JOIN vallemolinostest.unidades u ON i.unidad_id = u.id
      LEFT JOIN vallemolinostest.viajes v ON i.viaje_id = v.id
      ORDER BY i.creado_en DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(' Error al obtener incidencias:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
//  Obtener una incidencia por ID
const getIncidenciaById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.id,
        i.conductor_id,
        i.unidad_id,
        i.viaje_id,
        i.descripcion,
        i.tipo,
        i.latitud,
        i.longitud,
        i.creado_en,
        c.nombre AS nombre_conductor,
        c.apellido AS apellido_conductor,
        c.email AS email_conductor,
        c.telefono AS telefono_conductor,
        c.curp AS curp_conductor,
        c.foto_perfil_url AS foto_conductor,
        u.numero_economico AS numero_unidad,
        u.placas AS placas_unidad,
        u.foto_url AS foto_unidad,
        v.hora_inicio,
        v.hora_fin,
        v.estado AS estado_viaje

      FROM vallemolinostest.incidencias i
      LEFT JOIN vallemolinostest.conductores c ON i.conductor_id = c.id
      LEFT JOIN vallemolinostest.unidades u ON i.unidad_id = u.id
      LEFT JOIN vallemolinostest.viajes v ON i.viaje_id = v.id
      WHERE i.id = $1;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(' Error al obtener incidencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};


module.exports = {
  createIncidencia,
  getIncidencias,
  getIncidenciaById,
};


module.exports = {
  createIncidencia,
  getIncidencias,
  getIncidenciaById,
};
