const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/bitacoraEstadisticasController');
const authMiddleware = require('../middlewares/authMiddleware');



router.get('/bitacora_estadisticas', authMiddleware,viajesController.getSubidasEstadisticas); 


module.exports = router;