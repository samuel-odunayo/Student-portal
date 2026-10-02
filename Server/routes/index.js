const express = require('express');
const router = express.Router();
const studentsRouter = require('./api/students');
const authRouter = require('./api/auth'); // Placeholder for future auth
const statesData = require('../data/states-localgovts.json');

// API v1 routes
router.use('/', studentsRouter);
router.use('/auth', authRouter); // Not used yet but structured
router.get('/states', (req, res) => {
  res.status(200).json(statesData);
});

// Fallback route
router.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

module.exports = router;