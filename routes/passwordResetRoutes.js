const express = require('express');
const router = express.Router();
const controller = require('../controllers/passwordResetController');

router.post('/auth/request-reset', controller.requestReset);
router.post('/auth/verify-code', controller.verifyCode);
router.post('/auth/reset-password', controller.resetPassword);

module.exports = router;
