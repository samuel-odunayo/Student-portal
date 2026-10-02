const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/studentController');
const upload = require('../../config/multer');
const { protect, restrictTo } = require('../../middleware/auth');

// Public routes
router.get('/states', studentController.getStates);
router.post('/students', upload.single('image'), studentController.createStudent);

// Student profile route (Admin can view all, Student can view their own)
router.get('/students/:id', protect, studentController.getStudentById);

// Admin-only routes
router.get('/students', protect, restrictTo('admin'), studentController.getAllStudents);
router.patch('/students/:id', protect, restrictTo('admin'), studentController.updateStudentStatus);
router.delete('/students/:id', protect, restrictTo('admin'), studentController.deleteStudent);

module.exports = router;