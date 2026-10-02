// config/config.js

module.exports = {
    // App configuration settings
    app: {
      name: 'Student Portal API',
      version: '1.0.0'
    },
    
    // Upload settings
    uploads: {
      directory: 'public/uploads/',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/jpg']
    },
    
    // Default admission status
    admissionStatus: {
      default: 'Pending',
      values: ['Pending', 'Approved', 'Rejected']
    }
  };