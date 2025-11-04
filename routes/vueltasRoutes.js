const express = require('express');
const router = express.Router();
const vueltasController = require('../controllers/vueltasController');
const authMiddleware = require('../middlewares/authMiddleware');

// CRUD de vueltas
router.get('/', authMiddleware,vueltasController.getAllVueltas);
router.get('/:id', authMiddleware,vueltasController.getVueltaById);
router.post('/', authMiddleware,vueltasController.createVuelta);
router.put('/:id', authMiddleware,vueltasController.updateVuelta);
router.delete('/:id', authMiddleware,vueltasController.deleteVuelta);

module.exports = router;
