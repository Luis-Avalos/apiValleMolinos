const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllerCiudadanos');

router.post('/loginCiudadanos', authController.loginCiudadanos);

module.exports = router;
