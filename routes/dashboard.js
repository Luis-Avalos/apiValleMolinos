const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboardData');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/subidasbajadas', authMiddleware,dashboard.getAllSubidasbajadas);
router.get('/unidadesstats', authMiddleware,dashboard.getUnidadesStats);
router.get('/conductoresstats', authMiddleware,dashboard.getConductoresStats);
router.get('/viajesstats', authMiddleware,dashboard.getViajesStats);
router.get('/ascdesc', authMiddleware,dashboard.getAscensosDescensosPorRuta);

module.exports = router;
