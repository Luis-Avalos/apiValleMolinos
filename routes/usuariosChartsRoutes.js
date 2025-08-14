const express = require('express');
const router = express.Router();
const { getUsuariosChart } = require('../controllers/usuariosChartsController');

router.get('/charts', getUsuariosChart);

module.exports = router;
