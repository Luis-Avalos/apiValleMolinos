const express = require('express');
const router = express.Router();
const { updateColonia, deleteColoniaPost } = require('../controllers/coloniasController');

router.post('/update-colonia', updateColonia);
router.post('/delete-colonia', deleteColoniaPost);

module.exports = router;
