const express = require('express');
const router = express.Router();
const vueltasController = require('../controllers/vueltasController');

// CRUD de vueltas
router.get('/', vueltasController.getAllVueltas);
router.get('/:id', vueltasController.getVueltaById);
router.post('/', vueltasController.createVuelta);
router.put('/:id', vueltasController.updateVuelta);
router.delete('/:id', vueltasController.deleteVuelta);

module.exports = router;
