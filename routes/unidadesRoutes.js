const express = require('express');
const router = express.Router();
const unidadesController = require('../controllers/unidadesController');
const authMiddleware = require('../middlewares/authMiddleware'); 

router.get('/', authMiddleware, unidadesController.getAllUnidades);
router.get('/:id', authMiddleware, unidadesController.getUnidadById);
router.post('/', authMiddleware, unidadesController.createUnidad);
router.put('/:id', authMiddleware, unidadesController.updateUnidad);
router.delete('/:id', authMiddleware, unidadesController.deleteUnidad);

module.exports = router;
