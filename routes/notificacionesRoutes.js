const express = require('express');
const { crearNotificacion,  getNotificaciones, crearNotificacionweb, getNotificacionesweb } = require('../controllers/notificacionesController');

const router = express.Router();

router.post('/', crearNotificacion);
router.get('/', getNotificaciones);

router.post('/web', crearNotificacionweb);
router.get('/web', getNotificacionesweb);
module.exports = router;
