const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/viajesController');

// CRUD - obtener viajes
router.get('/', viajesController.getViajes);
router.get('/:id', viajesController.getViajeById);

// Crear viaje
router.post('/', viajesController.createViaje); 

// Asignar conductor/unidad a un viaje existente
router.put('/:id/asignar', viajesController.asignarViaje);

// Iniciar / finalizar viaje
router.put('/:id/iniciar', viajesController.iniciarViaje);
router.put('/:id/finalizar', viajesController.finalizarViaje);

// Vueltas
router.post('/:id/vueltas', viajesController.crearVuelta);     // crear nueva vuelta
router.put('/vueltas/:id', viajesController.actualizarVuelta); // actualizar vuelta.


//VAIJES POR CONDUTOR
router.get('/conductor/:id', viajesController.getViajesConductor);


module.exports = router;
