const express = require('express');
const router = express.Router();
const promedioController = require('../controllers/promedioControllers');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/:id', authMiddleware, promedioController.getDatosPromedioByViajeId);

module.exports = router;
