const express = require('express');
const router = express.Router();

const {obtenerVoboMesaDistrito} = require('../controllers/voboMesaDistritoController');
router.get('/voboMesaDistrito', obtenerVoboMesaDistrito);

module.exports = router;