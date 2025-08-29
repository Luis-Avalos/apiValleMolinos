const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/viajesController');

// --- VIAJES ---
// Obtener todos los viajes
router.get('/', viajesController.getViajes);

// Obtener viaje por ID
router.get('/:id', viajesController.getViajeById);

// Crear un viaje
router.post('/', viajesController.createViaje);

// Actualizar viaje (asignar conductor/unidad o cambiar estado)
router.put('/:id', viajesController.updateViaje);

// Iniciar viaje
router.put('/:id/iniciar', viajesController.iniciarViaje);

// Finalizar viaje
router.put('/:id/finalizar', viajesController.finalizarViaje);

// Obtener viajes de un conductor
router.get('/conductor/:id', viajesController.getViajesConductor);

module.exports = router;
