const express = require('express');
const router = express.Router();
const { createPatient, getPatients, getPatientById, updatePatient, addNote, deletePatient } = require('../controllers/patientController');
const verifyToken = require('../middlewares/auth');
router.use(verifyToken);
router.route('/').post(createPatient).get(getPatients);
router.route('/:id').get(getPatientById).put(updatePatient).delete(deletePatient);
router.post('/:id/notes', addNote);
module.exports = router;