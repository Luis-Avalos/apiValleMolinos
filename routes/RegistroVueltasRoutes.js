const express = require('express');
const router = express.Router();
const Registrovueltas = require('../controllers/registroVueltasController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET flexible — debe ir antes de /:id
// ?viaje_id=&vuelta=&ascensos=&fecha=&fecha_desde=&fecha_hasta=&campos=&order=
router.get('/', authMiddleware, Registrovueltas.getRegistrosVueltas);

// POST insertar
router.post('/', authMiddleware, Registrovueltas.createRegistroVuelta);

module.exports = router;
