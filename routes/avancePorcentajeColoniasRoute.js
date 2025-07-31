const express = require('express');
const router = express.Router();

const {avancePorcentajeColonias} = require('../controllers/avancePorcentajeColoniasController');
router.get('/porcentajecolonias', avancePorcentajeColonias);

module.exports = router;