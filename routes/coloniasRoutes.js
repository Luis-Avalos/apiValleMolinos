const express = require('express');
const router = express.Router();
const { updateColonia } = require('../controllers/coloniasController');

router.post('/update-colonia', updateColonia);

module.exports = router;
