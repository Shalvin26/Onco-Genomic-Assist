
const express = require('express');
const router = express.Router();
const { uploadReport, getReportsForPatient, getReportById, deleteReport } = require('../controllers/reportController');
const verifyToken = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(verifyToken);
router.route('/:patientId').post(upload.single('reportFile'), uploadReport).get(getReportsForPatient);
router.route('/single/:id').get(getReportById).delete(deleteReport);

module.exports = router;