
const express = require('express');
const { crearNotificacion,  getNotificaciones } = require('../controllers/notificacionesController');

const router = express.Router();

router.post('/', crearNotificacion);
router.get('/', getNotificaciones);

module.exports = router;
