const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const verifyToken = require('../middlewares/auth');
const authLimiter = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

module.exports = router;