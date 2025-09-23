const express = require('express');
const { createIncidencia, getIncidencias, getIncidenciaById } = require('../controllers/incidenciasController');

const router = express.Router();

router.post('/', createIncidencia);     // Crear incidencia
router.get('/', getIncidencias);        // Listar incidencias
router.get('/:id', getIncidenciaById);  // Buscar incidencia por ID

module.exports = router;
