const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/bitacoraEstadisticasController');



router.get('/bitacora_estadisticas', viajesController.getSubidasEstadisticas); 


module.exports = router;