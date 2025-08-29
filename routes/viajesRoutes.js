const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/viajesController');

// Obtener todos los viajes
router.get('/', viajesController.getViajes);

// Obtener viaje por ID
router.get('/:id', viajesController.getViajeById);

// Crear un viaje
router.post('/', viajesController.createViaje);

// Actualizar viaje (ej. asignar conductor/unidad o cambiar fecha/estado)
router.put('/:id', viajesController.updateViaje);

// Iniciar viaje (cambia estado a "en_curso")
router.put('/:id/iniciar', viajesController.iniciarViaje);

// Finalizar viaje (cambia estado a "finalizado")
router.put('/:id/finalizar', viajesController.finalizarViaje);

// Obtener viajes de un conductor
router.get('/conductor/:id', viajesController.getViajesConductor);

module.exports = router;
