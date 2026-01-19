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
  crearNotificacionweb
};