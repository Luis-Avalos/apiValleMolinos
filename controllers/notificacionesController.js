const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const crearNotificacion = async (req, res) => {
  try {
    const { titulo, mensaje } = req.body;

    if (!titulo || !mensaje) {
      return res.status(400).json({
        error: 'titulo y mensaje son obligatorios'
      });
    }

    const query = `
      INSERT INTO vallemolinostest.notificaciones
      (titulo, mensaje)
      VALUES ($1, $2)
      RETURNING *;
    `;

    const result = await pool.query(query, [titulo, mensaje]);
    const notificacion = result.rows[0];

   
    const io = req.app.get('io');
    if (io) {
      io.emit('nueva_notificacion', notificacion);
    }

    res.json(notificacion);
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const getNotificaciones = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM vallemolinostest.notificaciones
      ORDER BY fecha DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar notificaciones:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const crearNotificacionweb = async (req, res) => {
  try {
    const { titulo, mensaje } = req.body;

    if (!titulo || !mensaje) {
      return res.status(400).json({
        error: 'titulo y mensaje son obligatorios'
      });
    }

    const query = `
    INSERT INTO vallemolinostest.notificacionesweb
    (titulo, mensaje, activo)
    VALUES ($1, $2, false)
    RETURNING *;
    `;

    const result = await pool.query(query, [titulo, mensaje]);
    const notificacion = result.rows[0];

   
    res.json(notificacion);
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const activarNotificacionWeb = async (req, res) => {
  try {
    const { id } = req.params;

    // Desactivar todas
    await pool.query(`
      UPDATE vallemolinostest.notificacionesweb
      SET activo = false;
    `);

    // Activar la seleccionada
    const result = await pool.query(`
      UPDATE vallemolinostest.notificacionesweb
      SET activo = true
      WHERE id = $1
      RETURNING *;
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    const notificacionActiva = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('notificacion_activa', notificacionActiva);
    }

    res.json(notificacionActiva);

  } catch (error) {
    console.error("Error al activar notificación:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const desactivarNotificacionWeb = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`
      UPDATE vallemolinostest.notificacionesweb
      SET activo = false
      WHERE id = $1;
    `, [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('notificacion_activa', null);
    }

    res.json({ ok: true });

  } catch (error) {
    console.error("Error al desactivar notificación:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
};


const getNotificacionesweb = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM vallemolinostest.notificacionesweb
      ORDER BY fecha DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar notificaciones:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = {
  crearNotificacion,
  getNotificaciones,
  getNotificacionesweb,
  crearNotificacionweb,
  activarNotificacionWeb,
  desactivarNotificacionWeb
};