const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/bitacoraEstadisticasController');
const authMiddleware = require('../middlewares/authMiddleware');



router.get('/bitacora_estadisticas', authMiddleware,viajesController.getSubidasEstadisticas); 
router.get('/bitacora_por_ruta', authMiddleware,viajesController.getBitacoraAgrupadaPorRuta); 

module.exports = router;
