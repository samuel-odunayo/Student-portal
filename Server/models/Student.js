const mongoose = require('mongoose');
const validator = require('validator');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: String,
  email: { 
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  password: { 
    type: String,
    select: false 
  },
  mustChangePassword: {
    type: Boolean,
    default: true
  },
  loginCount: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    default: 'student'
  },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  state: { type: String, required: true },
  localGovernment: { type: String, required: true },
  nextOfKin: { type: String, required: true },
  jambScore: { 
    type: Number, 
    required: true,
    min: [0, 'JAMB score cannot be negative'],
    max: [400, 'Maximum JAMB score is 400']
  },
  admissionStatus: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  imagePath: String,
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);