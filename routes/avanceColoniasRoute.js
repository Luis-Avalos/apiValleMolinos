const express = require('express');
const router = express.Router();
const { obtenerAvanceColonias } = require('../controllers/avanceColoniasController');

router.get('/avance-colonias', obtenerAvanceColonias);

module.exports = router;
