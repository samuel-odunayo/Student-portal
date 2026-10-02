const Student = require('../models/Student');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { sendRegistrationEmail, sendAdmissionStatusEmail } = require('../utils/emailService');

// Helper to validate Mongo ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get all students (Admin protected) with pagination (default 20/page), search, and status filter
exports.getAllStudents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by admission status
    if (req.query.status && req.query.status !== 'All') {
      filter.admissionStatus = req.query.status;
    }

    // Search by name or email
    if (req.query.search && req.query.search.trim()) {
      const term = req.query.search.trim();
      const searchRegex = new RegExp(term, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { middleName: searchRegex },
        { email: searchRegex }
      ];
    }

    const totalStudents = await Student.countDocuments(filter);
    const totalPages = Math.ceil(totalStudents / limit) || 1;

    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      students,
      totalStudents,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
};

// Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }

    // Role check: If logged in as student, they can only view their OWN profile
    if (req.user && req.user.role === 'student' && String(req.user.studentId) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own admission profile.' });
    }

    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.status(200).json(student);
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student details', error: error.message });
  }
};

// Create new student with automated password generation and email notification
exports.createStudent = async (req, res) => {
  try {
    const cleanEmail = (req.body.email || '').trim().toLowerCase();
    const existingStudent = await Student.findOne({ email: cleanEmail });
    if (existingStudent) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error removing file after duplicate email:', err);
        });
      }
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate Default Password: Firstname + Birth Year (e.g., Emeka2004)
    const birthYear = new Date(req.body.dob).getFullYear() || 2005;
    const cleanFirstName = (req.body.firstName || 'Student').trim();
    const defaultPassword = `${cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1).toLowerCase()}${birthYear}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Assign uploaded image or default avatar for new records without image
    const imagePath = req.file ? `uploads/${req.file.filename}` : 'uploads/avatar.png';
    const studentData = {
      firstName: req.body.firstName,
      middleName: req.body.middleName || '',
      lastName: req.body.lastName,
      email: cleanEmail,
      password: hashedPassword,
      mustChangePassword: true,
      role: 'student',
      dob: req.body.dob,
      gender: req.body.gender,
      phone: req.body.phone,
      address: req.body.address,
      state: req.body.state,
      localGovernment: req.body.localGovernment,
      nextOfKin: req.body.nextOfKin,
      jambScore: Number(req.body.jambScore),
      imagePath,
      admissionStatus: config.admissionStatus.default
    };

    const newStudent = await Student.create(studentData);

    // Send Welcome & Credential Email to the student
    const host = req.get('host');
    const protocol = req.protocol;
    const loginUrl = `${protocol}://${host}/login.html`;

    sendRegistrationEmail({
      to: newStudent.email,
      studentName: `${newStudent.firstName} ${newStudent.lastName}`,
      email: newStudent.email,
      temporaryPassword: defaultPassword,
      loginUrl
    }).catch(err => console.error('Failed to dispatch registration email:', err.message));

    res.status(201).json({ 
      success: true,
      _id: newStudent._id,
      message: 'Student registered successfully! Login credentials have been sent via email.', 
      student: newStudent,
      generatedPassword: defaultPassword // Provided for immediate display in dev if needed
    });

  } catch (error) {
    console.error('Error creating student:', error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error removing file:', err);
      });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to register student' });
  }
};

// Update student admission status (Admin only)
exports.updateStudentStatus = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }

    const { admissionStatus } = req.body;
    
    // Validate status
    if (!config.admissionStatus.values.includes(admissionStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid admission status' });
    }
    
    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      { admissionStatus }, 
      { new: true, runValidators: true }
    );
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Automatically send Admission Status Email to the student
    const host = req.get('host');
    const protocol = req.protocol;
    const loginUrl = `${protocol}://${host}/login.html`;

    sendAdmissionStatusEmail({
      to: student.email,
      studentName: `${student.firstName} ${student.lastName}`,
      status: admissionStatus,
      loginUrl
    }).catch(err => console.error('Failed to dispatch admission status email:', err.message));
    
    res.status(200).json({
      success: true,
      message: `Student status updated to ${admissionStatus} successfully. Email notification sent.`,
      student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, message: 'Failed to update student status', error: error.message });
  }
};

// Delete student (Admin only)
exports.deleteStudent = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }

    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Delete image file asynchronously from uploads folder if it exists
    if (student.imagePath) {
      const imagePath = path.join(__dirname, '..', student.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Error removing student image:', err);
        });
      }
    }
    
    // Delete student from database
    await Student.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Failed to delete student', error: error.message });
  }
};

// Get States & LGAs
exports.getStates = async (req, res) => {
  try {
    const statesData = require('../data/states-localgovts.json');
    res.status(200).json(statesData);
  } catch (error) {
    console.error('Error getting states:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch states data',
      error: error.message
    });
  }
};