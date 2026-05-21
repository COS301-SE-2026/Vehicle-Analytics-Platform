const express = require('express');
const cors = require('cors'); //Put this back!
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();

// Base security limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: 'Too many requests from this IP, please try again later.',
});

// Dynamic CORS safety net to support localhost development seamlessly
app.use(cors({
  origin: true, // Dynamically echoes back the request's origin (localhost:5173, 5176, etc.)
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet());
app.use(express.json());
app.use(limiter);

// Public and Protected Modular Routing Pipelines
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all structural 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized Error-Intercepting Middleware
app.use((err, req, res, next) => {
  console.error('Lambda Exception Execution Trace:', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

module.exports = app;