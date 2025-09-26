const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboardData');

router.get('/subidasbajadas', dashboard.getAllSubidasbajadas);
router.get('/unidadesstats', dashboard.getUnidadesStats);
router.get('/conductoresstats', dashboard.getConductoresStats);
router.get('/viajesstats', dashboard.getViajesStats);

module.exports = router;
