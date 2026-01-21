const express = require('express');
const { crearNotificacion,  getNotificaciones, crearNotificacionweb, getNotificacionesweb, activarNotificacionWeb, } = require('../controllers/notificacionesController');

const router = express.Router();

router.post('/', crearNotificacion);
router.get('/', getNotificaciones);

router.post('/web', crearNotificacionweb);
router.post('/web/:id/activar', activarNotificacionWeb)
router.get('/web', getNotificacionesweb);

module.exports = router;
