const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { protect } = require('../../middleware/auth');

router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/change-password', protect, authController.changePassword);
router.get('/profile', protect, authController.getProfile);

module.exports = router;