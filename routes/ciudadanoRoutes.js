const express = require('express');
const router = express.Router();
const ciudadanoController = require('../controllers/ciudadanoController'); 
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/',  ciudadanoController.getAllCiudadanos);
router.get('/:id', ciudadanoController.getCiudadanoById);
router.post('/',  ciudadanoController.createCiudadano);
router.put('/:id', ciudadanoController.updateCiudadano);
router.delete('/:id', ciudadanoController.deleteCiudadano);
router.post('/:id/foto', ciudadanoController.uploadFotoPerfilCiudadano);
module.exports = router;
