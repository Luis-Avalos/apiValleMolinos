const express = require('express');
const router = express.Router();
const vueltasController = require('../controllers/vueltasController');
const authMiddleware = require('../middlewares/authMiddleware');

// CRUD de vueltas
router.get('/', authMiddleware,vueltasController.getAllVueltas);
router.get('/:id', authMiddleware,vueltasController.getVueltaById);
router.get('/:id/vueltas',  authMiddleware,vueltasController.getVueltas);
router.post('/', authMiddleware,vueltasController.createVuelta);
router.put('/:id', authMiddleware,vueltasController.updateVuelta);
router.put('/:id/vueltas',  authMiddleware,vueltasController.actualizarVueltas);
router.delete('/:id', authMiddleware,vueltasController.deleteVuelta);

module.exports = router;
  