const errorHandler = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(err.errors).map(val => val.message)
      });
    }
  
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }
  
    // Custom errors from controllers
    if (err.isOperational) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message
      });
    }
  
    // Generic server error (don't leak details in production)
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
    });
  };
  
  module.exports = errorHandler;