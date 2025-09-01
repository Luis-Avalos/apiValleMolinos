const express = require('express');
const router = express.Router();
const conductorController = require('../controllers/userController'); 
const authMiddleware = require('../middlewares/authMiddleware');


router.get('/', authMiddleware, conductorController.getAllConductores);
router.get('/:id', authMiddleware, conductorController.getConductorById);
router.post('/', authMiddleware, conductorController.createConductor);
router.put('/:id', authMiddleware, conductorController.updateConductor);
router.delete('/:id', authMiddleware, conductorController.deleteConductor);
router.post('/:id/foto', authMiddleware, conductorController.uploadFotoPerfilConductor);

module.exports = router;
