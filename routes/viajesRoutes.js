const express = require('express');
const router = express.Router();
const viajesController = require('../controllers/viajesController');

router.get('/', viajesController.getViajes);
router.get('/bitacora', viajesController.getSubidas);
router.get("/hastafecha", viajesController.getViajesHastaFecha);

router.put('/:id/iniciar', viajesController.iniciarViaje);
router.put('/:id/finalizar', viajesController.finalizarViaje);

router.get('/conductor/:id', viajesController.getViajesConductor);

router.post('/', viajesController.createViaje);
router.put('/:id', viajesController.updateViaje);
router.get('/:id', viajesController.getViajeById);



module.exports = router;
