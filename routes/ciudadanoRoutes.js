const express = require('express');
const router = express.Router();
const ciudadanoController = require('../controllers/ciudadanoController'); 
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, ciudadanoController.getAllCiudadanos);
router.get('/:id', authMiddleware,ciudadanoController.getCiudadanoById);
router.post('/', ciudadanoController.createCiudadano);
router.put('/:id', authMiddleware,ciudadanoController.updateCiudadano);
router.delete('/:id', authMiddleware,ciudadanoController.deleteCiudadano);
router.post('/:id/foto', authMiddleware,ciudadanoController.uploadFotoPerfilCiudadano);
module.exports = router;
