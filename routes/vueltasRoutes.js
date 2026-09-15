const express = require('express');
const router = express.Router();
const vueltasController = require('../controllers/vueltasController');
const authMiddleware = require('../middlewares/authMiddleware');

// ✅ Rutas para vueltas de viajes (más específicas)
router.get('/viaje/:id/vueltas', authMiddleware, vueltasController.getVueltas);
router.put('/viaje/:id/vueltas', authMiddleware, vueltasController.actualizarVueltas);

// ✅ CRUD de vueltas
router.get('/', authMiddleware, vueltasController.getAllVueltas);
router.get('/:id', authMiddleware, vueltasController.getVueltaById);
router.post('/', authMiddleware, vueltasController.createVuelta);
router.put('/:id', authMiddleware, vueltasController.updateVuelta);
router.delete('/:id', authMiddleware, vueltasController.deleteVuelta);

module.exports = router;