const express = require('express');
const router = express.Router();
const rutasController = require('../controllers/rutasController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rutas CRUD
router.get('/', authMiddleware, rutasController.getAllRutas);
router.get('/:id', authMiddleware, rutasController.getRutaById);
router.post('/', authMiddleware, rutasController.createRuta);
router.put('/:id', authMiddleware, rutasController.updateRuta);
router.delete('/:id', authMiddleware, rutasController.deleteRuta);

module.exports = router;
