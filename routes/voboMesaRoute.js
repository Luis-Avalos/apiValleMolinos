const express = require('express');
const router = express.Router();

const {obtenerVoboMesa} = require('../controllers/voboMesaController');
router.get('/voboMesa', obtenerVoboMesa);

module.exports = router;