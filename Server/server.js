const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { seedDefaultAdmin } = require('./controllers/authcontroller');
const { verifyEmailConfig } = require('./utils/emailService');
const multer = require('multer');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection
connectDB().then(() => {
  seedDefaultAdmin();
  verifyEmailConfig();
});

// Middleware
const allowedOrigins = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in local dev
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths
const clientPublicPath = path.join(__dirname, '..', 'Client', 'public');
const clientViewsPath = path.join(__dirname, '..', 'Client', 'views');
const uploadsPath = path.join(__dirname, 'uploads');

// Static files (accessible via root and prefixed paths for universal compatibility)
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(clientPublicPath));
app.use('/public', express.static(clientPublicPath));
app.use('/Client/public', express.static(clientPublicPath));
app.use(express.static(clientViewsPath));
app.use('/views', express.static(clientViewsPath));
app.use('/Client/views', express.static(clientViewsPath));

// Clean page routes
app.get('/', (_req, res) => res.sendFile(path.join(clientViewsPath, 'index.html')));
app.get('/form', (_req, res) => res.sendFile(path.join(clientViewsPath, 'form.html')));
app.get('/login', (_req, res) => res.sendFile(path.join(clientViewsPath, 'login.html')));
app.get('/students', (_req, res) => res.sendFile(path.join(clientViewsPath, 'student.html')));
app.get('/details', (_req, res) => res.sendFile(path.join(clientViewsPath, 'details.html')));

// API Routes
app.use('/api', routes);

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Fallback for page routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientViewsPath, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;