const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { JWT_SECRET } = require('../middleware/auth');
const { sendLoginAlertEmail, sendPasswordResetEmail } = require('../utils/emailService');

// Generate JWT token helper
const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Seed default Admin on startup if none exists
const seedDefaultAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const defaultEmail = process.env.ADMIN_EMAIL || 'admin@portal.edu';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await User.create({
        name: 'Portal Administrator',
        email: defaultEmail.toLowerCase(),
        password: hashedPassword,
        role: 'admin'
      });

      console.log('----------------------------------------------------');
      console.log(`[AUTH] Default Admin Account Created:`);
      console.log(`Email:    ${defaultEmail}`);
      console.log(`Password: ${defaultPassword}`);
      console.log('----------------------------------------------------');
    }
  } catch (error) {
    console.error('[AUTH] Error seeding admin account:', error.message);
  }
};

// Unified Login for both Admin and Student
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if the user is an Administrator
    const admin = await User.findOne({ email: cleanEmail }).select('+password');
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = signToken({
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      });

      return res.status(200).json({
        success: true,
        role: 'admin',
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: 'admin'
        }
      });
    }

    // 2. Check if the user is a Registered Student
    const student = await Student.findOne({ email: cleanEmail }).select('+password');
    if (student) {
      if (!student.password) {
        return res.status(401).json({
          success: false,
          message: 'Account not set up with password. Please contact administration.'
        });
      }

      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Increment login count
      student.loginCount = (student.loginCount || 0) + 1;
      await student.save();

      // Send login security alert email (non-blocking)
      const nowStr = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
      sendLoginAlertEmail({
        to: student.email,
        studentName: `${student.firstName} ${student.lastName}`,
        loginTime: nowStr
      }).catch(err => console.error('Login alert email error:', err.message));

      const token = signToken({
        id: student._id,
        email: student.email,
        studentId: student._id,
        role: 'student'
      });

      return res.status(200).json({
        success: true,
        role: 'student',
        token,
        studentId: student._id,
        loginCount: student.loginCount,
        mustChangePassword: Boolean(student.mustChangePassword),
        student: {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          admissionStatus: student.admissionStatus,
          loginCount: student.loginCount
        }
      });
    }

    // Neither admin nor student found
    return res.status(401).json({
      success: false,
      message: 'No account found with this email address.'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
};

// Change Password (Used on first login or profile update)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id).select('+password');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student account not found.' });
      }

      // Verify current password if provided
      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, student.password);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
      }

      // Hash and update to new password
      student.password = await bcrypt.hash(newPassword, 10);
      student.mustChangePassword = false;
      await student.save();

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully! You can now access your portal.'
      });
    }

    // If Admin changing password
    if (req.user.role === 'admin') {
      const admin = await User.findById(req.user.id).select('+password');
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin account not found.' });
      }

      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
      }

      admin.password = await bcrypt.hash(newPassword, 10);
      await admin.save();

      return res.status(200).json({
        success: true,
        message: 'Administrator password changed successfully.'
      });
    }

    res.status(400).json({ success: false, message: 'Invalid role for password change.' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
};

// Get Current Logged-in User Profile
exports.getProfile = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const admin = await User.findById(req.user.id);
      return res.status(200).json({ success: true, role: 'admin', user: admin });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.status(200).json({ success: true, role: 'student', student });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

// Request Password Reset (generates a secure temporary password and dispatches email)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Administrator
    const admin = await User.findOne({ email: cleanEmail });
    // 2. Check Student
    const student = await Student.findOne({ email: cleanEmail });

    if (!admin && !student) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email address.'
      });
    }

    // Generate secure temporary password
    const tempPassword = `Reset@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    let recipientName = 'User';
    if (admin) {
      admin.password = hashedPassword;
      await admin.save();
      recipientName = admin.name || 'Administrator';
    } else if (student) {
      student.password = hashedPassword;
      student.mustChangePassword = true;
      await student.save();
      recipientName = `${student.firstName} ${student.lastName}`;
    }

    // Dispatch reset email
    const host = req.get('host') || 'localhost:8000';
    const protocol = req.protocol || 'http';
    const loginUrl = `${protocol}://${host}/login.html`;

    sendPasswordResetEmail({
      to: cleanEmail,
      recipientName,
      temporaryPassword: tempPassword,
      loginUrl
    }).catch(err => console.error('[EMAIL ERROR] Failed to send password reset email:', err.message));

    return res.status(200).json({
      success: true,
      message: 'A temporary password has been sent to your email address.',
      temporaryPassword: tempPassword // Visible in dev/console for rapid local verification
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again.'
    });
  }
};

exports.seedDefaultAdmin = seedDefaultAdmin;