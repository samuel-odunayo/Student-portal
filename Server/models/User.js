const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    select: false 
  },
  role: { 
    type: String, 
    enum: ['admin'], 
    default: 'admin' 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
