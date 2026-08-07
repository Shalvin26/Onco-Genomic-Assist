const express = require('express');
const router = express.Router();

const { getProfile, updateProfile, getDashboard } = require('../controllers/doctorController');
const verifyToken = require('../middlewares/auth');

router.use(verifyToken);

router.route('/me').get(getProfile).put(updateProfile);
router.get('/dashboard', getDashboard);

module.exports = router;