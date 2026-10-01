const express = require('express');
const router = express.Router();
const Registrovueltas = require('../controllers/registroVueltasController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET promedio — debe ir antes de rutas paramétricas
// ?tipo=enteros|medias|todos&viaje_id=|&ruta_id=&fecha=|&fecha_desde=&fecha_hasta=|&mes=YYYY-MM&turno=&excluir_fines_semana=
router.get('/promedio', authMiddleware, Registrovueltas.getPromedio);

// GET flexible — debe ir antes de /:id
// ?viaje_id=&vuelta=&ascensos=&fecha=&fecha_desde=&fecha_hasta=&campos=&order=
router.get('/', authMiddleware, Registrovueltas.getRegistrosVueltas);

// POST insertar
router.post('/', authMiddleware, Registrovueltas.createRegistroVuelta);

module.exports = router;
