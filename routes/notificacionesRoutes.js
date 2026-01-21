const express = require('express');
const { crearNotificacion,  getNotificaciones, crearNotificacionweb, getNotificacionesweb, activarNotificacionWeb,desactivarNotificacionWeb } = require('../controllers/notificacionesController');

const router = express.Router();

router.post('/', crearNotificacion);
router.get('/', getNotificaciones);

router.post('/web', crearNotificacionweb);
router.put('/web/:id/activar', activarNotificacionWeb)
router.put('/web/:id/desactivar', desactivarNotificacionWeb)
router.get('/web', getNotificacionesweb);

module.exports = router;
